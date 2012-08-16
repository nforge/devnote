//  https://github.com/christkv/node-git/blob/master/lib/git/pack_storage.js
//
//  Copyright 2009 - 2010 Christian Amor Kvalheim.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
var patch_delta = function(base, delta) {
  var delta_header_parts = patch_delta_header_size(delta, 0);
  var src_size = delta_header_parts[0];
  var pos = delta_header_parts[1];

  if (src_size != base.length) throw new Error("invalid delta data");

  delta_header_parts = patch_delta_header_size(delta, pos);
  var dest_size = delta_header_parts[0];
  pos = delta_header_parts[1];
  var dest = new Buffer(dest_size);
  var dest_pos = 0;

  while (pos < delta.length) {
    var c = delta[pos];
    pos = pos + 1;

    // Keep reading until end of data pack
    if ((c & 0x80) != 0) {
      pos = pos - 1;
      var cp_off = 0;
      var cp_size = 0;

      if ((c & 0x01) != 0) cp_off = delta[pos += 1];
      if ((c & 0x02) != 0) cp_off = cp_off | (delta[pos += 1] << 8);
      if ((c & 0x04) != 0) cp_off = cp_off | (delta[pos += 1] << 16);
      if ((c & 0x08) != 0) cp_off = cp_off | (delta[pos += 1] << 24);

      if ((c & 0x10) != 0) cp_size = delta[pos += 1];
      if ((c & 0x20) != 0) cp_size = cp_size | (delta[pos += 1] << 8);
      if ((c & 0x40) != 0) cp_size = cp_size | (delta[pos += 1] << 16);
      if (cp_size == 0) cp_size = 0x10000;

      pos = pos + 1;
      base.copy(dest, dest_pos, cp_off, cp_off + cp_size);
      dest_pos = dest_pos + cp_size;
    } else if (c != 0) {
      delta.copy(dest, dest_pos, pos, pos + c);
      dest_pos = dest_pos + c;
      pos = pos + c;
    } else {
      throw new Error("invalid delta data");
    }
  }

  return dest;

}

var patch_delta_header_size = function(delta, pos) {
  var size = 0;
  var shift = 0;

  do {
    var c = delta[pos];
    if (c == null) throw new Error('invalid delta data');
    pos = pos + 1;
    size = size | ((c & 0x7f) << shift);
    shift = shift + 7

  } while ((c & 0x80) != 0);

  // Return the header size and position
  return [size, pos];
}

exports.patch_delta_header_size = patch_delta_header_size
exports.patch = patch_delta
