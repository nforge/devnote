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
// TODO: validate pack object using the checksum stored in its index
// TODO: support version 1
// TODO: support objects > 4GiB

var _loadIndex = function(callback) {
    var self = this;

    fs.readFile(this.idxFilename, function(err, idx) {
        if (err) throw err;

        var ids = [];
        var offsets = {};
        var offset = 0;

        if (_.isEqual([idx[0], idx[1], idx[2], idx[3]], IDX_SIGN)) {
            var version = idx.readInt32BE(4);
            offset = 8;
        } else {
            throw new Error(self.idxFilename + " is broken or version 1 not supported yet.");
        }

        var numObjects = idx.readInt32BE(offset + 255 * 4);
        offset += 256 * 4;
        for (var i = 0; i < numObjects; i++) {
            ids.push(idx.toString('hex', offset + i * SHA1_LENGTH, offset + (i + 1) * SHA1_LENGTH));
        }
        offset += numObjects * SHA1_LENGTH;
        offset += numObjects * CRC32_LENGTH; // skip crc32 section
        for (var i = 0; i < numObjects; i++) {
            offsets[ids[i]] = idx.readInt32BE(offset + i * 4);
        }

        callback(err, offsets);
    });
}

var _getObjectRefDelta = function(offset, callback) {
    offset += 1;
    var base_id = this.pack.toString('hex', offset, offset + 20);
    offset += 20;

    var delta = new WritableStream();
    var self = this;
    delta.end = function() {
        var delta = this;
        self.getObject(base_id, function(err, type, base) {
            var patched = deltautil.patch(base, delta.getBuffer());
            callback(err, type, patched);
        });
    }
    var input = fs.createReadStream(this.packFilename, {start: offset});
    input.pipe(zlib.createInflate()).pipe(delta);
}

var _getObjectOfsDelta = function(object_offset, offset, callback) {
    offset += 1;
    var c = this.pack[offset];
    offset += 1;
    var i = 0;
    var base_offset = c & LENGTH_MASK_1;

    while(c & CONT_MASK) {
        c = this.pack[offset];
        offset += 1;
        base_offset += 1; // I don't know why.
        base_offset = base_offset << 7;
        base_offset = base_offset | (c & LENGTH_MASK_1);
    }

    var delta = new WritableStream();
    var self = this;

    delta.end = function() {
        var delta = this;
        self._getObjectWithOffset(object_offset - base_offset, function(err, type, base) {
            var patched = deltautil.patch(base, delta.getBuffer());
            callback(err, type, patched);
        });
    }

    var input = fs.createReadStream(this.packFilename, {start: offset});
    input.pipe(zlib.createInflate()).pipe(delta);
}

var _getObject = function(c, offset, callback) {
    var cont = c & CONT_MASK;
    var length = c & LENGTH_MASK_0;
    offset += 1;
    c = this.pack[offset];

    for(var sw = 4; cont; sw += 7) {
        cont = c & CONT_MASK;
        length += ((c & LENGTH_MASK_1) << sw);
        offset += 1;
        c = this.pack[offset];
    }

    zlib.inflate(this.pack.slice(offset), function(err, result) {
        callback(null, result);
    });
}

var _getObjectWithOffset = function(offset, callback) {
    var object_offset = offset;
    assert.ok(_.include(_.values(this.offsets), offset));
    var c = this.pack[offset];

    var type = (c & TYPE_MASK) >> 4;
    switch (type) {
        case OBJ_OFS_DELTA:
            this._getObjectOfsDelta(object_offset, offset, function(err, type, object) {
                callback(err, type, object);
            });
            break;
        case OBJ_REF_DELTA:
            this._getObjectRefDelta(offset, function(err, type, object) {
                callback(err, type, object);
            });
            break;
        default:
            this._getObject(c, offset, function(err, object) {
                callback(err, type, object);
            });
    }
}

/**
 * Init pack object
 * 
 * @param gitRoot   path to git repository
 * @param id        id of pack
 * @param callback
 */
var init = function(gitRoot, id, callback) {
    var packRoot = path.join(gitRoot, 'objects/pack');
    this.idxFilename = path.join(packRoot, 'pack-' + id + '.idx');
    this.packFilename = path.join(packRoot, 'pack-' + id + '.pack');

    var self = this;
    this._loadIndex(function(err, offsets) {
        if (err) {
            callback(err);
        } else {
            if (!offsets) throw Error('no offsets');
            self.offsets = offsets;
            fs.readFile(self.packFilename, function(err, pack) {
                if (err) return callback(err);
                self.pack = pack;
                callback();
            });
        }
    });
}

// Get the array of all objects stored in the pack object.
var getObjectIds = function() {
    return Object.keys(this.offsets);
}

// Get the object matched the given id.
var getObject = function(id, callback) {
    if (this.offsets === undefined) {
        throw new Error('offsets undefined');
    } else if (this.offsets[id] === undefined) {
        callback(new Error("Object '" + id + "' does not exist."));
    } else if (this.offsets[id] === 0) {
        callback(new Error("Large file >4GiB is not supported yet."));
    } else {
        this._getObjectWithOffset(this.offsets[id], callback);
    }
}

var Pack = function() {
    return {
        _loadIndex: _loadIndex,
        _getObjectRefDelta: _getObjectRefDelta,
        _getObjectOfsDelta: _getObjectOfsDelta,
        _getObject: _getObject,
        _getObjectWithOffset: _getObjectWithOffset,
        getObject: getObject,
        getObjectIds: getObjectIds,
        init: init,
    }
}

var loader = new EventEmitter();
loader.packs = {};
loader.inProgress = [];
loader.load = function(repoPath, id, callback) {
    if (loader.packs[id]) {
        return callback(null, loader.packs[id]);
    }

    loader.on("load", function(pack) {
        callback(null, pack);
    });

    if (loader.inProgress.indexOf(id) < 0) {
        var pack;

        loader.inProgress.push(id);
        pack = new Pack();
        pack.init(repoPath, id, function(err) {
            loader.packs[id] = pack;
            loader.inProgress = _.without(loader.inProgress, id);
            loader.emit("load", pack);
        });
    }
}

exports.Pack = Pack;
exports.load = loader.load;
