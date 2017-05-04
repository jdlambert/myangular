'use strict';

var _ = require('lodash');

// Used to capture the arguments in function declaration
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
// Used to strip whitespace and parentheses off an argument
var FN_ARG = /^\s*(_?)(\S+)\1\s*$/;
// Strips both double-backslash and backslash-star comments
var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
var INSTANTIATING = { };

function createInjector(modulesToLoad, strictDi) {

    var providerCache = {};
    var providerInjector = providerCache.$injector =
        createInternalInjector(providerCache, function() {
            throw 'Unknown provider: ' + path.join(' <- ');
    });

    var instanceCache = {};
    var instanceInjector = instanceCache.$injector =
        createInternalInjector(instanceCache, function(name) {
            var provider = providerInjector.get(name + 'Provider');
            return instanceInjector.invoke(provider.$get, provider);
    });


    var loadedModules = {};
    var path = [];
    strictDi = (strictDi === true);

    providerCache.$provide = {
        constant: function(key, value) {
            if (key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid constant name';
            }
            providerCache[key] = value;
            instanceCache[key] = value;
        },
        provider: function(key, provider) {
            if (_.isFunction(provider)) {
                provider = providerInjector.instantiate(provider);
            }
            providerCache[key + 'Provider'] = provider;
        }
    };


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


    function createInternalInjector(cache, factoryFn) {

        function getService(name) {
            if (cache.hasOwnProperty(name)) {
                if (cache[name] === INSTANTIATING) {
                    throw new Error('Circular dependency found: ' +
                        name + ' <- ' + path.join(' <- '));
                } 
                return cache[name];
            } else {
                path.unshift(name);
                cache[name] = INSTANTIATING;
                try {
                    return (cache[name] = factoryFn(name));
                } finally {
                    path.shift();
                    if (cache[name] === INSTANTIATING) {
                        delete cache[name];
                    }
                }
            }
        }

        function invoke(fn, self, locals) {
            var args = _.map(annotate(fn), function(token) {
                if (_.isString(token)) {
                    return locals && locals.hasOwnProperty(token) ?
                            locals[token] : 
                            getService(token);
                } else {
                    throw 'Incorrect injection token! Expected a string, got ' + token;
                }
            });
            if (_.isArray(fn)) {
                fn = _.last(fn);
            }
            return fn.apply(self, args);
        }

        function instantiate(Type, locals) {
            var UnwrappedType = _.isArray(Type) ? _.last(Type) : Type;
            var instance = Object.create(UnwrappedType.prototype);
            invoke(Type, instance, locals);
            return instance;
        }

        return {
            has: function(name) {
                return cache.hasOwnProperty(name) ||
                        providerCache.hasOwnProperty(name + 'Provider');
            },
            get: getService,
            invoke: invoke,
            annotate: annotate,
            instantiate: instantiate
        };

    }

    _.forEach(modulesToLoad, function loadModule(moduleName) {
        if (!loadedModules.hasOwnProperty(moduleName)) {
            loadedModules[moduleName] = true;
            var module = window.angular.module(moduleName);
            _.forEach(module.requires, loadModule);
            _.forEach(module._invokeQueue, function(invokeArgs) {
                var method = invokeArgs[0];
                var args = invokeArgs[1];
                providerCache.$provide[method].apply(providerCache.$provide, args);
            });
        }
    });

    return instanceInjector;

};

module.exports = createInjector;