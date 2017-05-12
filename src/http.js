'use strict';


function $HttpProvider() {
    this.$get = ['$httpBackend', '$q', function($httpBackend, $q) {

        return function $http() {
            var deferred = $q.defer();
            return deferred.promise;
        };

    }];
}

module.exports = $HttpProvider;
