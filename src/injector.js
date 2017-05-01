'use strict';

var _ = require('lodash');

// Used to capture the arguments in function declaration
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
// Used to strip whitespace and parentheses off an argument
var FN_ARG = /^\s*(_?)(\S+)\1\s*$/;
// Strips both double-backslash and backslash-star comments
var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;

function createInjector(modulesToLoad, strictDi) {

    var cache = {};
    var loadedModules = {};
    strictDi = (strictDi === true);

    var $provide = {
        constant: function(key, value) {
            if (key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid constant name';
            }
            cache[key] = value;
        }
    };

    function invoke(fn, self, locals) {
        var args = _.map(fn.$inject, function(token) {
            if (_.isString(token)) {
                return locals && locals.hasOwnProperty(token) ?
                        locals[token] : 
                        cache[token];
            } else {
                throw 'Incorrect injection token! Expected a string, got ' + token;
            }
        });
        return fn.apply(self, args);
    }

    function annotate(fn) {
        if (_.isArray(fn)) {
            return fn.slice(0, fn.length - 1);
        } else if (fn.$inject) {
            return fn.$inject;
        } else if (!fn.length) {
            return [];
        } else {
            if (strictDi) {
                throw 'fn is not explicitly annotated and '+
                      'cannot be invoked in strict mode';
            }
            var source = fn.toString().replace(STRIP_COMMENTS, '');
            var argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), function(argName) {
                return argName.match(FN_ARG)[2];
            });
        }
    }

    _.forEach(modulesToLoad, function loadModule(moduleName) {
        if (!loadedModules.hasOwnProperty(moduleName)) {
            loadedModules[moduleName] = true;
            var module = window.angular.module(moduleName);
            _.forEach(module.requires, loadModule);
            _.forEach(module._invokeQueue, function(invokeArgs) {
                var method = invokeArgs[0];
                var args = invokeArgs[1];
                $provide[method].apply($provide, args);
            });
        }
    });

    return {
        has: function(key) {
            return cache.hasOwnProperty(key);
        },
        get: function(key) {
            return cache[key];
        },
        invoke: invoke,
        annotate: annotate
    };
};

module.exports = createInjector;
