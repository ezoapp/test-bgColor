define(function (localRequire, exports, module) {

  'use strict';

  var $ = require.nodeRequire('cheerio'),
    uglifyjs = require.nodeRequire('uglify-js'),
    utils = require.nodeRequire(module.uri + '/../../lib/utils'),
    absoluteId = utils.absoluteId,
    trimNewline = utils.trimNewline,
    trimHtml = utils.trimHtml;

  var elementExt = '.html',
    buildMap = {};

  function processScripts($scripts, config) {
    var addScript = function (s, var_) {
      config.deps.push(s);
      if (var_) {
        config.vars.push(var_);
      }
    };
    $scripts.each(function (idx, script) {
      var path = script.attribs.path,
        src = script.attribs.src,
        var_ = script.attribs.
      var;
      if (path) {
        addScript(path, var_);
      } else if (src) {
        src = absoluteId(config.moduleId, src, 'js');
        addScript(src, var_);
      } else {
        config.script += $(script).html();
      }
    });
  }

  function processLinkElements($linkEles, config) {
    $linkEles.each(function (idx, link) {
      var rel = link.attribs.rel,
        href = link.attribs.href;
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
    $template = $('<div>' + $template.eq(0).html() + '</div>');
    $links = $template.children('link');
    processLinkElements($links, config);
    $links.remove();
    config.template = trimHtml(trimNewline($template.eq(0).html()));
  }

  function processModuleText($module, config) {
    var generateRegCode = function (template) {
      return 'function registerElement(n,c){$.gk.registerElement(n,\'' + template + '\',c)}';
    };
    config.moduleText = generateRegCode(config.template) + ($module.length ? $module.eq(0).html() : '');
  }

  function wrapUp(config) {
    return trimNewline(config.script) +
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
    return uglifyjs.minify(wrapUp(config), {
      fromString: true
    }).code;
  }

  return {
    load: function (name, req, onload, config) {
      var src = utils.loadFile(req.toUrl(name + elementExt)),
        cfg = {
          deps: ['require', 'exports', 'module'],
          vars: ['require', 'exports', 'module'],
          moduleId: name,
          template: '',
          moduleText: '',
          script: ''
        }, code;
      code = generateCode(src, cfg);
      buildMap[name] = code;
      onload.fromText(code);
    },

    write: function (pluginName, moduleName, write) {
      if (moduleName in buildMap) {
        write.asModule(pluginName + '!' + moduleName, buildMap[moduleName]);
      }
    }
  };

});
