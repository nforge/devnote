/**
 * @author      Created by Marcus Spiegel <marcus.spiegel@gmail.com> on 2011-03-25.
 * @link        https://github.com/mashpie/i18n-node
 * @license		  http://creativecommons.org/licenses/by-sa/3.0/
 *
 * @version     0.3.5
 */

var isServer;

if (typeof module !== undefined && typeof exports === 'object') {
  isServer = true;
} else {
  isServer = false;
}

var locales = {},
  defaultLocale = 'en',
  cookiename = null,
  debug = false,
  verbose = false,
  extension = '.js',
  directory = './locales';

if (isServer) {
  // dependencies
  var vsprintf = require('sprintf').vsprintf,
    fs = require('fs'),
    url = require('url'),
    path = require('path');

  // public exports
  var i18n = exports;

  // try reading a file
  var read = function(locale) {
    var localeFile = {};
    var file = locate(locale);
    try {
      if (verbose) console.log('read ' + file + ' for locale: ' + locale);
      localeFile = fs.readFileSync(file);
      try {
        // parsing filecontents to locales[locale]
        locales[locale] = JSON.parse(localeFile);
      } catch (e) {
        console.error('unable to parse locales from file (maybe ' + file + ' is empty or invalid json?): ', e);
      }
    } catch (e) {
      // unable to read, so intialize that file
      // locales[locale] are already set in memory, so no extra read required
      // or locales[locale] are empty, which initializes an empty locale.json file
      if (verbose) console.log('initializing ' + file);
      write(locale);
    }
  }

  // try writing a file in a created directory
  var write = function(locale) {
    // creating directory if necessary
    try {
      var stats = fs.lstatSync(directory);
    } catch (e) {
      if (debug) console.log('creating locales dir in: ' + directory);
      fs.mkdirSync(directory, 0755);
    }

    // first time init has an empty file
    if (!locales[locale]) {
      locales[locale] = {};
    }

    // writing to tmp and rename on success
    try {
      var target = locate(locale),
        tmp = target + ".tmp";

      fs.writeFileSync(tmp, JSON.stringify(locales[locale], null, "\t"), "utf8");
      var Stats = fs.statSync(tmp);
      if (Stats.isFile()) {
        fs.renameSync(tmp, target);
      } else {
        console.error('unable to write locales to file (either ' + tmp + ' or ' + target + ' are not writeable?): ', e);
      }
    } catch (e) {
      console.error('unexpected error writing files (either ' + tmp + ' or ' + target + ' are not writeable?): ', e);
    }
  };

  // basic normalization of filepath
  var locate = function(locale) {
    var ext = extension || '.js';
    return path.normalize(directory + '/' + locale + ext);
  };
} else {
  var i18n = {};

  var read = function(locale) {
    $.get('/locales/' + locale + '.js', null, function(data) {
      locales[locale] = data;
      i18n.emit('ready');
    }, 'json');
  };

  var write = function(locale) {
    console.log(locale);
    // TODO: tell the server what message is not translated.
  };

  i18n.on = function(ev, fn) {
    if (!this.handlers) {
      this.handlers = {};
    }

    if (!this.handlers[ev]) {
      this.handlers[ev] = [];
    }

    this.handlers[ev].push(fn);
  };

  i18n.emit = function(ev) {
    var fn;

    if (this.handlers) {
      if (this.handlers[ev]) {
        while (fn = this.handlers[ev].shift()) {
          fn();
        }
      }
    }
  };
}

i18n.version = '0.3.5';

i18n.configure = function(opt) {
  // you may register helpers in global scope, up to you
  if (typeof opt.register === 'object') {
    opt.register.__ = i18n.__;
    opt.register.__n = i18n.__n;
    opt.register.getLocale = i18n.getLocale;
  }

  // sets a custom cookie name to parse locale settings from
  if (typeof opt.cookie === 'string') {
    cookiename = opt.cookie;
  }

  // where to store json files
  if (typeof opt.directory === 'string') {
    directory = opt.directory;
  } else {
    directory = './locales';
  }

  // where to store json files
  if (typeof opt.extension === 'string') {
    extension = opt.extension;
  }

  // enabled some debug output
  if (opt.debug) {
    debug = opt.debug;
  }

  // implicitly read all locales
  if (typeof opt.locales === 'object') {
    opt.locales.forEach(function(l) {
      read(l);
    });
  }
};

if (isServer) {
  i18n.init = function(request, response, next) {
    if (typeof request === 'object') {
      response.locals({
        'locale': guessLanguage(request)
      });
    }
    if (typeof next === 'function') {
      next();
    }
  };
} else {
  i18n.init = function() {
    var contentLanguage, languageTags, languages;

    contentLanguage = $('meta[http-equiv="Content-Language"]').attr('content');
    languages = [];

    // Parse the meta tag, whose http-equiv attribute is Content-Language, which
    // contains a comma-separated list of language tags, such as "en, ko-KR". See
    // 14.12 Content-Language in RFC 2616 for more details about Content-Language.
    if (contentLanguage) {
      languageTags = contentLanguage.split(',');
      for (var i in languageTags) {
        languages.push(languageTags[i].trim().split('-')[0]);
      }
      locale = languages[0];
    } else {
      locale = defaultLocale;
    }

    i18n.configure({
      locales: languages
    });
    i18n.on('ready', function() {
      i18n.setLocale(locale);
    });
  }
}

i18n.__ = function() {
  var locale;
  if (this && this.scope) {
    locale = this.scope.locale;
  }
  var msg = translate(locale, arguments[0]);
  if (arguments.length > 1) {
    msg = vsprintf(msg, Array.prototype.slice.call(arguments, 1));
  }
  return msg;
};

i18n.__n = function() {
  var locale;
  if (this && this.scope) {
    locale = this.scope.locale;
  }
  var singular = arguments[0];
  var plural = arguments[1];
  var count = arguments[2];
  var msg = translate(locale, singular, plural);

  if (parseInt(count, 10) > 1) {
    msg = vsprintf(msg.other, [count]);
  } else {
    msg = vsprintf(msg.one, [count]);
  }

  if (arguments.length > 3) {
    msg = vsprintf(msg, Array.prototype.slice.call(arguments, 3));
  }

  return msg;
};

// either gets called like
// setLocale('en') or like
// setLocale(req, 'en')
i18n.setLocale = function(arg1, arg2) {
  var request = {},
    target_locale = arg1;

  if (arg2 && locales[arg2]) {
    request = arg1;
    target_locale = arg2;
  }

  if (locales[target_locale]) {
    request.locale = target_locale;
    defaultLocale = target_locale;
  }
  return i18n.getLocale(request);
};

i18n.getLocale = function(request) {
  if (request === undefined) {
    return defaultLocale;
  }
  return request.locale;
};

i18n.overrideLocaleFromQuery = function(req) {
  var urlObj, locale;

  if (req == null) {
    return;
  }

  if (side === 'server') {
    urlObj = url.parse(req.url, true);
    locale = urlObj.query.locale;
  } else {
    locale = jQuery.url.param('locale');
  }

  if (locale) {
    if (debug) console.log("Overriding locale from query: " + locale);
    i18n.setLocale(req, locale.toLowerCase());
  }
};

// ===================
// = private methods =
// ===================
// guess language setting based on http headers

function guessLanguage(request) {
  if (typeof request === 'object') {
    var language_header = request.headers['accept-language'],
      languages = [],
      regions = [];

    request.languages = [defaultLocale];
    request.regions = [defaultLocale];
    request.language = defaultLocale;
    request.region = defaultLocale;

    if (language_header) {
      language_header.split(',').forEach(function(l) {
        header = l.split(';', 1)[0];
        lr = header.split('-', 2);
        if (lr[0]) {
          languages.push(lr[0].toLowerCase());
        }
        if (lr[1]) {
          regions.push(lr[1].toLowerCase());
        }
      });

      if (languages.length > 0) {
        request.languages = languages;
        request.language = languages[0];
      }

      if (regions.length > 0) {
        request.regions = regions;
        request.region = regions[0];
      }
    }

    // setting the language by cookie
    if (cookiename && request.cookies[cookiename]) {
      request.language = request.cookies[cookiename];
    }

    return i18n.setLocale(request, request.language);
  }
}

// read locale file, translate a msg and write to fs if new

function translate(locale, singular, plural) {
  if (locale === undefined) {
    if (debug) console.warn("WARN: No locale found - check the context of the call to $__. Using " + defaultLocale + " (set by request) as current locale");
    locale = defaultLocale;
  }

  if (!locales[locale]) {
    read(locale);
  }

  if (plural) {
    if (!locales[locale][singular]) {
      locales[locale][singular] = {
        'one': singular,
        'other': plural
      };
      write(locale);
    }
  }

  if (!locales[locale][singular]) {
    locales[locale][singular] = singular;
    write(locale);
  }

  return locales[locale][singular];
}

if (!isServer) {
  i18n.init();
}
