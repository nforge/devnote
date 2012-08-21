var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var assert = require('assert');
var _ = require('underscore');
var util = require('util');
var deltautil = require('./delta');
var WritableStream = require('./writablestream').WritableStream;
var EventEmitter = require('events').EventEmitter;

var CONT_MASK = 0x80; // parseInt('10000000', 2);
var TYPE_MASK = 0x70; // parseInt('01110000', 2);
var LENGTH_MASK_0 = 0x0f; // parseInt('00001111', 2);
var LENGTH_MASK_1 = 0x7f; // parseInt('01111111', 2);
var OBJ_NONE = 0;
var OBJ_COMMIT = 1;
var OBJ_TREE = 2;
var OBJ_BLOB = 3;
var OBJ_TAG = 4;
var OBJ_OFS_DELTA = 6;
var OBJ_REF_DELTA = 7;

var CRC32_LENGTH = 4;
var SHA1_LENGTH = 20;
var IDX_SIGN = [0xff, 0x74, 0x4f, 0x63];

// TODO: validate each object using CRC32 checksum
// TODO: validate packfile using the checksum stored in its index
// TODO: support version 1
// TODO: support objects > 4GiB
var Pack = function() {
  var pack, idxFilename, packFilename, offsets;

  var _loadIndex = function(callback) {
    fs.readFile(idxFilename, function(err, idx) {
      var ids, offsets, offset, i, numObjects, start, end;

      if (err) {
        return callback(err);
      }

      ids = [];
      offsets = {};
      offset = 0;

      if (_.isEqual([idx[0], idx[1], idx[2], idx[3]], IDX_SIGN)) {
        // var version = idx.readInt32BE(4); // version 1 is not supported.
        offset = 8;
      } else {
        throw new Error(
        idxFilename + " is broken or version 1 not supported yet.");
      }

      numObjects = idx.readInt32BE(offset + 255 * 4);
      offset += 256 * 4;
      for (i = 0; i < numObjects; i++) {
        start = offset + i * SHA1_LENGTH;
        end = offset + (i + 1) * SHA1_LENGTH;
        ids.push(idx.toString('hex', start, end));
      }
      offset += numObjects * SHA1_LENGTH;
      offset += numObjects * CRC32_LENGTH; // skip crc32 section
      for (i = 0; i < numObjects; i++) {
        offsets[ids[i]] = idx.readInt32BE(offset + i * 4);
      }
      return callback(err, offsets);
    });
  };

  var _getObjectRefDelta = function(pos, callback) {
    var base_id, delta, input;
    var self = this;

    // no need to compute the length of this object
    while (pack[pos++] & CONT_MASK);

    base_id = pack.toString('hex', pos, pos + 20);
    pos += 20;

    zlib.inflate(pack.slice(pos), function(err, delta) {
      if (err) {
        return callback(err);
      }

      getObject(base_id, function(err, type, base) {
        var patched = deltautil.patch(base, delta);
        callback(err, type, patched);
      });
    });
  };

  var _getObjectNotDelta = function(firstByte, pos, callback) {
    var cont, length, sw, c;

    cont = firstByte & CONT_MASK;
    length = firstByte & LENGTH_MASK_0;
    pos += 1;

    c = pack[pos];
    for (sw = 4; cont; sw += 7) {
      cont = c & CONT_MASK;
      length += ((c & LENGTH_MASK_1) << sw);
      pos += 1;
      c = pack[pos];
    }

    zlib.inflate(pack.slice(pos), function(err, result) {
      if (err) {
        return callback(err);
      }

      return callback(null, result);
    });
  };

  var _getObjectOfsDelta = function(pos, callback) {
    var original_pos, c, base_offset, delta, input;

    original_pos = pos;

    // no need to compute the length of this object
    while (pack[pos++] & CONT_MASK);

    c = pack[pos++];

    // read the base object's offset from the current position.
    base_offset = c & LENGTH_MASK_1;
    while (c & CONT_MASK) {
      c = pack[pos++];
      base_offset += 1; // I don't know why.
      base_offset = base_offset << 7;
      base_offset = base_offset | (c & LENGTH_MASK_1);
    }

    zlib.inflate(pack.slice(pos), function(err, delta) {
      // read the base object and apply the delta.
      var base_pos;

      if (err) {
        return callback(err);
      }

      base_pos = original_pos - base_offset;

      _getObjectAt(base_pos, function(err, type, base) {
        if (err) return callback(err);
        var patched = deltautil.patch(base, delta);
        return callback(null, type, patched);
      });
    });
  };

  // Read an object at the given position in the packfile.
  var _getObjectAt = function(pos, callback) {
    var c, type;

    // assert.ok(_.include(_.values(this.poss), pos)); // toooooooo slow
    c = pack[pos];

    type = (c & TYPE_MASK) >> 4;
    switch (type) {
    case OBJ_OFS_DELTA:
      return _getObjectOfsDelta(pos, function(err, type, object) {
        return callback(err, type, object);
      });
    case OBJ_REF_DELTA:
      return _getObjectRefDelta(pos, function(err, type, object) {
        return callback(err, type, object);
      });
    default:
      return _getObjectNotDelta(c, pos, function(err, object) {
        return callback(err, type, object);
      });
    }
  };

  // Get the object matched the given id.
  var getObject = function(id, callback) {
    if (offsets === undefined) {
      return callback(new Error('offsets undefined'));
    }

    if (offsets[id] === undefined) {
      return callback(new Error("Object '" + id + "' does not exist."));
    }

    if (offsets[id] === 0) {
      return callback(new Error("Large file >4GiB is not supported yet."));
    }

    return _getObjectAt(offsets[id], callback);
  };

  /**
   * Init a pack
   *
   * @param gitRoot   path to git repository
   * @param id        id of pack
   * @param callback
   */
  this.init = function(gitRoot, id, callback) {
    var packRoot;

    packRoot = path.join(gitRoot, 'objects/pack');
    idxFilename = path.join(packRoot, 'pack-' + id + '.idx');
    packFilename = path.join(packRoot, 'pack-' + id + '.pack');

    _loadIndex(function(err, offsets_) {
      if (err) {
        return callback(err);
      }

      if (!offsets_) {
        return callback(new Error('no offsets'));
      }
      offsets = offsets_;
      fs.readFile(packFilename, function(err, pack_) {
        if (err) {
          return callback(err);
        }

        if (pack_ === undefined) {
          return callback(new Error("pack '" + id + "' does not exist."));
        }

        pack = pack_;
        return callback();
      });
    });
  };

  // Get the array of all objects stored in the packfile.
  this.getObjectIds = function() {
    return Object.keys(offsets);
  };

  this.getObject = getObject;
};

var packs = {};
var inProgress = [];
var waitings = [];
var load = function(repoPath, id, callback) {
  var pack, loader;

  if (packs[id]) {
    return callback(null, packs[id]);
  }

  if (inProgress.indexOf(id) >= 0) {
    return waitings.push(callback);
  }

  inProgress.push(id);
  pack = new Pack();
  return pack.init(repoPath, id, function(err) {
    if (err) {
      return callback(err);
    }

    packs[id] = pack;
    inProgress = _.without(inProgress, id);
    for (var i in waitings) {
      waitings[i](null, pack);
    }
    callback(null, pack);
  });
};

exports.Pack = Pack;
exports.load = load;
