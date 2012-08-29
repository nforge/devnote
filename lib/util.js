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
