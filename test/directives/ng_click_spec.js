'use strict';

var $ = require('jquery');
var publishExternalAPI = require('../../src/angular_public');
var createInjector = require('../../src/injector');

describe('ngClick', function() {

    var $compile, $rootScope;

    beforeEach(function() {
        delete window.angular;
        publishExternalAPI();
        var injector = createInjector(['ng']);
        $compile = injector.get('$compile');
        $rootScope = injector.get('$rootScope');
    });

    it('starts a digest on click', function() {
        var watchSpy = jasmine.createSpy();
        $rootScope.$watch(watchSpy);

        var button = $('<button ng-click="doSomething()"></button>');
        $compile(button)($rootScope);

        button.click();
        expect(watchSpy).toHaveBeenCalled();
    })

});
