(function () {

  'use strict';

  var fs = require('fs'),
    exports = {};

  if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function (suffix) {
      return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
  }

  exports.loadFile = function (path) {
    var file = fs.readFileSync(path, 'utf8');
    if (file.indexOf('\uFEFF') === 0) {
      return file.substring(1);
    }
    return file;
  };

  exports.trimHtml = function (s) {
    return s.replace(/<!--[\s\S]*?-->/gm, '').replace(/>\s+</gm, '><');
  };

  exports.trimNewline = function (s) {
    return s.replace(/\s*(\r\n|\n|\r)\s*/gm, '');
  };

  exports.each = function (ary, iterator) {
    var nativeForEach = Array.prototype.forEach,
      breaker = {};
    if (ary === null) {
      return ary;
    }
    if (nativeForEach && ary.forEach === nativeForEach) {
      ary.forEach(iterator);
    } else {
      for (var i = 0, l = ary.length; i < l; i += 1) {
        if (iterator.call(null, ary[i], i, ary) === breaker) {
          return;
        }
      }
    }
  };

  exports.absoluteId = function (moduleId, url, ext) {
    url = exports.urllib.absolute(url, moduleId + '/../');
    return url.substr(0, url.length - ext.length - 1);
  };

  exports.urllib = {
    dirname: function (url, level) {
      return url.split('?')[0].split('/').slice(0, level || -1).join('/');
    },
    normalize: function (path) {
      var parts = path.split('://'),
        host = '',
        result = [],
        p;
      if (parts.length > 1) {
        host = parts[0] + '://' + parts[1].split('/')[0];
        path = path.substr(host.length);
      }
      path = path.replace(/\/+/g, '/');
      if (path.indexOf('/') === 0) {
        host += '/';
        path = path.substr(1);
      }
      parts = path.split('/');
      while (p = parts.shift()) {
        if (p === '..') {
          result.pop();
        } else if (p !== '.') {
          result.push(p);
        }
      }
      return host + result.join('/');
    },
    isAbsolute: function (s) {
      s = s.toLowerCase();
      return s.indexOf('http://') === 0 || s.indexOf('https://') === 0 || s.indexOf('data:') === 0 || s[0] === '/';
    },
    absolute: function (url, base) {
      if (!exports.urllib.isAbsolute(url)) {
        url = exports.urllib.normalize((base || '') + '/' + url);
      }
      return url;
    }
  };

  module.exports = exports;

}(this));
