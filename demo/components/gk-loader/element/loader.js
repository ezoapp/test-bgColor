(function (define, $) {

  'use strict';

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

  var elementExt = '.html',
    normalize = urllib.normalize,
    absolute = urllib.absolute;

  $.gk.registerElement = function (name, tpl, clazz) {
    $.gk.registry(name, {
      template: tpl,
      script: function () {
        var props = Object.keys(clazz || {});
        for (var i = 0, l = props.length; i < l; i += 1) {
          this[props[i]] = clazz[props[i]];
        }
      }
    });
  };

  function trimHtml(s) {
    return s.replace(/<!--[\s\S]*?-->/gm, '').replace(/>\s+</gm, '><');
  }

  function trimNewline(s) {
    return s.replace(/\s*(\r\n|\n|\r)\s*/gm, '');
  }

  function absoluteId(moduleId, url, ext) {
    url = absolute(url, moduleId + '/../');
    return url.substr(0, url.length - ext.length - 1);
  }

  function processScripts($scripts, config) {
    var addScript = function (s, var_) {
      config.deps.push(s);
      if (var_) {
        config.vars.push(var_);
      }
    };
    $scripts.each(function (idx, script) {
      var path = script.getAttribute('path'),
        src = script.getAttribute('src'),
        var_ = script.getAttribute('var');
      if (path) {
        addScript(path, var_);
      } else if (src) {
        src = absoluteId(config.moduleId, src, 'js');
        addScript(src, var_);
      } else {
        config.script += script.text;
      }
    });
  }

  function processLinkElements($linkEles, config) {
    $linkEles.each(function (idx, link) {
      var rel = link.getAttribute('rel'),
        href = link.getAttribute('href');
      if (href) {
        if (rel === 'import') {
          config.deps.push('@html!' + absoluteId(config.moduleId, href, 'html'));
        } else if (rel === 'stylesheet') {
          config.deps.push('@css!' + absoluteId(config.moduleId, href, 'css'));
        }
      }
    });
  }

  function processTemplate($template, config) {
    var $links;
    if (!$template.length) {
      return;
    }
    $template = $('<div>' + $template[0].innerHTML + '</div>');
    $links = $template.children('link');
    processLinkElements($links, config);
    $links.remove();
    config.template = trimHtml(trimNewline($template[0].innerHTML));
  }

  function processModuleText($module, config) {
    var generateRegCode = function (template) {
      return 'function registerElement(n,c){$.gk.registerElement(n,\'' + template + '\',c)}';
    };
    config.moduleText = generateRegCode(config.template) + ($module.length ? $module[0].text : '');
  }

  function wrapUp(config) {
    return 'var moduleId="' + config.moduleId + '";' + trimNewline(config.script) +
      'define(' + JSON.stringify(config.deps) + ', function(' + config.vars.join() + '){' +
      config.moduleText +
      '});';
  }

  function generateCode(src, config) {
    var $html = $('<div>' + src + '</div>'),
      $scripts = $html.children('script'),
      $linkEles = $html.children('link'),
      $ele = $html.children('element'),
      $template = $ele.children('template'),
      $module = $ele.children('script');
    processScripts($scripts, config);
    processLinkElements($linkEles, config);
    processTemplate($template, config);
    processModuleText($module, config);
    return wrapUp(config);
  }

  define({
    load: function (name, require, onload, config) {
      require(['@text!' + name + elementExt], function (src) {
        var moduleCfg = {
          deps: ['require', 'exports', 'module'],
          vars: ['require', 'exports', 'module'],
          moduleId: name,
          template: '',
          moduleText: '',
          script: ''
        };
        onload.fromText(generateCode(src, moduleCfg));
      });
    },

    normalize: normalize,

    pluginBuilder: './builder'
  });

}(define, jQuery));
