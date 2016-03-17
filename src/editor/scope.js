// http://teropa.info/blog/2013/11/03/make-your-own-angular-part-1-scopes-and-digest.html
export default function Scope() {
    this.$$watchers = [];
}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() { },
        valueEq: !!valueEq
    };
    this.$$watchers.push(watcher);
};

Scope.prototype.$$digestOnce = function() {
    var self = this;
    var dirty;
    this.$$watchers.forEach(function(watch) {
        var newValue = watch.watchFn(self);
        var oldValue = watch.last;
        if (newValue !== oldValue) {
            watch.listenerFn(newValue, oldValue, self);
            dirty = true;
            watch.last = newValue;
        }
    });
    return dirty;
};

Scope.prototype.$digest = function() {
    var ttl = maxTTL = 10;
    var dirty;
    do {
        dirty = this.$$digestOnce();
        if (dirty && !(ttl--)) {
            throw maxTTL + " digest iterations reached";
        }
    } while (dirty);
};
