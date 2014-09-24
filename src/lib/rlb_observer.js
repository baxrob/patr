
/* jQuery Tiny Pub/Sub - v0.7 - 10/27/2011
 * http://benalman.com/
 * Copyright (c) 2011 "Cowboy" Ben Alman; Licensed MIT, GPL */
/* 
(function($) {
 
  var o = $({});
 
  $.subscribe = function() {
    o.on.apply(o, arguments);
  };
 
  $.unsubscribe = function() {
    o.off.apply(o, arguments);
  };
 
  $.publish = function() {
    o.trigger.apply(o, arguments);
  };
 
}(jQuery));
*/

/*
(function(target) {
    var queue = {};
    target.add = function(evtPath, callback) {
        (function initPath(queue, evtKeys) {
            var thisKey = path.shift();
            console.log(thisKey, path);
            // FIXME:
            if (! path.length) {
                queue[thisKey] || (queue[thisKey] = []);
                queue[thisKey].push(callback); 
            } else {
                queue[thisKey] || (queue[thisKey] = {});
                initPath(queue[thisKey], path); 
            }
        })(queue, evtPath.split(/\./));
    };
    target.del = function(evtPath, callback) {

    };
    target.run = function(evtPath) {
    };
    target.q = queue;
 
}(this));
*/

(function(global) {
    global.Publisher = function(pub) { 
        pub = pub || {};
        var queue = {};
        pub.subscribe = pub.subscribe || function(evtKey, callback) {
            queue[evtKey] || (queue[evtKey] = []);
            queue[evtKey].push(callback);
        };
        pub.unsubscribe = pub.unsubscribe || function(evtKey, callback) {
            if (! callback) {
                delete queue[evtKey];
            } else {
                for (var idx in queue[evtKey]) {
                    // FIXME
                    if (queue[evtKey][idx].toString() == callback.toString()) {
                        delete queue[evtKey][idx];
                    }
                }
            }
        };
        pub.publish = pub.publish || function(evtKey, data) {
            queue[evtKey] && queue[evtKey].forEach(function(proc, idx) {
                //console.log('pub', evtKey, data, proc);
                //proc.call(null, data);
                proc(data);
                //proc.apply(null, data);
            });
        };
        pub.dumpQueue = pub.dumpQueue || function() {
            return queue;
        };
        return pub;
    };
})(this);
