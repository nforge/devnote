var stream = require('stream');
var util = require('util');

var write = function(chunk) {
    this.buffers.push(chunk);
}

var getBuffer = function() {
    var length = 0;
    for (var i = 0; i < this.buffers.length; i++) {
        length += this.buffers[i].length
    }
    var new_buffer = new Buffer(length);

    var offset = 0;
    this.buffers.forEach(function (buf) {
        buf.copy(new_buffer, offset);
        offset += buf.length;
    });

    return new_buffer;
}

var toString = function() {
    var result = '';
    for (var i = 0; i < this.buffer.length; i++) {
        result += this.buffer[i].toString();
    }
    return result;
}

var WritableStream = function() {
    stream.Stream.call(this);
    this.writable = true;
    this.buffers = [];
    this.write = write;
    this.getBuffer = getBuffer;
    this.toString = toString;
}

util.inherits(WritableStream, stream.Stream);

exports.WritableStream = WritableStream;
