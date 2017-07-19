'use strict';

function $InterpolateProvider() {

    this.$get = ['$parse', function($parse) {

        function $interpolate(text) {

            var startIndex = text.indexOf('{{');
            var endIndex = text.indexOf('}}');
            var exp, expFn;
            if (startIndex !== -1 && endIndex !== -1) {
                exp = text.substring(startIndex + 2, endIndex);
                expFn = $parse(exp);
            }

            return function interpolateFn(context) {
                if (expFn) {
                    return expFn(context);
                } else {
                    return text;
                }
            };

        }

        return $interpolate;
    }];

}

module.exports = $InterpolateProvider;
