(function (define) {

  'use strict';

  var widgetExt = '.js',
    normalize = function (path) {
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
    };

  function text(data) {
    return 'define(function(){return ' + data + '});';
  }

  define({
    load: function (name, require, onload) {
      require(['@text!' + name + widgetExt], function (data) {
        onload.fromText(text(data));
      });
    },

    normalize: normalize,

    pluginBuilder: './builder'
  });

}(define));
