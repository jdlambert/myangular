'use strict';

var _ = require('lodash');
var $ = require('jquery');
var sinon = require('sinon');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');


function makeInjectorWithDirectives() {
    var args = arguments;
    return createInjector(['ng', function($compileProvider) {
        $compileProvider.directive.apply($compileProvider, args);
    }]);
}

describe('$compile', function() {

    beforeEach(function() {
        delete window.angular;
        publishExternalAPI();
    });

    it('allows creating directives', function() {
        var myModule = window.angular.module('myModule', []);
        myModule.directive('testing', function() { });
        var injector = createInjector(['ng', 'myModule']);
        expect(injector.has('testingDirective')).toBe(true);
    });

    it('allows creating many directives with the same name', function() {
        var myModule = window.angular.module('myModule', []);
        myModule.directive('testing', _.constant({d: 'one'}));
        myModule.directive('testing', _.constant({d: 'two'}));
        var injector = createInjector(['ng', 'myModule']);

        var result = injector.get('testingDirective');
        expect(result.length).toBe(2);
        expect(result[0].d).toEqual('one');
        expect(result[1].d).toEqual('two');
    });

    it('does not allow a directive called hasOwnProperty', function() {
        var myModule = window.angular.module('myModule', []);
        myModule.directive('hasOwnProperty', function() { });
        expect(function() {
            createInjector(['ng', 'myModule']);
        }).toThrow();
    });

    it('allows creating directives with object notation', function() {
        var myModule = window.angular.module('myModule', []);
        myModule.directive({
            a: function() { },
            b: function() { },
            c: function() { }
        });
        var injector = createInjector(['ng', 'myModule']);

        expect(injector.has('aDirective')).toBe(true);
        expect(injector.has('bDirective')).toBe(true);
        expect(injector.has('cDirective')).toBe(true);
    });

    it('compiles element directives from a single element', function() {
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', true);
                }
            };
        });
        injector.invoke(function($compile) {
            var el = $('<my-directive></my-directive>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
        });
    });

    it('compiles element directives from several elements', function() {
        var idx = 1;
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', idx++);
                }
            };
        });
        injector.invoke(function($compile) {
            var el = $('<my-directive></my-directive><my-directive></my-directive>');
            $compile(el);
            expect(el.eq(0).data('hasCompiled')).toBe(1);
            expect(el.eq(1).data('hasCompiled')).toBe(2);
        });
    });

    it('compiles element directives from child elements', function() {
        var idx = 1;
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', idx++);
                }
            };
        });
        injector.invoke(function($compile) {
            var el = $('<div><my-directive></my-directive></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBeUndefined();
            expect(el.find('> my-directive').data('hasCompiled')).toBe(1);
        });
    });

    it('compiles nested directives', function() {
        var idx = 1;
        var injector = makeInjectorWithDirectives('myDir', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', idx++);
                }
            };
        });
        injector.invoke(function($compile) {
            var el = $('<my-dir><my-dir><my-dir></my-dir></my-dir></my-dir>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(1);
            expect(el.find('> my-dir').data('hasCompiled')).toBe(2);
            expect(el.find('> my-dir > my-dir').data('hasCompiled')).toBe(3);
        });
    });

    _.forEach(['x', 'data'], function(prefix) {
        _.forEach([':', '-', '_'], function(delim) {

            it('compiles element directives with '+prefix+delim+' prefix', function() {
                var injector = makeInjectorWithDirectives('myDir', function() {
                    return {
                        restrict: 'EACM',
                        compile: function(element) {
                            element.data('hasCompiled', true);
                        }
                    };
                });
                injector.invoke(function($compile) {
                    var el = $('<'+prefix+delim+'my-dir></'+prefix+delim+'my-dir>');
                    $compile(el);
                    expect(el.data('hasCompiled')).toBe(true);
                });
            });

        });
    });

    it('compiles attribute directives', function() {
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', true);
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<div my-directive></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
        });
    });

    it('compiles attribute directives with prefixes', function() {
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', true);
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<div x:my-directive></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
        });
    });

    it('compiles several attribute directives in an element', function() {
        var injector = makeInjectorWithDirectives({
            myDirective: function() {
                return {
                restrict: 'EACM',
                    compile: function(element) {
                        element.data('hasCompiled', true);
                    }
                };
            },
            mySecondDirective: function() {
                return {
                    restrict: 'EACM',
                    compile: function(element) {
                        element.data('secondCompiled', true);
                    }
                };
            }
        });

        injector.invoke(function($compile) {
            var el = $('<div my-directive my-second-directive></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
            expect(el.data('secondCompiled')).toBe(true);
        });
    });

    it('compiles both element and attribute directives in an element', function() {
        var injector = makeInjectorWithDirectives({
            myDirective: function() {
                return {
                    restrict: 'EACM',
                    compile: function(element) {
                        element.data('hasCompiled', true);
                    }
                };
            },
            mySecondDirective: function() {
                return {
                    restrict: 'EACM',
                    compile: function(element) {
                        element.data('secondCompiled', true);
                    }
                };
            }
        });

        injector.invoke(function($compile) {
            var el = $('<my-directive my-second-directive></my-directive>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
            expect(el.data('secondCompiled')).toBe(true);
        });
    });

    it('compiles attribute directives with ng-attr prefix', function() {
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', true);
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<div ng-attr-my-directive></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
        });
    });

    it('compiles attribute directives with data:ng-attr prefix', function() {
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', true);
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<div data:ng-attr-my-directive></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
        });
    });

    it('compiles class directives', function() {
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', true);
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<div class="my-directive"></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
        });
    });

    it('compiles several class directives in an element', function() {
        var injector = makeInjectorWithDirectives({
            myDirective: function() {
                return {
                    restrict: 'EACM',
                    compile: function(element) {
                        element.data('hasCompiled', true);
                    }
                };
            },
            mySecondDirective: function() {
                return {
                    restrict: 'EACM',
                    compile: function(element) {
                        element.data('secondCompiled', true);
                    }
                };
            }
        });

        injector.invoke(function($compile) {
            var el = $('<div class="my-directive my-second-directive"></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
            expect(el.data('secondCompiled')).toBe(true);
        });
    });

    it('compiles class directives with prefixes', function() {
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    element.data('hasCompiled', true);
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<div class="x-my-directive"></div>');
            $compile(el);
            expect(el.data('hasCompiled')).toBe(true);
        });
    });

    it('compiles comment directives', function() {
        var hasCompiled;
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                restrict: 'EACM',
                compile: function(element) {
                    hasCompiled = true;
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<!-- directive: my-directive -->');
            $compile(el);
            expect(hasCompiled).toBe(true);
        });
    });

    _.forEach({
        E:    {element: true,  attribute: false, class: false, comment: false},
        A:    {element: false, attribute: true,  class: false, comment: false},
        C:    {element: false, attribute: false, class: true,  comment: false},
        M:    {element: false, attribute: false, class: false, comment: true},
        EA:   {element: true,  attribute: true,  class: false, comment: false},
        AC:   {element: false, attribute: true,  class: true,  comment: false},
        EAM:  {element: true,  attribute: true, class: false, comment: true},
        EACM: {element: true,  attribute: true,  class: true,  comment: true}
    }, function(expected, restrict) {

        describe('restricted to ' + restrict, function() {
            _.forEach({
                element:   '<my-directive></my-directive>',
                attribute: '<div my-directive></div>',
                class:     '<div class="my-directive"></div>',
                comment:   '<!-- directive: my-directive -->' 
            }, function(dom, type) {

                it((expected[type] ? 'matches' : 'does not match') + ' on ' + type, function() {
                    var hasCompiled = false;

                    var injector = makeInjectorWithDirectives('myDirective', function() {
                        return {
                            restrict: restrict,
                            compile: function(element) {
                                hasCompiled = true;
                            }
                        };
                    });

                    injector.invoke(function($compile) {
                        var el = $(dom);
                        $compile(el);
                        expect(hasCompiled).toBe(expected[type]);
                    });
                });

            });
        });

    });

    it('applies to attributes when no restrict given', function() {
        var hasCompiled = false;
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                compile: function(element) {
                    hasCompiled = true;
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<div my-directive></div>');
            $compile(el);
            expect(hasCompiled).toBe(true);
        });
    });

    it('applies to elements when no restrict given', function() {
        var hasCompiled = false;
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                compile: function(element) {
                    hasCompiled = true;
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<my-directive></my-directive>');
            $compile(el);
            expect(hasCompiled).toBe(true);
        });
    });

    it('does not apply to classes when no restrict given', function() {
        var hasCompiled = false;
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {
                compile: function(element) {
                    hasCompiled = true;
                }
            };
        });

        injector.invoke(function($compile) {
            var el = $('<div class="my-directive"></div>');
            $compile(el);
            expect(hasCompiled).toBe(false);
        });
    });

    it('applies in priority order', function() {
        var compilations = [];
        var injector = makeInjectorWithDirectives({
            lowerDirective: function() {
                return {
                    priority: 1,
                    compile: function(element) {
                        compilations.push('lower');
                    }
                };
            },
            higherDirective: function() {
                return {
                    priority: 2,
                    compile: function(element) {
                        compilations.push('higher');
                    }
                };
            }
        });
        injector.invoke(function($compile) {
            var el = $('<div lower-directive higher-directive></div>');
            $compile(el);
            expect(compilations).toEqual(['higher', 'lower']);
        });
    });

    it('applies in name order when priorities are the same', function() {
        var compilations = [];
        var injector = makeInjectorWithDirectives({
            firstDirective: function() {
                return {
                    priority: 1,
                    compile: function(element) {
                        compilations.push('first');
                    }
                };
            },
            secondDirective: function() {
                return {
                    priority: 1,
                    compile: function(element) {
                        compilations.push('second');
                    }
                };
            }
        });
        injector.invoke(function($compile) {
            var el = $('<div second-directive first-directive></div>');
            $compile(el);
            expect(compilations).toEqual(['first', 'second']);
        });
    });

    it('applies in registration order when names and priorities are the same', function() {
        var compilations = [];
        var myModule = window.angular.module('myModule', []);
        myModule.directive('aDirective', function() {
            return {
                priority: 1,
                compile: function(element) {
                    compilations.push('first');
                }
            };
        });
        myModule.directive('aDirective', function() {
            return {
                priority: 1,
                compile: function(element) {
                    compilations.push('second');
                }
            };
        });
        var injector = createInjector(['ng', 'myModule']);
        injector.invoke(function($compile) {
            var el = $('<div a-directive></div>');
            $compile(el);
            expect(compilations).toEqual(['first', 'second']);
        });
    });

    it('uses a default priority of zero when one not given', function() {
        var compilations = [];
        var myModule = window.angular.module('myModule', []);
        myModule.directive('firstDirective', function() {
            return {
                priority: 1,
                compile: function(element) {
                    compilations.push('first');
                }
            };
        });
        myModule.directive('secondDirective', function() {
            return {
                compile: function(element) {
                    compilations.push('second');
                }
            };
        });
        var injector = createInjector(['ng', 'myModule']);
        injector.invoke(function($compile) {
            var el = $('<div second-directive first-directive></div>');
            $compile(el);
            expect(compilations).toEqual(['first', 'second']);
        });
    });

    it('stops compiling at a terminal directive', function() {
        var compilations = [];
        var myModule = window.angular.module('myModule', []);
        myModule.directive('firstDirective', function() {
            return {
                priority: 1,
                terminal: true,
                compile: function(element) {
                    compilations.push('first');
                }
            };
        });
        myModule.directive('secondDirective', function() {
            return {
                priority: 0,
                compile: function(element) {
                    compilations.push('second');
                }
            };
        });
        var injector = createInjector(['ng', 'myModule']);
        injector.invoke(function($compile) {
            var el = $('<div first-directive second-directive></div>');
            $compile(el);
            expect(compilations).toEqual(['first']);
        });
    });

    it('still compiles directives with same priority after terminal', function() {
        var compilations = [];
        var myModule = window.angular.module('myModule', []);
        myModule.directive('firstDirective', function() {
            return {
                priority: 1,
                terminal: true,
                compile: function(element) {
                    compilations.push('first');
                }
            };
        });
        myModule.directive('secondDirective', function() {
            return {
                priority: 1,
                compile: function(element) {
                    compilations.push('second');
                }
            };
        });
        var injector = createInjector(['ng', 'myModule']);
        injector.invoke(function($compile) {
            var el = $('<div first-directive second-directive></div>');
            $compile(el);
            expect(compilations).toEqual(['first', 'second']);
        });
    });

    it('stops child compilation after a terminal directive', function() {
        var compilations = [];
        var myModule = window.angular.module('myModule', []);
        myModule.directive('parentDirective', function() {
            return {
                terminal: true,
                compile: function(element) {
                    compilations.push('parent');
                }
            };
        });
        myModule.directive('childDirective', function() {
            return {
                compile: function(element) {
                    compilations.push('child');
                }
            };
        });
        var injector = createInjector(['ng', 'myModule']);
        injector.invoke(function($compile) {
            var el = $('<div parent-directive><div child-directive></div></div>');
            $compile(el);
            expect(compilations).toEqual(['parent']);
        });
    });

    it('allows applying a directive to multiple elements', function() {
        var compileEl = false;
        var injector = makeInjectorWithDirectives('myDir', function() {
            return {
                multiElement: true,
                compile: function(element) {
                    compileEl = element;
                }
            };
        });
        injector.invoke(function($compile) {
            var el = $('<div my-dir-start></div><span></span><div my-dir-end></div>');
            $compile(el);
            expect(compileEl.length).toBe(3);
        });
    });

    describe('attributes', function() {

        function registerAndCompile(dirName, domString, callback) {
            var givenAttrs;
            var injector = makeInjectorWithDirectives(dirName, function() {
                return {
                    restrict: 'EACM',
                    compile: function(element, attrs) {
                        givenAttrs = attrs;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $(domString);
                $compile(el);
                callback(el, givenAttrs, $rootScope);
            });
        }

        it('passes the element attributes to the compile function', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive my-attr="1" my-other-attr="two"></my-directive>',
                function(element, attrs) {
                    expect(attrs.myAttr).toEqual('1');
                    expect(attrs.myOtherAttr).toEqual('two');
                }
            );
        });

        it('trims attribute values', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive my-attr= " val "></my-directive>',
                function(element, attrs) {
                    expect(attrs.myAttr).toEqual('val');
                }
            );
        });

        it('sets the value of boolean attributes to true', function() {
            registerAndCompile(
                'myDirective',
                '<input my-directive disabled>',
                function(element, attrs) {
                    expect(attrs.disabled).toBe(true);
                }
            );
        });

        it('does not set the value of custom boolean attributes to true', function() {
            registerAndCompile(
                'myDirective',
                '<input my-directive whatever>',
                function(element, attrs) {
                    expect(attrs.whatever).toBe('');
                }
            );
        });

        it('overrides attributes with ng-attr- versions', function() {
            registerAndCompile(
                'myDirective',
                '<input my-directive ng-attr-whatever="42" whatever="41">',
                function(element, attrs) {
                    expect(attrs.whatever).toEqual('42');
                }
            );
        });

        it('allows setting attributes', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive attr="true"></my-directive>',
                function(element, attrs) {
                    attrs.$set('attr', 'false');
                    expect(attrs.attr).toEqual('false');
                }
            );
        });

        it('sets attributes to DOM', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive attr="true"></my-directive>',
                function(element, attrs) {
                    attrs.$set('attr', 'false');
                    expect(element.attr('attr')).toEqual('false');
                }
            );
        });

        it('does not set attributes to DOM when flag is false', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive attr="true"></my-directive>',
                function(element, attrs) {
                    attrs.$set('attr', 'false', false);
                    expect(element.attr('attr')).toEqual('true');
                }
            );
        });

        it('shares attributes between directives', function() {
            var attrs1, attrs2;
            var injector = makeInjectorWithDirectives({
                myDir: function() {
                    return {
                        compile: function(element, attrs) {
                            attrs1 = attrs;
                        }
                    };
                },
                myOtherDir: function() {
                    return {
                        compile: function(element, attrs) {
                            attrs2 = attrs;
                        }
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div my-dir my-other-dir></div>');
                $compile(el);
                expect(attrs1).toBe(attrs2);
            });
        });

        it('sets prop for boolean attributes', function() {
            registerAndCompile(
                'myDirective',
                '<input my-directive>',
                function(element, attrs) {
                    attrs.$set('disabled', true);
                    expect(element.prop('disabled')).toBe(true);
                }
            );
        }); 

        it('sets prop for boolean attributes even when not flushing', function() {
            registerAndCompile(
                'myDirective',
                '<input my-directive>',
                function(element, attrs) {
                    attrs.$set('disabled', true, false);
                    expect(element.prop('disabled')).toBe(true);
                }
            );
        }); 

        it('denormalizes attribute name when explicitly given', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>',
                function(element, attrs) {
                    attrs.$set('someAttribute', 43, true, 'some-attribute');
                    expect(element.attr('some-attribute')).toEqual('43');
                }
            );
        });

        it('denormalizes attribute name by snake-casing', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>',
                function(element, attrs) {
                    attrs.$set('someAttribute', 43);
                    expect(element.attr('some-attribute')).toEqual('43');
                }
            );
        });

        it('denormalizes attribute name by using original attribute name', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive x-some-attribute="42"></my-directive>',
                function(element, attrs) {
                    attrs.$set('someAttribute', 43);
                    expect(element.attr('x-some-attribute')).toEqual('43');
                }
            );
        });

        it('does not use ng-attr- prefix in denormalized names', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive ng-attr-some-attribute="42"></my-directive>',
                function(element, attrs) {
                    attrs.$set('someAttribute', 43);
                    expect(element.attr('some-attribute')).toEqual('43');
                }
            );
        });

        it('uses new attribute name once given', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive x-some-attribute="42"></my-directive>',
                function(element, attrs) {
                    attrs.$set('someAttribute', 43, true, 'some-attribute');
                    attrs.$set('someAttribute', 44); 
                    expect(element.attr('some-attribute')).toEqual('44');
                    expect(element.attr('x-some-attribute')).toEqual('42');
                }
            );
        });

        it('calls observer immediately when attribute is $set', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>',
                function(element, attrs) {
                    var gotValue;
                    attrs.$observe('someAttribute', function(value) {
                        gotValue = value;
                    });

                    attrs.$set('someAttribute', '43');

                    expect(gotValue).toEqual('43');
                }
            );
        });

        it('calls observer on next $digest after registration', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>',
                function(element, attrs, $rootScope) {
                    var gotValue;
                    attrs.$observe('someAttribute', function(value) {
                        gotValue = value;
                    });

                    $rootScope.$digest();

                    expect(gotValue).toEqual('42');
                }
            );
        });

        it('lets observers be deregistered', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>',
                function(element, attrs) {
                    var gotValue;
                    var remove = attrs.$observe('someAttribute', function(value) {
                        gotValue = value;
                    });

                    attrs.$set('someAttribute', '43');
                    expect(gotValue).toEqual('43');

                    remove();
                    attrs.$set('someAttribute', '44');
                    expect(gotValue).toEqual('43');
                }
            );
        });

        it('adds an attribute from a class directive', function() {
            registerAndCompile(
                'myDirective',
                '<div class="my-directive"></div>',
                function(element, attrs) {
                    expect(attrs.hasOwnProperty('myDirective')).toBe(true);
                }
            );
        });

        it('does not add an attribute from a class without a directive', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive class="some-class"></my-directive>',
                function(element, attrs) {
                    expect(attrs.hasOwnProperty('someClass')).toBe(false);
                }
            );
        });     
        
        it('supports values for class directive names', function() {
            registerAndCompile(
                'myDirective',
                '<div class="my-directive: my attribute value"></div>',
                function(element, attrs) {
                    expect(attrs.myDirective).toEqual('my attribute value');
                }
            );
        });

        it('terminates class directive attribute value at semicolon', function() {
            registerAndCompile(
                'myDirective',
                '<div class="my-directive: my attribute value; some-other-class"></div>',
                function(element, attrs) {
                    expect(attrs.myDirective).toEqual('my attribute value');
                }
            );
        });

        it('adds an attribute with a value from a comment directive', function() {
            registerAndCompile(
                'myDirective',
                '<!-- directive: my-directive and the attribute value -->',
                function(element, attrs) {
                    expect(attrs.hasOwnProperty('myDirective')).toBe(true);
                    expect(attrs.myDirective).toEqual('and the attribute value');
                }
            );
        });

        it('allows adding classes', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive></my-directive>',
                function(element, attrs) {
                    attrs.$addClass('some-class');
                    expect(element.hasClass('some-class')).toBe(true);
                }
            );
        });

        it('allows removing classes', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive class="some-class"></my-directive>',
                function(element, attrs) {
                    attrs.$removeClass('some-class');
                    expect(element.hasClass('some-class')).toBe(false);
                }
            );
        });

        it('allows updating classes', function() {
            registerAndCompile(
                'myDirective',
                '<my-directive class="one three four"></my-directive>',
                function(element, attrs) {
                    attrs.$updateClass('one two three', 'one three four');
                    expect(element.hasClass('one')).toBe(true);
                    expect(element.hasClass('two')).toBe(true);
                    expect(element.hasClass('three')).toBe(true);
                    expect(element.hasClass('four')).toBe(false);
                }
            );
        });
    });

    it('returns a public link function from compile', function() {
        var injector = makeInjectorWithDirectives('myDirective', function() {
            return {compile: _.noop};
        });
        injector.invoke(function($compile) {
            var el = $('<div my-directive></div>');
            var linkFn = $compile(el);
            expect(linkFn).toBeDefined();
            expect(_.isFunction(linkFn)).toBe(true);
        });
    });
    
    describe('linking', function() {
        it('takes a scope and attaches it to elements', function() {
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {compile: _.noop};
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(el.data('$scope')).toBe($rootScope);
            });
        });

        it('calls directive link function with scope', function() {
            var givenScope, givenElement, givenAttrs;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    compile: function() {
                        return function link(scope, element, attrs) {
                                givenScope = scope;
                                givenElement = element;
                                givenAttrs = attrs;
                        };
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope).toBe($rootScope);
                expect(givenElement[0]).toBe(el[0]);
                expect(givenAttrs).toBeDefined();
                expect(givenAttrs.myDirective).toBeDefined();
            });
        });

        it('supports link function in directive definition object', function() {
            var givenScope, givenElement, givenAttrs;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    link: function(scope, element, attrs) {
                            givenScope = scope;
                            givenElement = element;
                            givenAttrs = attrs;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope).toBe($rootScope);
                expect(givenElement[0]).toBe(el[0]);
                expect(givenAttrs).toBeDefined();
                expect(givenAttrs.myDirective).toBeDefined();
            });
        });

        it('links directive on child elements first', function() {
            var givenElements = [];
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    link: function(scope, element, attrs) {
                        givenElements.push(element);
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive><div my-directive></div></div>');
                $compile(el)($rootScope);
                expect(givenElements.length).toBe(2);
                expect(givenElements[0][0]).toBe(el[0].firstChild);
                expect(givenElements[1][0]).toBe(el[0]);
            });
        });

        it('links children when parent has no directives', function() {
            var givenElements = [];
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    link: function(scope, element, attrs) {
                        givenElements.push(element);
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div><div my-directive></div></div>');
                $compile(el)($rootScope);
                expect(givenElements.length).toBe(1);
                expect(givenElements[0][0]).toBe(el[0].firstChild);
            });
        });

        it('supports link function objects', function() {
            var linked;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    link: {
                        post: function(scope, element, attrs) {
                            linked = true;
                        }
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div><div my-directive></div></div>');
                $compile(el)($rootScope);
                expect(linked).toBe(true);
            });
        });

        it('supports prelinking and postlinking', function() {
            var linkings = [];
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    link: {
                        pre: function(scope, element) {
                            linkings.push(['pre', element[0]]);
                        },
                        post: function(scope, element) {
                            linkings.push(['post', element[0]]);
                        }
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive><div my-directive></div></div>');
                $compile(el)($rootScope);
                expect(linkings.length).toBe(4);
                expect(linkings[0]).toEqual(['pre', el[0]]);
                expect(linkings[1]).toEqual(['pre', el[0].firstChild]);
                expect(linkings[2]).toEqual(['post', el[0].firstChild]);
                expect(linkings[3]).toEqual(['post', el[0]]);
            });
        });

        it('reverses priority for postlink functions', function() {
            var linkings = [];
            var injector = makeInjectorWithDirectives({
                firstDirective: function() {
                    return {
                        priority: 2,
                        link: {
                            pre: function(scope, element) {
                                linkings.push('first-pre');
                            },
                            post: function(scope, element) {
                                linkings.push('first-post');
                            }
                        }
                    };
                },
                secondDirective: function() {
                    return {
                        priority: 1,
                        link: {
                            pre: function(scope, element) {
                                linkings.push('second-pre');
                            },
                            post: function(scope, element) {
                                linkings.push('second-post');
                            }
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div first-directive second-directive></div>');
                $compile(el)($rootScope);
                expect(linkings).toEqual([
                    'first-pre',
                    'second-pre',
                    'second-post',
                    'first-post'
                ]);
            });
        });

        it('stabilizes node list during linking', function() {
            var givenElements = [];
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    link: function(scope, element, attrs) {
                        givenElements.push(element[0]);
                        element.after('<div></div>');
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div><div my-directive></div><div my-directive></div></div>');
                var el1 = el[0].childNodes[0], el2 = el[0].childNodes[1];
                $compile(el)($rootScope);
                expect(givenElements.length).toBe(2);
                expect(givenElements[0]).toBe(el1);
                expect(givenElements[1]).toBe(el2);
            });
        });

        it('invokes multi-element directive link functions with whole group', function() {
            var givenElements;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    multiElement: true,
                    link: function(scope, element, attrs) {
                        givenElements = element;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $(
                    '<div my-directive-start></div>' +
                    '<p></p>' +
                    '<div my-directive-end></div>'
                );
                $compile(el)($rootScope);
                expect(givenElements.length).toBe(3);
            });
        });

        it('makes a new scope for an element when a directive asks for it', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: true,
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope.$parent).toBe($rootScope);
            });
        });

        it('gives inherited scope to all directives on an element', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: true,
                    };
                },
                myOtherDirective: function() {
                    return {
                        link: function(scope) {
                            givenScope = scope;
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope.$parent).toBe($rootScope);
            });
        });

        it('adds scope class and data for element with new scope', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: true,
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(el.hasClass('ng-scope')).toBe(true);
                expect(el.data('$scope')).toBe(givenScope);
            });
        });

        it('creates an isolate scope when requested', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {},
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope.$parent).toBe($rootScope);
                expect(Object.getPrototypeOf(givenScope)).not.toBe($rootScope);
            });
        });

        it('does not share isolate scope with other directives', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {}
                    };
                },
                myOtherDirective: function() {
                    return {
                        link: function(scope) {
                            givenScope = scope;
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope).toBe($rootScope);
            });
        });

        it('does not use isolate scope on child elements', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {}
                    };
                },
                myOtherDirective: function() {
                    return {
                        link: function(scope) {
                            givenScope = scope;
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive><div my-other-directive></div></div>');
                $compile(el)($rootScope);
                expect(givenScope).toBe($rootScope);
            });
        });

        it('does not allow two isolate scope directives on an element', function() {
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {}
                    };
                },
                myOtherDirective: function() {
                    return {
                        scope: {}
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function() {
                    $compile(el);
                }).toThrow();
            });
        });

        it('does not allow both isolate and inherited scopes on an element', function() {
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {}
                    };
                },
                myOtherDirective: function() {
                    return {
                        scope: true
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function() {
                    $compile(el);
                }).toThrow();
            });
        });

        it('adds class and data for element with isolated scope', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {},
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(el.hasClass('ng-isolate-scope')).toBe(true);
                expect(el.hasClass('ng-scope')).toBe(false);
                expect(el.data('$isolateScope')).toBe(givenScope);
            });
        });

        it('allows observing attribute to the isolate scope', function() {
            var givenScope, givenAttrs;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        anAttr: '@'
                    },
                    link: function(scope, element, attrs) {
                        givenScope = scope;
                        givenAttrs = attrs;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);

                givenAttrs.$set('anAttr', '42');
                expect(givenScope.anAttr).toEqual('42');
            });
        });

        it('sets initial value of observed attr to the isolate scope', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        anAttr: '@'
                    },
                    link: function(scope, element, attrs) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive an-attr="42"></div>');
                $compile(el)($rootScope);
                expect(givenScope.anAttr).toEqual('42');
            });
        });

        it('allows aliasing observed attributes', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        aScopeAttr: '@anAttr'
                    },
                    link: function(scope, element, attrs) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive an-attr="42"></div>');
                $compile(el)($rootScope);
                expect(givenScope.aScopeAttr).toEqual('42');
            });

        });

        it('allows binding expression to isolate scope', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        anAttr: '<'
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive an-attr="42"></div>');
                $compile(el)($rootScope);

                expect(givenScope.anAttr).toBe(42);
            });
        });

        it('allows aliasing expression attribute on isolate scope', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '<theAttr'
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive the-attr="42"></div>');
                $compile(el)($rootScope);

                expect(givenScope.myAttr).toBe(42);
            });
        });

        it('evaluates isolate scope expression on parent scope', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '<'
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                $rootScope.parentAttr = 41;
                var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
                $compile(el)($rootScope);

                expect(givenScope.myAttr).toBe(42);
            });
        });

        it('watches isolated scope expressions', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '<'
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
                $compile(el)($rootScope);

                $rootScope.parentAttr = 41;
                $rootScope.$digest();

                expect(givenScope.myAttr).toBe(42);
            });
        });

        it('does not watch optional missing isolate scope expressions', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '<?'
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope.$$watchers.length).toBe(0);
            });
        });

        it('allows binding two-way expression to isolate scope', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        anAttr: '='
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive an-attr="42"></div>');
                $compile(el)($rootScope);

                expect(givenScope.anAttr).toBe(42);
            });
        });

        it('allows aliasing two-way expression on isolate scope', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '=theAttr'
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive the-attr="42"></div>');
                $compile(el)($rootScope);

                expect(givenScope.myAttr).toBe(42);
            });
        });

        it('watches two-way expressions', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '='
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
                $compile(el)($rootScope);

                $rootScope.parentAttr = 41;
                $rootScope.$digest();

                expect(givenScope.myAttr).toBe(42);
            });
        });

        it('does not watch optional missing two-way expressions', function() {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '=?'
                    },
                    link: function(scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);

                expect($rootScope.$$watchers.length).toBe(0);
            });
        });

        it('allows assigning on two-way expressions', function() {
            var isolateScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '='
                    },
                    link: function(scope) {
                        isolateScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-attr="parentAttr"></div>');
                $compile(el)($rootScope);

                isolateScope.myAttr = 42;
                $rootScope.$digest();

                expect($rootScope.parentAttr).toBe(42);
            });
        });

        it('gives parent change precedence when both parent and child change', function() {
            var isolateScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '='
                    },
                    link: function(scope) {
                        isolateScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-attr="parentAttr"></div>');
                $compile(el)($rootScope);

                $rootScope.parentAttr = 42;
                isolateScope.myAttr = 43;
                $rootScope.$digest();

                expect($rootScope.parentAttr).toBe(42);
            });
        });

        it('throws when two-way expression returns new arrays', function() {
            var isolateScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '='
                    },
                    link: function(scope) {
                        isolateScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                $rootScope.parentFunction = function() {
                    return [1, 2, 3];
                };
                var el = $('<div my-directive my-attr="parentFunction()"></div>');
                $compile(el)($rootScope);

                expect(function() {
                    $rootScope.$digest();
                }).toThrow();
            });
        });

        it('can watch two-way bindings as collections', function() {
            var isolateScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myAttr: '=*'
                    },
                    link: function(scope) {
                        isolateScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                $rootScope.parentFunction = function() {
                    return [1, 2, 3];
                };
                var el = $('<div my-directive my-attr="parentFunction()"></div>');
                $compile(el)($rootScope);

                $rootScope.$digest();

                expect(isolateScope.myAttr).toEqual([1, 2, 3]);
            });
        });

        it('allows binding an invokable expression on the parent scope', function() {
            var isolateScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myExpr: '&'
                    },
                    link: function(scope) {
                        isolateScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                $rootScope.parentFunction = function() {
                    return 42;
                };
                var el = $('<div my-directive my-expr="parentFunction() + 1"></div>');
                $compile(el)($rootScope);

                expect(isolateScope.myExpr()).toEqual(43);
            });
        });

        it('allows passing arguments to parent scope expression', function() {
            var isolateScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myExpr: '&'
                    },
                    link: function(scope) {
                        isolateScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var gotArg;
                $rootScope.parentFunction = function(arg) {
                    gotArg = arg;
                };
                var el = $('<div my-directive my-expr="parentFunction(argFromChild)"></div>');
                $compile(el)($rootScope);
                isolateScope.myExpr({argFromChild: 42});

                expect(gotArg).toEqual(42);
            });
        });

        it('sets missing optional parent scope expression to undefined', function() {
            var isolateScope;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    scope: {
                        myExpr: '&?'
                    },
                    link: function(scope) {
                        isolateScope = scope;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var gotArg;
                $rootScope.parentFunction = function(arg) {
                    gotArg = arg;
                };
                var el = $('<div my-directive"></div>');
                $compile(el)($rootScope);

                expect(isolateScope.myExpr).toBeUndefined();
            });
        });
    });

    describe('controllers', function() {

        it('can be attached to directives as functions', function() {
            var controllerInvoked;
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    controller: function MyController() {
                        controllerInvoked = true;
                    }
                };
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
            });
        });

        it('can be attached to directives as string references', function() {
            var controllerInvoked;
            function MyController() {
                controllerInvoked = true;
            }
            var injector = createInjector(['ng',
                    function($controllerProvider, $compileProvider) {
                        $controllerProvider.register('MyController', MyController);
                        $compileProvider.directive('myDirective', function() {
                            return {controller: 'MyController'};
                        });
                    }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
            });
        });

        it('can be applied in the same element independent of each other', function() {
            var controllerInvoked;
            var otherControllerInvoked;
            function MyController() {
                controllerInvoked = true;
            }
            function MyOtherController() {
                otherControllerInvoked = true;
            }
            var injector = createInjector(['ng',
                    function($controllerProvider, $compileProvider) {
                        $controllerProvider.register('MyController', MyController);
                        $controllerProvider.register('MyOtherController', MyOtherController);
                        $compileProvider.directive('myDirective', function() {
                            return {controller: 'MyController'};
                        });
                        $compileProvider.directive('myOtherDirective', function() {
                            return {controller: 'MyOtherController'};
                        });
                    }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
                expect(otherControllerInvoked).toBe(true);
            });
        });

        it('can be applied to different directives, as different instances', function() {
            var invocations = 0;
            function MyController() {
                invocations++;
            }
            var injector = createInjector(['ng',
                    function($controllerProvider, $compileProvider) {
                        $controllerProvider.register('MyController', MyController);
                        $compileProvider.directive('myDirective', function() {
                            return {controller: 'MyController'};
                        });
                        $compileProvider.directive('myOtherDirective', function() {
                            return {controller: 'MyController'};
                        });
                    }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(invocations).toBe(2);
            });
        });

        it('can be aliased with @ when given in directive attribute', function() {
            var controllerInvoked;
            function MyController() {
                controllerInvoked = true;
            }
            var injector = createInjector(['ng',
                    function($controllerProvider, $compileProvider) {
                        $controllerProvider.register('MyController', MyController);
                        $compileProvider.directive('myDirective', function() {
                            return {controller: '@'};
                        });
                    }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="MyController"></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
            });
        });

        it('gets scope, element, and attrs through DI', function() {
            var gotScope, gotElement, gotAttrs;
            function MyController($element, $scope, $attrs) {
                gotElement = $element;
                gotScope = $scope;
                gotAttrs = $attrs;
            }
            var injector = createInjector(['ng',
                function($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function() {
                        return {controller: 'MyController'};
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive an-attr="abc"></div>');
                $compile(el)($rootScope);
                expect(gotElement[0]).toBe(el[0]);
                expect(gotScope).toBe($rootScope);
                expect(gotAttrs).toBeDefined();
                expect(gotAttrs.anAttr).toEqual('abc');
            });
        });

        it('can be attached to the scope', function() {
            function MyController() { }
            var injector = createInjector(['ng',
                function($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function() {
                        return {
                            controller: 'MyController',
                            controllerAs: 'myCtrl'
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect($rootScope.myCtrl).toBeDefined();
                expect($rootScope.myCtrl instanceof MyController).toBe(true);
            });
        });

        it('gets isolate scope as injected $scope', function() {
            var gotScope;
            function MyController($scope) {
                gotScope = $scope;
            }
            var injector = createInjector(['ng',
                function($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function() {
                        return {
                            controller: 'MyController',
                            scope: {}
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(gotScope).not.toBe($rootScope);
            });
        });

        it('has isolate scope bindings available during construction', function() {
            var gotMyAttr;
            function MyController($scope) {
                gotMyAttr = $scope.myAttr;
            }
            var injector = createInjector(['ng',
                function($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {
                                myAttr: '@myDirective'
                            },
                            controller: 'MyController'
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="abc"></div>');
                $compile(el)($rootScope);
                expect(gotMyAttr).toEqual('abc');
            });
        });

        it('can bind isolate scope bindings directly to self', function() {
            var gotMyAttr;
            function MyController() {
                gotMyAttr = this.myAttr;
            }
            var injector = createInjector(['ng',
                function($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {
                                myAttr: '@myDirective'
                            },
                            controller: 'MyController',
                            bindToController: true
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="abc"></div>');
                $compile(el)($rootScope);
                expect(gotMyAttr).toEqual('abc');
            });
        });

        it('can bind iso scope bindings through bindToController', function() {
            var gotMyAttr;
            function MyController() {
                gotMyAttr = this.myAttr;
            }
            var injector = createInjector(['ng',
                function($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: { },
                            controller: 'MyController',
                            bindToController: {
                                myAttr: '@myDirective'
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="abc"></div>');
                $compile(el)($rootScope);
                expect(gotMyAttr).toEqual('abc');
            });
        });

        it('can bind through bindToController without iso scope', function() {
            var gotMyAttr;
            function MyController() {
                gotMyAttr = this.myAttr;
            }
            var injector = createInjector(['ng',
                function($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: true,
                            controller: 'MyController',
                            bindToController: {
                                myAttr: '@myDirective'
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="abc"></div>');
                $compile(el)($rootScope);
                expect(gotMyAttr).toEqual('abc');
            });
        });

        it('can be required from a sibling directive', function() {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {},
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            require: 'myDirective',
                            link: function(scope, element, attrs, myController) {
                                gotMyController = myController;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('can be required from multiple sibling directives', function() {
            function MyController() { }
            function MyOtherController() { }
            var gotMyControllers;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: true,
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            scope: true,
                            controller: MyOtherController
                        };
                    });
                    $compileProvider.directive('myThirdDirective', function() {
                        return {
                            require: ['myDirective', 'myOtherDirective'],
                            link: function(scope, element, attrs, controllers) {
                                gotMyControllers = controllers;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive my-third-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyControllers).toBeDefined();
                expect(gotMyControllers.length).toBe(2);
                expect(gotMyControllers[0] instanceof MyController).toBe(true);
                expect(gotMyControllers[1] instanceof MyOtherController).toBe(true);
            });
        });
 
        it('can be required as an object', function() {
            function MyController() { }
            function MyOtherController() { }
            var gotMyControllers;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: true,
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            scope: true,
                            controller: MyOtherController
                        };
                    });
                    $compileProvider.directive('myThirdDirective', function() {
                        return {
                            require: {
                                myDirective: 'myDirective',
                                myOtherDirective: 'myOtherDirective'
                            },
                            link: function(scope, element, attrs, controllers) {
                                gotMyControllers = controllers;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive my-third-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyControllers).toBeDefined();
                expect(gotMyControllers.myDirective instanceof MyController).toBe(true);
                expect(gotMyControllers.myOtherDirective instanceof MyOtherController).toBe(true);
            });
        });

        it('can be required as an object with values omitted', function() {
            function MyController() { }
            var gotControllers;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: true,
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            require: {
                                myDirective: ''
                            },
                            link: function(scope, element, attrs, controllers) {
                                gotControllers = controllers;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotControllers).toBeDefined();
                expect(gotControllers.myDirective instanceof MyController).toBe(true);
            });
        });

        it('requires itself if there is not explicit require', function() {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {},
                            controller: MyController,
                            link: function(scope, element, attrs, myController) {
                                gotMyController = myController;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('is passed through grouped link wrapper', function() {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            multiElement: true,
                            scope: {},
                            controller: MyController,
                            link: function(scope, element, attrs, myController) {
                                gotMyController = myController;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive-start></div><div my-directive-end></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('can be required from a parent directive', function() {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {},
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            require: '^myDirective',
                            link: function(scope, element, attrs, myController) {
                                gotMyController = myController;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive><div my-other-directive></div></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('finds from sibling directives when requiring with parent prefix', function() {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {},
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            require: '^myDirective',
                            link: function(scope, element, attrs, myController) {
                                gotMyController = myController;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('can be required from a parent directive with ^^', function() {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {},
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            require: '^^myDirective',
                            link: function(scope, element, attrs, myController) {
                                gotMyController = myController;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive><div my-other-directive></div></div>');
                $compile(el)($rootScope);
                expect(gotMyController).toBeDefined();
                expect(gotMyController instanceof MyController).toBe(true);
            });
        });

        it('does not find from sibling directives when requiring with ^^', function() {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {},
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            require: '^^myDirective',
                            link: function(scope, element, attrs, myController) {
                                gotMyController = myController;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function() {
                    $compile(el)($rootScope);
                }).toThrow();
            });
        });

        it('can be required from parent in object form', function() {
            function MyController() { }
            var gotMyController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {},
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            require: {
                                myDirective: '^'
                            },
                            link: function(scope, element, attrs, myController) {
                                gotMyController = myController;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotMyController.myDirective instanceof MyController).toBe(true);
            });
        });

        it('does not throw on required missing controller when optional', function() {
            var gotCtrl;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            require: '?noSuchDirective',
                            link: function(scope, element, attrs, ctrl) {
                                gotCtrl = ctrl;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotCtrl).toBe(null);
            });
        });

        it('allows optional marker after parent marker', function() {
            var gotCtrl;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            require: '^?noSuchDirective',
                            link: function(scope, element, attrs, ctrl) {
                                gotCtrl = ctrl;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotCtrl).toBe(null);
            });
        });

        it('allows optional marker before parent marker', function() {
            var gotCtrl;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            require: '?^noSuchDirective',
                            link: function(scope, element, attrs, ctrl) {
                                gotCtrl = ctrl;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(gotCtrl).toBe(null);
            });
        });

        it('attaches required controllers on controller when using object', function() {
            function MyController() { }
            var instantiatedController;
            var injector = createInjector(['ng',
                function($compileProvider) {
                    $compileProvider.directive('myDirective', function() {
                        return {
                            scope: {},
                            controller: MyController
                        };
                    });
                    $compileProvider.directive('myOtherDirective', function() {
                        return {
                            require: {
                                myDirective: '^'
                            },
                            bindToController: true,
                            controller: function() {
                                instantiatedController = this;
                            }
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(instantiatedController.myDirective instanceof MyController).toBe(true);
            });
        });

        it('allows looking up controller from the surrounding scope', function() {
            var gotScope;
            function MyController($scope) {
                gotScope = $scope;
            }
            var injector = createInjector(['ng']);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div ng-controller="MyCtrlOnScope as myCtrl"></div>');
                $rootScope.MyCtrlOnScope = MyController;
                $compile(el)($rootScope);
                expect(gotScope.myCtrl).toBeDefined();
                expect(gotScope.myCtrl instanceof MyController).toBe(true);
            });
        });

    });

    describe('template', function() {

        it('populates an element during compilation', function() {
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    template: '<div class="from-template"></div>"'
                };
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive></div>');
                $compile(el);
                expect(el.find('> .from-template').length).toBe(1);
            });
        });

        it('replaces any existing children', function() {
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    template: '<div class="from-template"></div>"'
                };
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive><div class="existing"></div></div>');
                $compile(el);
                expect(el.find('> .existing').length).toBe(0);
            });
        });

        it('compiles template contents', function() {
            var compileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        template: '<div my-other-directive></div>"'
                    };
                },
                myOtherDirective: function() {
                    return {
                        compile: compileSpy
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive></div>');
                $compile(el);
                expect(compileSpy).toHaveBeenCalled();
            });
        });

        it('does not allow two directives with templates', function() {
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        template: '<div></div>"'
                    };
                },
                myOtherDirective: function() {
                    return {
                        template: '<div></div>"'
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function() {
                    $compile(el);
                }).toThrow();
            });
        });

        it('supports functions as template values', function() {
            var templateSpy = jasmine.createSpy()
                                .and.returnValue('<div class="from-template"></div>');
            var injector = makeInjectorWithDirectives('myDirective', function() {
                return {
                    template: templateSpy 
                };
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive></div>');
                $compile(el);
                expect(el.find('> .from-template').length).toBe(1);
                expect(templateSpy.calls.first().args[0][0]).toBe(el[0]);
                expect(templateSpy.calls.first().args[1].myDirective).toBeDefined();
            });
        });

        it('uses isolate scope for template contents', function() {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {
                            isoValue: '=myDirective'
                        },
                        template: '<div my-other-directive></div>'
                    };
                },
                myOtherDirective: function() {
                    return {
                        link: linkSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="42"></div>');
                $compile(el)($rootScope);
                expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
                expect(linkSpy.calls.first().args[0].isoValue).toBe(42);
            });
        });
    });

    describe('templateUrl', function() {

        var xhr, requests;

        beforeEach(function() {
            xhr = sinon.useFakeXMLHttpRequest();
            requests = [];
            xhr.onCreate = function(req) {
                requests.push(req);
            };
        });

        afterEach(function() {
            xhr.restore();
        });

        it('defers remaining directive compilation', function() {
            var otherCompileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {templateUrl: '/my_directive.html'};
                },
                myOtherDirective: function() {
                    return {compile: otherCompileSpy};
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el);
                expect(otherCompileSpy).not.toHaveBeenCalled();
            });
        });

        it('defers current directive compilation', function() {
            var compileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        templateUrl: '/my_directive.html',
                        compile: compileSpy
                    };
                },
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive></div>');
                $compile(el);
                expect(compileSpy).not.toHaveBeenCalled();
            });
        });

        it('immediately empties out the element', function() {
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {templateUrl: '/my_directive.html'};
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive>Hello</div>');
                $compile(el);
                expect(el.is(':empty')).toBe(true);
            });
        });

        it('fetches the template', function() {
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {templateUrl: '/my_directive.html'};
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');

                $compile(el);
                $rootScope.$apply();

                expect(requests.length).toBe(1);
                expect(requests[0].method).toBe('GET');
                expect(requests[0].url).toBe('/my_directive.html');
            });
        });

        it('populates the element with template', function() {
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {templateUrl: '/my_directive.html'};
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');

                $compile(el);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div class="from-template"></div>');
                expect(el.find('> .from-template').length).toBe(1);
            });
        });

        it('compiles current directive when template received', function() {
            var compileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        templateUrl: '/my_directive.html',
                        compile: compileSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');

                $compile(el);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div class="from-template"></div>');
                expect(compileSpy).toHaveBeenCalled();
            });
        });

        it('resumes compilation when template recieved', function() {
            var otherCompileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        templateUrl: '/my_directive.html',
                    };
                },
                myOtherDirective: function() {
                    return {
                        compile: otherCompileSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');

                $compile(el);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div class="from-template"></div>');
                expect(otherCompileSpy).toHaveBeenCalled();
            });
        });

        it('supports functions as values', function() {
            var templateUrlSpy = jasmine.createSpy()
                .and.returnValue('/my_directive.html');
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        templateUrl: templateUrlSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');

                $compile(el);
                $rootScope.$apply();

                expect(requests[0].url).toBe('/my_directive.html');
                expect(templateUrlSpy.calls.first().args[0][0]).toBe(el[0]);
                expect(templateUrlSpy.calls.first().args[1]).toBeDefined();
            });
        });

        it('does not allow templateUrl directive after template directive', function() {
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {template: '<div></div>'};
                },
                myOtherDirective: function() {
                    return {templateUrl: '/my_other_directive.html'};
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function() {
                    $compile(el);
                }).toThrow();
            });
        });

        it('does not allow template directive after templateUrl directive', function() {
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {templateUrl: '/my-directive.html'};
                },
                myOtherDirective: function() {
                    return {template: '<div></div>'};
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');

                $compile(el);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div class="replacement"></div>');
                expect(el.find('> .replacement').length).toBe(1);
            });
        });

        it('links the directive when public link function is invoked', function() {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        templateUrl: '/my_directive.html',
                        link: linkSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');

                var linkFunction = $compile(el);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div></div>');

                linkFunction($rootScope);
                expect(linkSpy).toHaveBeenCalled();
                expect(linkSpy.calls.first().args[0]).toBe($rootScope);
                expect(linkSpy.calls.first().args[1][0]).toBe(el[0]);
                expect(linkSpy.calls.first().args[2].myDirective).toBeDefined();
            });
        });

        it('links child elements when public link function is invoked', function() {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        templateUrl: '/my_directive.html',
                    };
                },
                myOtherDirective: function() {
                    return {
                        link: linkSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');

                var linkFunction = $compile(el);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div my-other-directive></div>');

                linkFunction($rootScope);
                expect(linkSpy).toHaveBeenCalled();
                expect(linkSpy.calls.first().args[0]).toBe($rootScope);
                expect(linkSpy.calls.first().args[1][0]).toBe(el[0].firstChild);
                expect(linkSpy.calls.first().args[2].myOtherDirective).toBeDefined();
            });
        });

        it('links when template arrives if node link fn was called', function() {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        templateUrl: '/my_directive.html',
                        link: linkSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');

                var linkFunction = $compile(el)($rootScope); // link first
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div></div>'); //then receive template

                expect(linkSpy).toHaveBeenCalled();
                expect(linkSpy.calls.argsFor(0)[0]).toBe($rootScope);
                expect(linkSpy.calls.argsFor(0)[1][0]).toBe(el[0]);
                expect(linkSpy.calls.argsFor(0)[2].myDirective).toBeDefined();
            });
        });

        it('links when template arrives if node link fn was called', function() {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        link: linkSpy
                    };
                },
                myOtherDirective: function() {
                    return {
                        templateUrl: '/my_other_directive.html'
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');

                var linkFunction = $compile(el);
                $rootScope.$apply();

                linkFunction($rootScope);

                requests[0].respond(200, {}, '<div></div>');

                expect(linkSpy).toHaveBeenCalled();
                expect(linkSpy.calls.argsFor(0)[0]).toBe($rootScope);
                expect(linkSpy.calls.argsFor(0)[1][0]).toBe(el[0]);
                expect(linkSpy.calls.argsFor(0)[2].myDirective).toBeDefined();
            });
        });

        it('retains isolate scope directives from earlier', function() {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {val: '=myDirective'},
                        link: linkSpy
                    };
                },
                myOtherDirective: function() {
                    return {
                        templateUrl: '/my_other_directive.html'
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="42" my-other-directive></div>');

                var linkFunction = $compile(el);
                $rootScope.$apply();

                linkFunction($rootScope);

                requests[0].respond(200, {}, '<div></div>');

                expect(linkSpy).toHaveBeenCalled();
                expect(linkSpy.calls.first().args[0]).toBeDefined();
                expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
                expect(linkSpy.calls.first().args[0].val).toBe(42);
            });
        });

        it('supports isolate scope directives with templateUrls', function() {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {val: '=myDirective'},
                        templateUrl: '/my_other_directive.html',
                        link: linkSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="42"></div>');

                var linkFunction = $compile(el)($rootScope);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div></div>');

                expect(linkSpy).toHaveBeenCalled();
                expect(linkSpy.calls.first().args[0]).toBeDefined();
                expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
                expect(linkSpy.calls.first().args[0].val).toBe(42);
            });
        });

        it('links children of isolate scope directives with templateUrls', function() {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {val: '=myDirective'},
                        templateUrl: '/my_other_directive.html',
                    };
                },
                myChildDirective: function() {
                    return {
                        link: linkSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive="42"></div>');

                var linkFunction = $compile(el)($rootScope);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div my-child-directive></div>');

                expect(linkSpy).toHaveBeenCalled();
                expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
                expect(linkSpy.calls.first().args[0].val).toBe(42);
            });
        });

        it('sets up controllers for all controller directives', function() {
            var myDirectiveControllerInstantiated, myOtherDirectiveControllerInstantiated;
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        controller: function MyDirectiveController() {
                            myDirectiveControllerInstantiated = true;
                        }
                    };
                },
                myOtherDirective: function() {
                    return {
                        templateUrl: '/my-other-directive.html',
                        controller: function MyOtherDirectiveController() {
                            myOtherDirectiveControllerInstantiated = true;
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');

                $compile(el)($rootScope);
                $rootScope.$apply();

                requests[0].respond(200, {}, '<div></div>');

                expect(myDirectiveControllerInstantiated).toBe(true);
                expect(myOtherDirectiveControllerInstantiated).toBe(true);
            });
        });

        describe('with transclusion', function() {

            it('works when template arrives first', function() {
                var injector = makeInjectorWithDirectives({
                    myTranscluder: function() {
                        return {
                            transclude: true,
                            templateUrl: 'my_template.html',
                            link: function(scope, element, attrs, ctrl, transclude) {
                                element.find('[in-template]').append(transclude());
                            }
                        };
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    var el = $('<div my-transcluder><div in-transclude></div></div>');

                    var linkFunction = $compile(el);
                    $rootScope.$apply();
                    requests[0].respond(200, {}, '<div in-template></div>'); // respond first
                    linkFunction($rootScope); // then link

                    expect(el.find('> [in-template] > [in-transclude]').length).toBe(1);
                });
            });

            it('works when template arrives first', function() {
                var injector = makeInjectorWithDirectives({
                    myTranscluder: function() {
                        return {
                            transclude: true,
                            templateUrl: 'my_template.html',
                            link: function(scope, element, attrs, ctrl, transclude) {
                                element.find('[in-template]').append(transclude());
                            }
                        };
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    var el = $('<div my-transcluder><div in-transclude></div></div>');

                    var linkFunction = $compile(el);
                    $rootScope.$apply();
                    linkFunction($rootScope); // link first
                    requests[0].respond(200, {}, '<div in-template></div>'); // then respond

                    expect(el.find('> [in-template] > [in-transclude]').length).toBe(1);
                });
            });

            it('is only allowed once', function() {
                var otherCompileSpy = jasmine.createSpy();
                var injector = makeInjectorWithDirectives({
                    myTranscluder: function() {
                        return {
                            priority: 1,
                            transclude: true,
                            templateUrl: 'my_template.html'
                        };
                    },
                    mySecondTranscluder: function() {
                        return {
                            priority: 0,
                            transclude: true,
                            compile: otherCompileSpy
                        };
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    var el = $('<div my-transcluder my-second-transcluder></div>');

                    $compile(el);
                    $rootScope.$apply();
                    requests[0].respond(200, {}, '<div in-template></div>');

                    expect(otherCompileSpy).not.toHaveBeenCalled();
                });
            });

        });
    });

    describe('transclude', function() {

        it('removes the children of the element from the DOM', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div my-transcluder><div>Must go</div></div>');

                $compile(el);

                expect(el.is(':empty')).toBe(true);
            });
        });

        it('compiles child element', function() {
            var insideCompileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true
                    };
                },
                insideTranscluder: function() {
                    return { compile: insideCompileSpy };
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div my-transcluder><div inside-transcluder></div></div>');

                $compile(el);

                expect(insideCompileSpy).toHaveBeenCalled();
            });
        });

        it('makes contents available to directive link function', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                        template: '<div in-template></div>',
                        link: function(scope, element, attrs, ctrl, transclude) {
                            element.find('[in-template]').append(transclude());
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div in-transcluder></div></div>');

                $compile(el)($rootScope);

                expect(el.find('> [in-template] > [in-transcluder]').length).toBe(1);
            });
        });

        it('is only allowed once per element', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                    };
                },
                mySecondTranscluder: function() {
                    return {
                        transclude: true,
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder my-second-transcluder></div>');

                expect(function() {
                    $compile(el);
                }).toThrow();
            });
        });

        it('makes scope available to link functions inside', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                        link: function(scope, element, attrs, ctrl, transclude) {
                            element.append(transclude());
                        }
                    };
                },
                myInnerDirective: function() {
                    return {
                        link: function(scope, element) {
                            element.html(scope.anAttr);
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div my-inner-directive></div></div>');

                $rootScope.anAttr = 'Hello from root';
                $compile(el)($rootScope);
                expect(el.find('> [my-inner-directive]').html()).toBe('Hello from root');
            });
        });

        it('does not use the inherited scope of the directive', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                        scope: true,
                        link: function(scope, element, attrs, ctrl, transclude) {
                            scope.anAttr = 'Shadowed attribute';
                            element.append(transclude());
                        }
                    };
                },
                myInnerDirective: function() {
                    return {
                        link: function(scope, element) {
                            element.html(scope.anAttr);
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div my-inner-directive></div></div>');

                $rootScope.anAttr = 'Hello from root';
                $compile(el)($rootScope);
                expect(el.find('> [my-inner-directive]').html()).toBe('Hello from root');
            });
        });

        it('stops watching when transcluding directive is destroyed', function() {
            var watchSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                        scope: true,
                        link: function(scope, element, attrs, ctrl, transclude) {
                            element.append(transclude());
                            scope.$on('destroyNow', function() {
                                scope.$destroy();
                            });
                        }
                    };
                },
                myInnerDirective: function() {
                    return {
                        link: function(scope) {
                            scope.$watch(watchSpy);
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div my-inner-directive></div></div>');

                $compile(el)($rootScope);

                $rootScope.$apply();
                expect(watchSpy.calls.count()).toBe(2);

                $rootScope.$apply();
                expect(watchSpy.calls.count()).toBe(3);

                $rootScope.$broadcast('destroyNow');
                $rootScope.$apply();
                expect(watchSpy.calls.count()).toBe(3);
            });
        });

        it('allows passing another scope to transclusion function', function() {
            var otherLinkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                        scope: {},
                        template: '<div></div>',
                        link: function(scope, element, attrs, ctrl, transclude) {
                            var mySpecialScope = scope.$new(true);
                            mySpecialScope.specialAttr = 42;
                            transclude(mySpecialScope);
                        }
                    };
                },
                myOtherDirective: function() {
                    return {
                        link: otherLinkSpy
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div my-other-directive></div></div>');

                $compile(el)($rootScope);

                var transcludedScope = otherLinkSpy.calls.first().args[0]; 
                expect(transcludedScope.specialAttr).toBe(42);
            });
        });

        it('makes contents available to child elements', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                        template: '<div in-template></div>'
                    };
                },
                inTemplate: function() {
                    return {
                        link: function(scope, element, attrs, ctrl, transcludeFn) {
                            element.append(transcludeFn());
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div in-transclude></div></div>');

                $compile(el)($rootScope);

                expect(el.find('> [in-template] > [in-transclude]').length).toBe(1);
            });
        });

        it('makes contents available to indirect child elements', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                        template: '<div><div in-template></div></div>'
                    };
                },
                inTemplate: function() {
                    return {
                        link: function(scope, element, attrs, ctrl, transcludeFn) {
                            element.append(transcludeFn());
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div in-transclude></div></div>');

                $compile(el)($rootScope);

                expect(el.find('> div > [in-template] > [in-transclude]').length).toBe(1);
            });
        });

        it('supports passing transclusion function to public link function', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function($compile) {
                    return {
                        transclude: true,
                        link: function(scope, element, attrs, ctrl, transclude) {
                            var customTemplate = $('<div in-custom-template></div>');
                            element.append(customTemplate);
                            $compile(customTemplate)(scope, undefined, {
                                parentBoundTranscludeFn: transclude
                            });
                        }
                    };
                },
                inCustomTemplate: function() {
                    return {
                        link: function(scope, element, attrs, ctrl, transclude) {
                            element.append(transclude());
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div in-transclude></div></div>');

                $compile(el)($rootScope);
                expect(el.find('> [in-custom-template] > [in-transclude]').length).toBe(1);
            });
        });

        it('destroys scope passed through public link function at the right time', function() {
            var watchSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myTranscluder: function($compile) {
                    return {
                        transclude: true,
                        link: function(scope, element, attrs, ctrl, transclude) {
                            var customTemplate = $('<div in-custom-template></div>');
                            element.append(customTemplate);
                            $compile(customTemplate)(scope, undefined, {
                                parentBoundTranscludeFn: transclude
                            });
                        }
                    };
                },
                inCustomTemplate: function() {
                    return {
                        scope: true,
                        link: function(scope, element, attrs, ctrl, transclude) {
                            element.append(transclude());
                            scope.$on('destroyNow', function() {
                                scope.$destroy();
                            });
                        }
                    };
                },
                inTransclude: function() {
                    return {
                        link: function(scope) {
                            scope.$watch(watchSpy);
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div in-transclude></div></div>');

                $compile(el)($rootScope);

                $rootScope.$apply();
                expect(watchSpy.calls.count()).toBe(2);

                $rootScope.$apply();
                expect(watchSpy.calls.count()).toBe(3);

                $rootScope.$broadcast('destroyNow');
                $rootScope.$apply();
                expect(watchSpy.calls.count()).toBe(3);
            });
        });

        it('makes contents available to controller', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: true,
                        template: '<div in-template></div>',
                        controller: function($element, $transclude) {
                            $element.find('[in-template]').append($transclude());
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-transcluder><div in-transcluder></div></div>');

                $compile(el)($rootScope);

                expect(el.find('> [in-template] > [in-transcluder]').length).toBe(1);
            });
        });
    });

});

describe('clone attach function', function() {

    it('can be passed to public link function', function() {
        var injector = makeInjectorWithDirectives({});
        injector.invoke(function($compile, $rootScope) {
            var el = $('<div>Hello</div>');
            var myScope = $rootScope.$new();
            var gotEl, gotScope;

            $compile(el)(myScope, function cloneAttachFn(el, scope) {
                gotEl = el;
                gotScope = scope;
            });

            expect(gotEl[0].isEqualNode(el[0])).toBe(true);
            expect(gotScope).toBe(myScope);
        });
    });

    it('causes compiled elements to be cloned', function() {
        var injector = makeInjectorWithDirectives({});
        injector.invoke(function($compile, $rootScope) {
            var el = $('<div>Hello</div>');
            var myScope = $rootScope.$new();
            var gotClonedEl;

            $compile(el)(myScope, function cloneAttachFn(clonedEl) {
                gotClonedEl = clonedEl;
            });

            expect(gotClonedEl[0].isEqualNode(el[0])).toBe(true);
            expect(gotClonedEl[0]).not.toBe(el[0]);
        });
    });

    it('causes cloned DOM to be linked', function() {
        var gotCompileEl, gotLinkEl;
        var injector = makeInjectorWithDirectives({
            myDirective: function() {
                return {
                    compile: function(compileEl) {
                        gotCompileEl = compileEl;
                        return function link(scope, linkEl) {
                            gotLinkEl = linkEl;
                        };
                    }
                };
            }
        });
        injector.invoke(function($compile, $rootScope) {
            var el = $('<div my-directive></div>');
            var myScope = $rootScope.$new();

            $compile(el)(myScope, function() {});

            expect(gotCompileEl[0]).not.toBe(gotLinkEl[0]);
        });
    });

    it('allows connecting transcluded content', function() {
        var injector = makeInjectorWithDirectives({
            myTranscluder: function() {
                return {
                    transclude: true,
                    template: '<div in-template></div>',
                    link: function(scope, element, attrs, ctrl, transcludeFn) {
                        var myScope = scope.$new();
                        transcludeFn(myScope, function(transclNode) {
                            element.find('[in-template]').append(transclNode);
                        });
                    }
                };
            }
        });
        injector.invoke(function($compile, $rootScope) {
            var el = $('<div my-transcluder><div in-transclude></div></div>');

            $compile(el)($rootScope);

            expect(el.find('> [in-template] > [in-transclude]').length).toBe(1);
        });
    });

    it('can be used as the only transclusion function argument', function() {
        var injector = makeInjectorWithDirectives({
            myTranscluder: function() {
                return {
                    transclude: true,
                    template: '<div in-template></div>',
                    link: function(scope, element, attrs, ctrl, transcludeFn) {
                        var myScope = scope.$new();
                        transcludeFn(function(transclNode) {
                            element.find('[in-template]').append(transclNode);
                        });
                    }
                };
            }
        });
        injector.invoke(function($compile, $rootScope) {
            var el = $('<div my-transcluder><div in-transclusion></div></div>');

            $compile(el)($rootScope);

            expect(el.find('> [in-template] > [in-transclusion]').length).toBe(1);
        });
    });

    it('allows passing data to transclusion', function() {
        var injector = makeInjectorWithDirectives({
            myTranscluder: function() {
                return {
                    transclude: true,
                    template: '<div in-template></div>',
                    link: function(scope, element, attrs, ctrl, transcludeFn) {
                        var myScope = scope.$new();
                        transcludeFn(function(transclNode) {
                            element.find('[in-template]').append(transclNode);
                        });
                    }
                };
            }
        });
        injector.invoke(function($compile, $rootScope) {
            var el = $('<div my-transcluder><div in-transclusion></div></div>');

            $compile(el)($rootScope);

            expect(el.find('> [in-template] > [in-transclusion]').length).toBe(1);
        });
    });

    it('can be used with multi-element directives', function() {
        var injector = makeInjectorWithDirectives({
            myTranscluder: function($compile) {
                return {
                    transclude: true,
                    multiElement: true,
                    template: '<div in-template></div>',
                    link: function(scope, element, attrs, ctrl, transclude) {
                        element.find('[in-template]').append(transclude());
                    }
                };
            }
        });
        injector.invoke(function($compile, $rootScope) {
            var el = $(
                '<div><div my-transcluder-start><div in-transclude></div></div>' +
                '<div my-transcluder-end></div></div>');

            $compile(el)($rootScope);

            expect(el.find('[my-transcluder-start] [in-template] [in-transclude]').length).toBe(1);
        });
    });

    describe('element transclusion', function() {

        it('removes the element from the DOM', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: 'element'
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div><div my-transcluder></div></div>');

                $compile(el);

                expect(el.is(':empty')).toBe(true);
            });
        });

        it('replaces the element with a comment', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: 'element'
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div><div my-transcluder></div></div>');

                $compile(el);

                expect(el.html()).toEqual('<!-- myTranscluder:  -->');
            });
        });

        it('includes directive attribute value in comment', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: 'element'
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $('<div><div my-transcluder=42></div></div>');

                $compile(el);

                expect(el.html()).toEqual('<!-- myTranscluder: 42 -->');
            });
        });

        it('calls directive compile and link with comment', function() {
            var gotCompiledEl, gotLinkedEl;
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: 'element',
                        compile: function(compiledEl) {
                            gotCompiledEl = compiledEl;
                            return function(scope, linkedEl) {
                                gotLinkedEl = linkedEl;
                            };
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div><div my-transcluder=42></div></div>');

                $compile(el)($rootScope);

                expect(gotCompiledEl[0].nodeType).toBe(Node.COMMENT_NODE);
                expect(gotLinkedEl[0].nodeType).toBe(Node.COMMENT_NODE);
            });
        });

        it('calls lower priority compile with original', function() {
            var gotCompiledEl;
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        priority: 2,
                        transclude: 'element',
                    };
                },
                myOtherDirective: function() {
                    return {
                        priority: 1,
                        compile: function(compiledEl) {
                            gotCompiledEl = compiledEl;
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div><div my-transcluder my-other-directive></div></div>');

                $compile(el);

                expect(gotCompiledEl[0].nodeType).toBe(Node.ELEMENT_NODE);
            });
        });

        it('calls compile on child element directives', function() {
            var compileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: 'element'
                    };
                },
                myOtherDirective: function() {
                    return {
                        compile: compileSpy
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $(
                    '<div><div my-transcluder><div my-other-directive></div></div></div>');

                $compile(el);

                expect(compileSpy).toHaveBeenCalled();
            });
        });

        it('compiles original element contents once', function() {
            var compileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: 'element'
                    };
                },
                myOtherDirective: function() {
                    return {
                        compile: compileSpy
                    };
                }
            });
            injector.invoke(function($compile) {
                var el = $(
                    '<div><div my-transcluder><div my-other-directive></div></div></div>');

                $compile(el);

                expect(compileSpy.calls.count()).toBe(1);
            });
        });

        it('makes original element available for transclusion', function() {
            var injector = makeInjectorWithDirectives({
                myDouble: function() {
                    return {
                        transclude: 'element',
                        link: function(scope, el, attrs, ctrl, transclude) {
                            transclude(function(clone) {
                                el.after(clone);
                            });
                            transclude(function(clone) {
                                el.after(clone);
                            });
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div><div my-double>Hello</div></div>');

                $compile(el)($rootScope);

                expect(el.find('[my-double]').length).toBe(2);
            });
        });

        it('sets directive attributes element to comment', function() {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function() {
                    return {
                        transclude: 'element',
                        link: function(scope, element, attrs, ctrl, transclude) {
                            attrs.$set('testing', '42');
                            element.after(transclude());
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div><div my-transcluder></div></div>');

                $compile(el)($rootScope);

                expect(el.find('[my-transcluder]').attr('testing')).toBeUndefined();
            });
        });

        it('supports requiring controllers', function() {
            var MyController = function() {};
            var gotCtrl;
            var injector = makeInjectorWithDirectives({
                myCtrlDirective: function() {
                    return {controller: MyController};
                },
                myTranscluder: function() {
                    return {
                        transclude: 'element',
                        link: function(scope, el, attrs, ctrl, transclude) {
                            el.after(transclude());
                        }
                    };
                },
                myOtherDirective: function() {
                    return {
                        require: '^myCtrlDirective',
                        link: function(scope, el, attrs, ctrl, transclude) {
                            gotCtrl = ctrl;
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $(
                    '<div><div my-ctrl-directive my-transcluder><div my-other-directive></div></div></div>');

                $compile(el)($rootScope);

                expect(gotCtrl).toBeDefined();
                expect(gotCtrl instanceof MyController).toBe(true);

            });
        });
    });

    describe('interpolation', function() {
        it('is done for text nodes', function() {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div>My expression: {{myExpr}}</div>');
                $compile(el)($rootScope);

                $rootScope.$apply();
                expect(el.html()).toEqual('My expression: ');

                $rootScope.myExpr = 'Hello';
                $rootScope.$apply();
                expect(el.html()).toEqual('My expression: Hello');
            });
        });

        it('adds binding class to text node parents', function() {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div>My expression: {{myExpr}}</div>');
                $compile(el)($rootScope);

                expect(el.hasClass('ng-binding')).toBe(true);
            });
        });

        it('adds binding data to text node parents', function() {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div>{{myExpr}} and {{myOtherExpr}}</div>');
                $compile(el)($rootScope);

                expect(el.data('$binding')).toEqual(['myExpr', 'myOtherExpr']);
            });
        });

        it('adds binding data to parent from multiple text nodes', function() {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div>{{myExpr}} <span>and</span> {{myOtherExpr}}</div>');
                $compile(el)($rootScope);

                expect(el.data('$binding')).toEqual(['myExpr', 'myOtherExpr']);
            });
        });

        it('is done for attributes', function() {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function($compile, $rootScope) {
                var el = $('<img alt="{{myAltText}}">');
                $compile(el)($rootScope);

                $rootScope.$apply();
                expect(el.attr('alt')).toEqual('');

                $rootScope.myAltText = 'My favourite photo';
                $rootScope.$apply();
                expect(el.attr('alt')).toEqual('My favourite photo');
            });
        });

        it('fires observers on attribute expression changes', function() {
            var observerSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        link: function(scope, element, attrs) {
                            attrs.$observe('alt', observerSpy);
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<img alt="{{myAltText}}" my-directive>');
                $compile(el)($rootScope);

                $rootScope.myAltText = 'My favourite photo';
                $rootScope.$apply();
                expect(observerSpy.calls.mostRecent().args[0])
                    .toEqual('My favourite photo');
            });
        });

        it('fires observers just once upon registration', function() {
            var observerSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        link: function(scope, element, attrs) {
                            attrs.$observe('alt', observerSpy);
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<img alt="{{myAltText}}" my-directive>');
                $compile(el)($rootScope);
                $rootScope.$apply();

                expect(observerSpy.calls.count()).toBe(1);
            });
        });

        it('is done for attributes by the time the other directive is linked', function() {
            var gotMyAttr;
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        link: function(scope, element, attrs) {
                            gotMyAttr = attrs.myAttr;
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
                $rootScope.myExpr = 'Hello';
                $compile(el)($rootScope);
                $rootScope.$apply();

                expect(gotMyAttr).toEqual('Hello');
            });
        });

        it('is done for attributes by the time bound to iso scope', function() {
            var gotMyAttr;
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        scope: {myAttr: '@'},
                        link: function(scope, element, attrs) {
                            gotMyAttr = scope.myAttr;
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
                $rootScope.myExpr = 'Hello';
                $compile(el)($rootScope);

                expect(gotMyAttr).toEqual('Hello');
            });
        });

        it('is done for attributes so that compile-time changes apply', function() {
            var gotMyAttr;
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        compile: function(element, attrs) {
                            attrs.$set('myAttr', '{{myDifferentExpr}}');
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
                $rootScope.myExpr = 'Hello';
                $rootScope.myDifferentExpr = 'Other Hello';
                $compile(el)($rootScope);
                $rootScope.$apply();

                expect(el.attr('my-attr')).toEqual('Other Hello');
            });
        });

        it('is done for attributes so that compile-time removals apply', function() {
            var gotMyAttr;
            var injector = makeInjectorWithDirectives({
                myDirective: function() {
                    return {
                        compile: function(element, attrs) {
                            attrs.$set('myAttr', null);
                        }
                    };
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
                $rootScope.myExpr = 'Hello';
                $rootScope.myDifferentExpr = 'Other Hello';
                $compile(el)($rootScope);
                $rootScope.$apply();

                expect(el.attr('my-attr')).toBeFalsy();
            });
        });

        it('cannot be done for event handler attributes', function() {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function($compile, $rootScope) {
                $rootScope.myFunction = function() { };
                var el = $('<button onclick="{{myFunction()}}"></button>');
                expect(function() {
                    $compile(el)($rootScope);
                }).toThrow();
            });
        });

        it('denormalizes directive templates', function() {
            var injector = createInjector(['ng',
                function($interpolateProvider, $compileProvider) {
                    $interpolateProvider.startSymbol('[[').endSymbol(']]');
                    $compileProvider.directive('myDirective', function() {
                        return {
                            template: 'Value is {{myExpr}}'
                        };
                    });
                }
            ]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $rootScope.myExpr = 42;
                $compile(el)($rootScope);
                $rootScope.$apply();

                expect(el.html()).toEqual('Value is 42');
            });
        });


    });

    describe('components', function() {

        var xhr, requests;

        beforeEach(function() {
            xhr = sinon.useFakeXMLHttpRequest();
            requests = [];
            xhr.onCreate = function(req) {
                requests.push(req);
            };
        });

        afterEach(function() {
            xhr.restore();
        });

        it('can be registered and become directives', function() {
            var myModule = window.angular.module('myModule', []);
            myModule.component('myComponent', {});
            var injector = createInjector(['ng', 'myModule']);
            expect(injector.has('myComponentDirective')).toBe(true);
        });

        function makeInjectorWithComponent(name, options) {
            return createInjector(['ng', function($compileProvider) {
                $compileProvider.component(name, options);
            }]);
        }

        it('is an element directive with a controller', function() {
            var controllerInstantiated = false;
            var componentElement;
            var injector = makeInjectorWithComponent('myComponent', {
                controller: function($element) {
                    controllerInstantiated = true;
                    componentElement = $element;
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                expect(controllerInstantiated).toBe(true);
                expect(el[0]).toBe(componentElement[0]);
            });
        });

        it('cannot be applied to an attribute', function() {
            var controllerInstantiated = false;
            var injector = makeInjectorWithComponent('myComponent', {
                restrict: 'A', // Will be ignored
                controller: function($element) {
                    controllerInstantiated = true;
                    componentElement = $element;
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<div my-component></div>');
                $compile(el)($rootScope);
                expect(controllerInstantiated).toBe(false);
            });
        });

        it('has an isolate scope', function() {
            var componentScope;
            var injector = makeInjectorWithComponent('myComponent', {
                controller: function($scope) {
                    componentScope = $scope;
                }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                expect(componentScope).not.toBe($rootScope);
                expect(componentScope.$parent).toBe($rootScope);
                expect(Object.getPrototypeOf(componentScope)).not.toBe($rootScope);
            });
        });

        it('may have bindings which are attached to controller', function() {
            var controllerInstance;
            var injector = makeInjectorWithComponent('myComponent', {
                bindings: {
                    attr: '@',
                    oneWay: '<',
                    twoWay: '='
                },
                controller: function() {
                    controllerInstance = this;
                }
            });
            injector.invoke(function($compile, $rootScope) {
                $rootScope.b = 42;
                $rootScope.c = 43;
                var el = $('<my-component attr="a", one-way="b", two-way="c"></my-component>');
                $compile(el)($rootScope);

                expect(controllerInstance.attr).toEqual('a');
                expect(controllerInstance.oneWay).toEqual(42);
                expect(controllerInstance.twoWay).toEqual(43);
            })
        });

        it('may use a controller alias with controllerAs', function() {
            var componentScope;
            var controllerInstance;
            var injector = makeInjectorWithComponent('myComponent', {
                controller: function($scope) {
                    componentScope = $scope;
                    controllerInstance = this;
                 },
                controllerAs: 'myComponentController'
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                expect(componentScope.myComponentController).toBe(controllerInstance);
            });
        });

        it('may use a controller alias with "controller as" syntax', function() {
            var componentScope;
            var controllerInstance;
            var injector = createInjector(['ng', function($controllerProvider, $compileProvider) {
                $controllerProvider.register('MyController', function($scope) {
                    componentScope = $scope;
                    controllerInstance = this;
                });
                $compileProvider.component('myComponent', {
                    controller: 'MyController as myComponentController'
                });
            }]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                expect(componentScope.myComponentController).toBe(controllerInstance);
            });
        });

        it('has a default controller alias of $ctrl', function() {
            var componentScope;
            var controllerInstance;
            var injector = makeInjectorWithComponent('myComponent', {
                controller: function($scope) {
                    componentScope = $scope;
                    controllerInstance = this;
                 }
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                expect(componentScope.$ctrl).toBe(controllerInstance);
            });
        });

        it('may have a template', function() {
            var injector = makeInjectorWithComponent('myComponent', {
                controller: function() {
                    this.message = 'Hello from component';
                },
                template: '{{ $ctrl.message }}'
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                $rootScope.$apply();
                expect(el.text()).toEqual('Hello from component');
            });
        });

        it('may have a templateUrl', function() {
            var injector = makeInjectorWithComponent('myComponent', {
                controller: function() {
                    this.message = 'Hello from component';
                },
                templateUrl: '/my_component.html'
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                $rootScope.$apply();
                requests[0].respond(200, {}, '{{ $ctrl.message }}');
                $rootScope.$apply();
                expect(el.text()).toEqual('Hello from component');
            });
        });

        it('may have a template function with DI support', function() {
            var injector = createInjector(['ng', function($provide, $compileProvider) {
                $provide.constant('myConstant', 42);
                $compileProvider.component('myComponent', {
                    template: function(myConstant) {
                        return '' + myConstant;
                    }
                });
            }]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                expect(el.text()).toEqual('42');
            });
        });

        it('may inject $element and $attrs to template functions', function() {
            var injector = createInjector(['ng', function($provide, $compileProvider) {
                $compileProvider.component('myComponent', {
                    template: function($element, $attrs) {
                        return $element.attr('copiedAttr', $attrs.myAttr);
                    }
                });
            }]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component my-attr="42"></my-component>');
                $compile(el)($rootScope);
                expect(el.attr('copiedAttr')).toEqual('42');
            });
        });

        it('may have a templateUrl function with DI support', function() {
            var injector = createInjector(['ng', function($provide, $compileProvider) {
                $provide.constant('myConstant', 42);
                $compileProvider.component('myComponent', {
                    templateUrl: function(myConstant) {
                        return '/template' + myConstant + '.html';
                    }
                });
            }]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component></my-component>');
                $compile(el)($rootScope);
                $rootScope.$apply();
                expect(requests[0].url).toEqual('/template42.html');
            });
        });

        it('may use transclusion', function() {
            var injector = makeInjectorWithComponent('myComponent', {
                transclude: true,
                template: '<div ng-transclude></div>'
            });
            injector.invoke(function($compile, $rootScope) {
                var el = $('<my-component>Transclude me</my-component>');
                $compile(el)($rootScope);
                expect(el.find('div').text()).toEqual('Transclude me');
            });
        });

        it('may require other directive controllers', function() {
            var secondControllerInstance;
            var injector = createInjector(['ng', function($compileProvider) {
                $compileProvider.component('first', {
                    controller: function() {}
                });
                $compileProvider.component('second', {
                    require: {first: '^'},
                    controller: function() {
                        secondControllerInstance = this;
                    }
                });
            }]);
            injector.invoke(function($compile, $rootScope) {
                var el = $('<first><second></second></first>');
                $compile(el)($rootScope);
                expect(secondControllerInstance.first).toBeDefined();
            });
        });

        describe('lifecycle', function() {

            it('calls $onInit after all ctrls created before linking', function() {
                var invocations = [];
                var injector = createInjector(['ng', function($compileProvider) {
                    $compileProvider.component('first', {
                        controller: function() {
                            invocations.push('first controller created');
                            this.$onInit = function() {
                                invocations.push('first controller $onInit');
                            };
                        }
                    });
                    $compileProvider.directive('second', function() {
                        return {
                            controller: function() {
                                invocations.push('second controller created');
                                this.$onInit = function() {
                                    invocations.push('second controller $onInit');
                                };
                            },
                            link: {
                                pre: function() { invocations.push('second prelink'); },
                                post: function() { invocations.push('second postlink'); },
                            }
                        }
                    })
                }]);
                injector.invoke(function($compile, $rootScope) {
                    var el = $('<first second></first>');
                    $compile(el)($rootScope);
                    expect(invocations).toEqual([
                        'first controller created',
                        'second controller created',
                        'first controller $onInit',
                        'second controller $onInit',
                        'second prelink',
                        'second postlink'
                    ]);
                });
            });

            it('calls $onDestroy when the scope is destroyed', function() {
                var destroySpy = jasmine.createSpy();
                var injector = makeInjectorWithComponent('myComponent', {
                    controller: function() {
                        this.$onDestroy = destroySpy;
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    var el = $('<my-component></my-component>');
                    $compile(el)($rootScope);
                    $rootScope.$destroy();
                    expect(destroySpy).toHaveBeenCalled();
                });
            });

            it('calls $postLink after all linking is done', function() {
                var invocations = [];
                var injector = createInjector(['ng', function($compileProvider) {
                    $compileProvider.component('first', {
                        controller: function() {
                            this.$postLink = function() {
                                invocations.push('first controller $postLink');
                            };
                        }
                    });
                    $compileProvider.directive('second', function() {
                        return {
                            controller: function() {
                                this.$postLink = function() {
                                    invocations.push('second controller $postLink')
                                };
                            },
                            link: function() { invocations.push('second postlink'); }
                        }
                    });
                }]);
                injector.invoke(function($compile, $rootScope) {
                    var el = $('<first><second></second></first>');
                    $compile(el)($rootScope);
                    expect(invocations).toEqual([
                        'second postlink',
                        'second controller $postLink',
                        'first controller $postLink'
                    ]);
                });
            });

            it('calls $onChanges with all bindings during init', function() {
                var changesSpy = jasmine.createSpy();
                var injector = makeInjectorWithComponent('myComponent', {
                    bindings: {
                        myBinding: '<',
                        myAttr: '@'
                    },
                    controller: function() {
                        this.$onChanges = changesSpy;
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    var el = $('<my-component my-binding="42" my-attr="43"></my-component>');
                    $compile(el)($rootScope);
                    expect(changesSpy).toHaveBeenCalled();
                    var changes = changesSpy.calls.mostRecent().args[0];
                    expect(changes.myBinding.currentValue).toBe(42);
                    expect(changes.myBinding.isFirstChange()).toBe(true);
                    expect(changes.myAttr.currentValue).toBe('43');
                    expect(changes.myAttr.isFirstChange()).toBe(true);
                });
            });

            it('does not call $onChanges for two-way bindings', function() {
                var changesSpy = jasmine.createSpy();
                var injector = makeInjectorWithComponent('myComponent', {
                    bindings: {
                        myBinding: '=',
                    },
                    controller: function() {
                        this.$onChanges = changesSpy;
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    var el = $('<my-component my-binding="42"></my-component>');
                    $compile(el)($rootScope);
                    expect(changesSpy).toHaveBeenCalled();
                    expect(changesSpy.calls.mostRecent().args[0].myBinding).toBeUndefined();
                });
            });

            it('calls $onChanges when binding changes', function() {
                var changesSpy = jasmine.createSpy();
                var injector = makeInjectorWithComponent('myComponent', {
                    bindings: {
                        myBinding: '<',
                    },
                    controller: function() {
                        this.$onChanges = changesSpy;
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    $rootScope.aValue = 42;
                    var el = $('<my-component my-binding="aValue"></my-component>');
                    $compile(el)($rootScope);
                    $rootScope.$apply();

                    expect(changesSpy.calls.count()).toBe(1);

                    $rootScope.aValue = 43;
                    $rootScope.$apply();
                    expect(changesSpy.calls.count()).toBe(2);

                    var lastChanges = changesSpy.calls.mostRecent().args[0];
                    expect(lastChanges.myBinding.currentValue).toBe(43);
                    expect(lastChanges.myBinding.previousValue).toBe(42);
                    expect(lastChanges.myBinding.isFirstChange()).toBe(false);
                });
            });

            it('calls $onChanges when attribute changes', function() {
                var changesSpy = jasmine.createSpy();
                var attrs;
                var injector = makeInjectorWithComponent('myComponent', {
                    bindings: {
                        myAttr: '@'
                    },
                    controller: function($attrs) {
                        this.$onChanges = changesSpy;
                        attrs = $attrs;
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    $rootScope.aValue = 42;
                    var el = $('<my-component my-attr="42"></my-component>');
                    $compile(el)($rootScope);
                    $rootScope.$apply();

                    expect(changesSpy.calls.count()).toBe(1);

                    attrs.$set('myAttr', '43');
                    $rootScope.$apply();
                    expect(changesSpy.calls.count()).toBe(2);

                    var lastChanges = changesSpy.calls.mostRecent().args[0];
                    expect(lastChanges.myAttr.currentValue).toBe('43');
                    expect(lastChanges.myAttr.previousValue).toBe('42');
                    expect(lastChanges.myAttr.isFirstChange()).toBe(false);
                });
            });

            it('calls $onChanges once with multiple changes', function() {
                var changesSpy = jasmine.createSpy();
                var attrs;
                var injector = makeInjectorWithComponent('myComponent', {
                    bindings: {
                        myAttr: '@',
                        myBinding: '<'
                    },
                    controller: function($attrs) {
                        this.$onChanges = changesSpy;
                        attrs = $attrs;
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    $rootScope.aValue = 42;
                    var el = $('<my-component my-binding="aValue" my-attr="fourtyTwo"></my-component>');
                    $compile(el)($rootScope);
                    $rootScope.$apply();

                    expect(changesSpy.calls.count()).toBe(1);

                    $rootScope.aValue = 43;
                    attrs.$set('myAttr', 'fourtyThree');
                    $rootScope.$apply();
                    expect(changesSpy.calls.count()).toBe(2);

                    var lastChanges = changesSpy.calls.mostRecent().args[0];
                    expect(lastChanges.myBinding.currentValue).toBe(43);
                    expect(lastChanges.myBinding.previousValue).toBe(42);
                    expect(lastChanges.myAttr.currentValue).toBe('fourtyThree');
                    expect(lastChanges.myAttr.previousValue).toBe('fourtyTwo');
                });
            });

            it('calls $onChanges in a digest', function() {
                var injector = makeInjectorWithComponent('myComponent', {
                    bindings: {
                        myBinding: '<'
                    },
                    controller: function() {
                        this.$onChanges = function() {
                            this.innerValue = 'myBinding is ' + this.myBinding;
                        };
                    },
                    template: '{{ $ctrl.innerValue }}'
                });
                injector.invoke(function($compile, $rootScope) {
                    $rootScope.aValue = 42;
                    var el = $('<my-component my-binding="aValue"></my-component>');
                    $compile(el)($rootScope);
                    $rootScope.$apply();

                    $rootScope.aValue = 43;
                    $rootScope.$apply();

                    expect(el.text()).toEqual('myBinding is 43');
                });
            });

            it('keeps first value as previous for $onChanges when multiple changes', function() {
                var changesSpy = jasmine.createSpy();
                var injector = makeInjectorWithComponent('myComponent', {
                    bindings: {
                        myBinding: '<'
                    },
                    controller: function() {
                        this.$onChanges = changesSpy;
                    }
                });
                injector.invoke(function($compile, $rootScope) {
                    $rootScope.aValue = 42;
                    var el = $('<my-component my-binding="aValue"></my-component>');
                    $compile(el)($rootScope);
                    $rootScope.$apply();

                    $rootScope.aValue = 43;
                    $rootScope.$watch('aValue', function() {
                        if ($rootScope.aValue !== 44) {
                            $rootScope.aValue = 44;
                        }
                    });

                    $rootScope.$apply();
                    expect(changesSpy.calls.count()).toBe(2);

                    var lastChanges = changesSpy.calls.mostRecent().args[0];
                    expect(lastChanges.myBinding.currentValue).toBe(44);
                    expect(lastChanges.myBinding.previousValue).toBe(42);
                });
            });

            it('runs $onChanges for all components in the same digest', function() {
                var injector = createInjector(['ng', function($compileProvider) {
                    $compileProvider.component('first', {
                        bindings: {myBinding: '<'},
                        controller: function() {
                            this.$onChanges = function() { };
                        }
                    });
                    $compileProvider.component('second', {
                        bindings: {myBinding: '<'},
                        controller: function() {
                            this.$onChanges = function() { };
                        }
                    });
                }]);
                injector.invoke(function($compile, $rootScope) {
                    var watchSpy = jasmine.createSpy();
                    $rootScope.$watch(watchSpy);

                    $rootScope.aValue = 42;
                    var el = $('<div>' +
                               '<first my-binding="aValue"></first>' +
                               '<second my-binding="aValue"></second>' +
                               '<div>');
                    $compile(el)($rootScope);
                    $rootScope.$apply();
                    // Dirty watches cause a second digest, hence 2
                    expect(watchSpy.calls.count()).toBe(2);

                    $rootScope.aValue = 43;
                    $rootScope.$apply();
                    // Two more for dirty watches, plus *one* more for onChanges
                    expect(watchSpy.calls.count()).toBe(5);
                });
            });

            it('has a TTL for $onChanges', function() {
                var injector = createInjector(['ng', function($compileProvider) {
                    $compileProvider.component('myComponent', {
                        bindings: {
                            input: '<',
                            increment: '='
                        },
                        controller: function() {
                            this.$onChanges = function() {
                                if (this.increment) {
                                    this.increment = this.increment + 1;
                                }
                            };
                        }
                    });
                }]);
                injector.invoke(function($compile, $rootScope) {
                    var watchSpy = jasmine.createSpy();
                    $rootScope.$watch(watchSpy);
                    var el = $('<div>' +
                        '<my-component input="valueOne" increment="valueTwo"></my-component>' +
                        '<my-component input="valueTwo" increment="valueOne"></my-component>' +
                        '</div>');
                    $compile(el)($rootScope);
                    $rootScope.$apply();
                    $rootScope.valueOne = 42;
                    $rootScope.valueTwo = 42;
                    $rootScope.$apply();
                    expect($rootScope.valueOne).toBe(51);
                    expect($rootScope.valueTwo).toBe(51);
                });
            });

            it('allows configuring $onChanges TTL', function() {
                var injector = createInjector(['ng', function($compileProvider) {
                    $compileProvider.onChangesTtl(50);
                    $compileProvider.component('myComponent', {
                        bindings: {
                            input: '<',
                            increment: '='
                        },
                        controller: function() {
                            this.$onChanges = function() {
                                if (this.increment) {
                                    this.increment = this.increment + 1;
                                }
                            };
                        }
                    });
                }]);
                injector.invoke(function($compile, $rootScope) {
                    var watchSpy = jasmine.createSpy();
                    $rootScope.$watch(watchSpy);
                    var el = $('<div>' +
                        '<my-component input="valueOne" increment="valueTwo"></my-component>' +
                        '<my-component input="valueTwo" increment="valueOne"></my-component>' +
                        '</div>');
                    $compile(el)($rootScope);
                    $rootScope.$apply();
                    $rootScope.valueOne = 42;
                    $rootScope.valueTwo = 42;
                    $rootScope.$apply();
                    expect($rootScope.valueOne).toBe(91);
                    expect($rootScope.valueTwo).toBe(91);
                });
            });
        });

    });

});
