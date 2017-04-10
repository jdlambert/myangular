'use strict';

var _ = require('lodash');

function initWatchVal() { }

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    this.$$phase = null;
    this.$root = this;
    this.$$children = [];
}

Scope.prototype.$new = function(isolated, parent) {
    var child;
    parent = parent || this;
    if (isolated) {
        child = new Scope();
        child.$root = parent.$root;
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    } else {
        var ChildScope = function() { };
        ChildScope.prototype = this;
        var child = new ChildScope();
    }
    parent.$$children.push(child);
    child.$$watchers = [];
    child.$$children = [];
    return child;
};

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
    var self = this;
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() { },
        valueEq: !!valueEq, // if not provided, !!undefined evaluates to false
        last: initWatchVal
    };
    this.$$watchers.unshift(watcher);
    this.$root.$$lastDirtyWatch = null;
    return function() {
        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
            self.$root.$$lastDirtyWatch = null;
        }
    };
};

Scope.prototype.$$digestOnce = function() {
    var self = this;
    var dirty;
    var continueLoop = true;
    this.$$everyScope(function(scope) {
        var newValue, oldValue;
        _.forEachRight(scope.$$watchers, function(watcher) {
            try {
                if (watcher) { // watcher may have already been destroyed
                    newValue = watcher.watchFn(scope);
                    oldValue = watcher.last;
                    if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                        self.$root.$$lastDirtyWatch = watcher;
                        watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
                        watcher.listenerFn(
                            newValue, 
                            (oldValue === initWatchVal ? newValue : oldValue), 
                            scope
                        );
                        dirty = true;
                    } else if (self.$root.$$lastDirtyWatch === watcher) {
                        continueLoop = false;
                        // explicitly returning false in a _.forEach loop causes
                        // LoDash to short-circuit the loop and exit immediately
                        return false; 
                    }
                }
            } catch (e) {
                console.error(e);
            }
        });
        return continueLoop;
    })
    return dirty;
};

Scope.prototype.$digest = function() {
    var timeToLive = 10;
    var dirty;
    this.$root.$$lastDirtyWatch = null;
    this.$beginPhase('$digest');

    if(this.$root.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
        this.$$flushApplyAsync();
    }

    do {
        while (this.$$asyncQueue.length) {
            try {
                var asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } catch (e) {
                console.error(e);
            }
        }
        dirty = this.$$digestOnce();
        if ((dirty || this.$$asyncQueue.length) && !(timeToLive--)) {
            throw 'Digest cycle exceeded time-to-live';
        }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();

    while (this.$$postDigestQueue.length) {
        try {
            this.$$postDigestQueue.shift()();
        } catch (e) {
            console.error(e);
        }
    }
};

Scope.prototype.$$postDigest = function(fn) {
    this.$$postDigestQueue.push(fn);
};

Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue); // compare by value
    } else {
        return newValue === oldValue || // compare by reference
          ( typeof newValue === 'number' && typeof oldValue === 'number' &&
            isNaN(newValue) && isNaN(oldValue));
    }
};

Scope.prototype.$eval = function(expr, locals) {
    return expr(this, locals);
};

Scope.prototype.$apply = function(expr) {
    try {
        this.$beginPhase('$apply');
        return this.$eval(expr);
    } finally {
        this.$clearPhase();
        this.$root.$digest();
    }
};

Scope.prototype.$evalAsync = function(expr) {
    var self = this;
    if (!self.$$phase && !self.$$asyncQueue.length) {
        setTimeout(function() {
            if (self.$$asyncQueue.length) {
                self.$root.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({scope: this, expression: expr});
};

Scope.prototype.$applyAsync = function(expr) {
    var self = this;
    self.$$applyAsyncQueue.push(function() {
        self.$eval(expr);
    });
    if (self.$root.$$applyAsyncId === null) {
        self.$root.$$applyAsyncId = setTimeout(function() {
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }
};

Scope.prototype.$$flushApplyAsync = function() {
    while(this.$$applyAsyncQueue.length) {
        try {
            this.$$applyAsyncQueue.shift()();
        } catch (e) {
            console.error(e);
        }
    }
    this.$root.$$applyAsyncId = null;
};

Scope.prototype.$beginPhase = function(phase) {
    if (this.$$phase) {
        throw this.$$phase + ' already in progress.';
    }
    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function() {
    this.$$phase = null;
};

Scope.prototype.$watchGroup = function(watchFns, listenerFn) {
    var self = this;
    var newValues = new Array(watchFns.length);
    var oldValues = new Array(watchFns.length);
    var changeReactionScheduled = false;
    var firstRun = true;

    if (watchFns.length === 0) {
        var shouldCall = true;
        self.$evalAsync(function() {
            if (shouldCall) {
                listenerFn(newValues, newValues, self);
            }
        });
        return function() {
            shouldCall = false;
        };
    }

    function watchGroupListener() {
        if (firstRun) {
            firstRun = false;
            listenerFn(newValues, newValues, self);
        } else {
            listenerFn(newValues, oldValues, self);
        }
        changeReactionScheduled = false;
    }

    var destroyFunctions = _.map(watchFns, function(watchFn, i) {
        return self.$watch(watchFn, function(newValue, oldValue) {
            newValues[i] = newValue;
            oldValues[i] = oldValue;
            if (!changeReactionScheduled) {
                changeReactionScheduled = true;
                self.$evalAsync(watchGroupListener);
            }
        });
    });

    return function() {
        _.forEach(destroyFunctions, function(destroyFunction) {
            destroyFunction();
        });
    };

};

Scope.prototype.$$everyScope = function(fn) {
    if (fn(this)) {
        return this.$$children.every(function(child) {
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
}

module.exports = Scope;
