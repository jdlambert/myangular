'use strict';

function ngClickDirective() {
    return {
        restrict: 'A',
        link: function(scope, element) {
            element.on('click', function() {
                scope.$apply();
            });
        }
    };
}

module.exports = ngClickDirective;
