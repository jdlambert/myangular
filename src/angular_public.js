'use strict';

var setupModuleLoader = require('./loader');

function publishExternalAPI() {
    setupModuleLoader(window);
}

module.exports = publishExternalAPI;
