'use strict';

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('$interpolate', function() {

    beforeEach(function() {
        delete window.angular;
        publishExternalAPI();
    });

    it('should exist', function() {
        var injector = createInjector(['ng']);
        expect(injector.has('$interpolate')).toBe(true);
    });

    it('produces an identity function for static content', function() {
        var injector = createInjector(['ng']);
        var $interpolate = injector.get('$interpolate');

        var interp = $interpolate('hello');
        expect(interp instanceof Function).toBe(true);
        expect(interp()).toEqual('hello');
    });

    it('evaluates a single expression', function() {
        var injector = createInjector(['ng']);
        var $interpolate = injector.get('$interpolate');

        var interp = $interpolate('{{anAttr}}');
        expect(interp({anAttr: '42'})).toEqual('42');
    });

});
