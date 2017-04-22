'use strict';

var _ = require('lodash');

function filterFilter() {
    return function(array, filterExpr) {
        var predicateFn;
        if(_.isFunction(filterExpr)) {
            predicateFn = filterExpr;
        } else if (_.isString(filterExpr)) {
            predicateFn = createPredicateFn(filterExpr);
        } else {
            return array;
        }
        return _.filter(array, predicateFn);
    };
}

function createPredicateFn(expression) {
    return function predicateFn(item) {
        var actual = item.toLowerCase();
        var expected = expression.toLowerCase();
        return actual.indexOf(expected) !== -1;
    }
}

module.exports = filterFilter;
