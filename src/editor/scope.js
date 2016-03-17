// http://teropa.info/blog/2013/11/03/make-your-own-angular-part-1-scopes-and-digest.html

export default var rootScope = new Scope();

export function Scope() {
    this.$$watchers = [];
    this.$$asyncQueue = [];
    this.$$phase = null;
}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
    var self = this;
    if (typeof watchFn == 'string') {
        var s = watchFn;
        watchFn = function(scope) {
            var parts = s.split('.');
            var v = scope;
            do {
                v = v[parts.shift()];
            } while(typeof v != 'undefined' && parts.length);
            return v;
        }
    }
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() { },
        valueEq: !!valueEq
    };
    self.$$watchers.push(watcher);
    return function() {
        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
        }
    };
};

Scope.prototype.$$digestOnce = function() {
    var self = this;
    var dirty;
    this.$$watchers.forEach(function(watch) {
        try {
            var newValue = watch.watchFn(self);
            var oldValue = watch.last;
            var isEqual = newValue === oldValue ||
                (typeof newValue === 'number' && typeof oldValue === 'number' &&
                isNaN(newValue) && isNaN(oldValue));
            if (!isEqual) {
                watch.listenerFn(newValue, oldValue, self);
                dirty = true;
                watch.last = newValue;
            }
        } catch (e) {
            (console.error || console.log)(e);
        }
    });
    return dirty;
};

Scope.prototype.$digest = function() {
    var ttl = maxTTL = 10;
    var dirty;
    this.$beginPhase("$digest");
    do {
        while (this.$$asyncQueue.length) {
            try {
                var asyncTask = this.$$asyncQueue.shift();
                this.$eval(asyncTask.expression);
            } catch (e) {
                (console.error || console.log)(e);
            }
        }
        dirty = this.$$digestOnce();
        if (dirty && !(ttl--)) {
            this.$clearPhase();
            throw maxTTL + " digest iterations reached";
        }
    } while (dirty);
    this.$clearPhase();
};


Scope.prototype.$eval = function(expr, locals) {
    return expr(this, locals);
};

Scope.prototype.$evalAsync = function(expr) {
    var self = this;
    if (!self.$$phase && !self.$$asyncQueue.length) {
        setTimeout(function() {
            if (self.$$asyncQueue.length) {
                self.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({scope: this, expression: expr});
};

Scope.prototype.$apply = function(expr) {
    try {
        this.$beginPhase("$apply");
        return this.$eval(expr);
    } finally {
        this.$clearPhase();
        this.$digest();
    }
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
