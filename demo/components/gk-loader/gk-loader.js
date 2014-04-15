(function (window, requirejs, $) {

  'use strict';

  if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function (suffix) {
      return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
  }

  Object.keys = Object.keys || (function () {
    var hasOwnProperty = Object.prototype.hasOwnProperty,
      hasDontEnumBug = !{
        toString: null
      }.propertyIsEnumerable('toString'),
      DontEnums = [
        'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
        'isPrototypeOf', 'propertyIsEnumerable', 'constructor'
      ],
      DontEnumsLength = DontEnums.length;
    return function (o) {
      if (typeof o != 'object' && typeof o != 'function' || o === null)
        throw new TypeError('Object.keys called on a non-object');
      var result = [];
      for (var name in o) {
        if (hasOwnProperty.call(o, name))
          result.push(name);
      }
      if (hasDontEnumBug) {
        for (var i = 0; i < DontEnumsLength; i++) {
          if (hasOwnProperty.call(o, DontEnums[i]))
            result.push(DontEnums[i]);
        }
      }
      return result;
    };
  })();

  var urllib = {
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
      if (!urllib.isAbsolute(url)) {
        url = urllib.normalize((base || '') + '/' + url);
      }
      return url;
    }
  };

  var script = getScript(),
    contexts = requirejs.s.contexts,
    contextName = 'gk',
    wndloc = window.location,
    locorigin = wndloc.origin,
    currloc = urllib.dirname(wndloc.pathname),
    absComponentBase = urllib.normalize(script.src + '/../../'),
    componentBase = script.getAttribute('componentBase') || (absComponentBase.indexOf(locorigin) === 0 ? absComponentBase.substr(locorigin.length) : absComponentBase),
    defaultPkg = componentBase + '/gk-jquerymobile/',
    requireConfig = {
      context: contextName,
      baseUrl: script.getAttribute('baseUrl') || './',
      map: {
        '*': {
          '@css': componentBase + '/require-css/css',
          '@text': componentBase + '/require-text/text',
          '@html': componentBase + '/gk-loader/element/loader',
          '@wdgt': componentBase + '/gk-loader/widget/loader'
        }
      },
      config: moduleConfig(componentBase),
      skipDataMain: true
    },
    scriptCfg = parseConfig(script);

  var context, defined, status;

  function moduleConfig(componentBase) {
    var cfg = {};
    cfg[componentBase + '/require-text/text'] = {
      useXhr: function () {
        return true;
      }
    };
    return cfg;
  }

  function parseConfig(script) {
    var init = script.getAttribute('init'),
      callback = function () {
        var cb = script.getAttribute('callback');
        cb && (new Function('return ' + cb)()());
      },
      cfg = {};
    cfg.init = init;
    cfg.callback = callback;
    return cfg;
  }

  function overwriteMethod(ctx) {
    var origLoad = ctx.load;
    ctx.load = function (id, url) {
      return origLoad.apply(ctx, [id, url.endsWith('.js') ? url : url + '.js']);
    };
  }

  function configure(cfg) {
    var req = requirejs.config(cfg);
    context = contexts[contextName];
    overwriteMethod(context);
    defined = context.defined;
    (context.status = {}) && (status = context.status);
    return req;
  }

  function hasUndefined(moduleIds) {
    var undef = false;
    each(moduleIds, function (m) {
      if (!(m in defined)) {
        undef = true;
        return true;
      }
    });
    return undef;
  }

  function toPaths(components) {
    var ret = [];
    each(components, function (c) {
      if (c.endsWith('.html')) {
        c = '@html!' + c.substr(0, c.length - 5);
      }
      ret.push(c);
    });
    return ret;
  }

  function toModuleIds(components) {
    var ret = [];
    each(components, function (c) {
      c = urllib.absolute(c, currloc);
      if (c.endsWith('.html')) {
        c = c.substr(0, c.length - 5);
      }
      ret.push(c);
    });
    return ret;
  }

  function tagsToComponents(tags) {
    each(tags, function (t, i) {
      tags[i] = defaultPkg + t + '.html';
    });
    return tags;
  }

  function setLoading(moduleIds) {
    each(moduleIds, function (m) {
      if (!status[m] || status[m] !== 'done') {
        status[m] = 'loading';
      }
    });
  }

  function setDone(moduleIds) {
    each(moduleIds, function (m) {
      status[m] = 'done';
    });
  }

  function initGK() {
    each(Object.keys(status), function (m) {
      if (status[m] !== 'done') {
        return;
      }
    });
    $.gk.init();
  }

  function registryGK(modules, callback) {
    var req = configure(requireConfig),
      cb = isFunction(callback) ? callback : function () {},
      paths = toPaths(modules),
      ids = toModuleIds(modules);
    if (hasUndefined(ids)) {
      setLoading(ids);
      req(paths, function () {
        setDone(ids);
        cb(initGK);
      });
    } else {
      cb(initGK);
    }
  }

  window.registryGK = registryGK;
  var comAttr = script.getAttribute('components'),
    gkTagsAttr = script.getAttribute('gk-tags'),
    components = [];
  if (comAttr) {
    components = comAttr.split(/[\s,]+/);
  } else if (gkTagsAttr) {
    components = tagsToComponents(gkTagsAttr.split(/[\s,]+/));
  }
  registryGK(components, function (init) {
    if (scriptCfg.init === null || (scriptCfg.init && scriptCfg.init !== 'false')) {
      init();
    }
    scriptCfg.callback();
  });

  function each(ary, iterator) {
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
  }

  function isFunction(obj) {
    return typeof obj === 'function';
  }

  function getScript() {
    var scs = document.getElementsByTagName('script');
    return scs[scs.length - 1];
  }

}(window, requirejs, jQuery));
