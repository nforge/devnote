var pad = function(str, length, padChar) {
  var result = str;
  while(result.length < length) {
    result = padChar + result;
  }
  return result;
}

/**
 * Convert timezone offset to time-numoffset.
 *
 * Example:
 *      util.convertOffsetToTimezone(-540) === '+0900'
 *
 * @param {number} offset
 * @api public
 */
exports.convertOffsetToTimezone = function(offset) {
  var sign = offset > 0 ? '-' : '+';
  var hourmin = Math.abs((offset / 6) * 10).toString();
  var paddedHourmin = pad(hourmin, 4, '0');

  return sign + paddedHourmin;
}

/**
 * Parse timezone.
 *
 * Example:
 *      timezone = util.pasreTimezone('+0900');
 *      timezone.sign === '+';
 *      timezone.hour === '09';
 *      timezone.min === '00';
 *
 * @param {number} timezone
 * @api public
 */
exports.parseTimezone = function(timezone) {
  // See ISO 8601 Collected ABNF -- http://www.ietf.org/rfc/rfc3339.txt
  // time-hour         = 2DIGIT ; 00-24
  // time-minute       = 2DIGIT ; 00-59
  // time-numoffset    = ("+" / "-") time-hour [[":"] time-minute]

  var parsed, hour, min, isValid;

  parsed = timezone.match(/(\+|\-)([0-2][0-9]):?([0-6][0-9])$/);

  if (!parsed || parsed.length < 4) {
    throw new Error('invalid timezone');
  }

  hour = parseInt(parsed[2]);
  min = parseInt(parsed[3]);

  isValid =
    (hour >= 0 || hour <= 24) &&
    (min >= 0 || min <= 60);

  if (!isValid) {
    throw new Error('invalid timezone');
  }

  return {
    sign: parsed[1],
    hour: parsed[2],
    min: parsed[3]
  };
}




// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = path.charAt(0) === '/',
      trailingSlash = path.slice(-1) === '/';

  // Normalize the path
  path = normalizeArray(path.split('/').filter(function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(paths.filter(function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};
