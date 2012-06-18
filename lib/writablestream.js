var stream = require('stream');
var util = require('util');

var write = function(chunk) {
  if (chunk instanceof Buffer) {
    this.buffers.push(chunk);
  } else {
    throw new Error("chunk must be a buffer");
  }
};

var getLength = function() {
  var length = 0;
  this.buffers.forEach(function(buf) {
    length += buf.length;
  });
  return length;
};

var getBuffer = function() {
  var length, i, new_buffer, offset;

  length = 0;
  for (i = 0; i < this.buffers.length; i++) {
    length += this.buffers[i].length;
  }
  new_buffer = new Buffer(length);

  offset = 0;
  this.buffers.forEach(function(buf) {
    buf.copy(new_buffer, offset);
    offset += buf.length;
  });

  return new_buffer;
};

var toString = function() {
  var result, i;

  result = '';
  for (i = 0; i < this.buffer.length; i++) {
    result += this.buffer[i].toString();
  }
  return result;
};

var WritableStream = function() {
  stream.Stream.call(this);
  this.writable = true;
  this.buffers = [];
  this.write = write;
  this.getLength = getLength;
  this.getBuffer = getBuffer;
  this.toString = toString;
};

util.inherits(WritableStream, stream.Stream);

exports.WritableStream = WritableStream;
