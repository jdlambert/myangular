'use strict';

var setupModuleLoader = require('./loader');

function publishExternalAPI() {
    setupModuleLoader(window);

    var ngModule = window.angular.module('ng', []);
    ngModule.provider('$filter', require('./filter'));
    ngModule.provider('$parse', require('./parse'));
    ngModule.provider('$rootScope', require('./scope'));
    ngModule.provider('$q', require('./q').$QProvider);
    ngModule.provider('$$q', require('./q').$$QProvider);
    ngModule.provider('$http', require('./http').$HttpProvider);
    ngModule.provider('$httpParamSerializer',
        require('./http').$HttpParamSerializerProvider);
    ngModule.provider('$httpBackend', require('./http_backend'));
}

module.exports = publishExternalAPI;
