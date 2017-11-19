"use strict";

var transform       = require('jstransform').transform;
var reactTransform  = require('react-tools').transform;
var visitors        = require('react-tools/vendor/fbtransform/visitors');
var through         = require('through');

var isJSXExtensionRe = /^.+\.jsx$/;

function process(file, isJSXFile, transformer) {
  transformer = transformer || reactTransform;

  var data = '';
  function write(chunk) {
    return data += chunk;
  }

  function compile() {
    // jshint -W040
    if (isJSXFile) {
      try {
        var transformed = transformer(data);
        this.queue(transformed);
      } catch (error) {
        error.name = 'ReactifyError';
        error.message = file + ': ' + error.message;
        error.fileName = file;

        this.emit('error', error);
      }
    } else {
      this.queue(data);
    }
    return this.queue(null);
    // jshint +W040
  }

  return through(write, compile);
}

function getExtensionsMatcher(extensions) {
  return new RegExp('\\.(' + extensions.join('|') + ')$');
}

var VISITORS_OPTION_WARNED = false;

module.exports = function(file, options) {
  options = options || {};

  var isJSXFile;

  if (options.everything) {

    isJSXFile = true;
  } else {
    var extensions = ['js', 'jsx']
      .concat(options.extension)
      .concat(options.x)
      .filter(Boolean)
      .map(function(ext) { return ext[0] === '.' ? ext.slice(1) : ext });

    isJSXFile = getExtensionsMatcher(extensions).exec(file);
  }

  isJSXFile = false; // XXX Disable totally

  var transformVisitors = [].concat(
    options.harmony || options.es6 ?
      visitors.getAllVisitors() :
      visitors.transformVisitors.react);

  if (options.visitors) {
    if (!VISITORS_OPTION_WARNED) {
      VISITORS_OPTION_WARNED = true;
      console.warn(
        'reactify: option "visitors" is deprecated ' +
        'and will be removed in future releases'
      );
    }
    [].concat(options.visitors).forEach(function(id) {
      transformVisitors = require(id).visitorList.concat(transformVisitors);
    });
  }

  if (options['strip-types'] || options.stripTypes) {
    var typeSyntax = require('jstransform/visitors/type-syntax');
    transformVisitors = typeSyntax.visitorList.concat(transformVisitors);
  }

  var transformOptions = {
    es5: options.target === 'es5'
  };

  function transformer(source) {
    return transform(transformVisitors, source, transformOptions).code;
  }

  return process(file, isJSXFile, transformer);
};
module.exports.process = process;
module.exports.isJSXExtensionRe = isJSXExtensionRe;
