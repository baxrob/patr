/* Li'l pubSub
 * http://blandhand.net
 * Copyright 2013, RL Baxter; Licensed GPLv3
 * 
 * Creates a global observer pattern attachable to arbitrary objects. With a
 * borderline pathalogical concern for overriding extant methods. Intended to be
 * used in a singleton pattern, enforcement of this principle is left to the
 * developer.
 *
 */

(function(global) {
    // XXX: s/pub/parentObj
    global.Publisher = function(pub, dbg) { 
        //console.log('pub.this', this);

        pub = pub || {};
        var queue = {};

        pub.dbg = dbg || {
            mode: 0,
            proc: function() { console.log(arguments); } 
        };//function() {};

        pub.dbgModes = {
            DBG_PUB: 2,
            DBG_SUB: 4,
            DBG_UNSUB: 8
        };

        pub.subscribe = pub.subscribe || function(evtKey, callback) {
            queue[evtKey] || (queue[evtKey] = []);
            queue[evtKey].push(callback);
            // XXX: or assume, eg, dbg=console.log.bind(console)
            (this.dbg.mode & this.dbgModes.DBG_SUB) && this.dbg.proc.call(this.dbg,
                'subscribe: key, idx, name, callback:', 
                evtKey, (queue[evtKey].length - 1), callback.name, callback,
                '| sub.this:', this
            );
        };
        
        pub.unsubscribe = pub.unsubscribe || function(evtKey, callback) {
            if (! callback) {
                // Unsubscribe /everything/ from evtKey if no callback specified.
                delete queue[evtKey];
            } else {
                for (var idx in queue[evtKey]) {
                    // XXX: 
                    //if (queue[evtKey][idx] == callback) {
                    //if (queue[evtKey][idx].toString() == callback.toString()) {
                    if (queue[evtKey][idx] == callback) {
                        delete queue[evtKey][idx];
                        (this.dbg.mode & this.dbgModes.DBG_UNSUB) && this.dbg.call(this.dbg,
                            'unsubscribe: key, idx, name, callback:', 
                            evtKey, idx, callback.name, callback
                            //,
                            //'compare callbacck/queue_proc vx ..toString()',
                            //queue[evtKey][idx].toString(), 
                            //queue[evtKey][idx],// == callback.toString(),
                            //queue[evtKey][idx] == callback
                        );
                    }
                }
            }
        };
        
        pub.publish = pub.publish || function(evtKey, data) {
            // XXX: ? s/proc/callback | s/callback/proc ?
            queue[evtKey] && queue[evtKey].forEach(function(proc, idx) {
                proc(data);
                (this.dbg.mode & this.dgbModes.DBG_PUB) && this.dbg.call(this.dbg,
                    'publish: key, name, proc, data:', 
                    evtKey, proc.name, proc.toString(), data
                );
                // XXX: analyse, verify, explain impacts
                //proc.call(null, data);
                //proc.apply(null, data);
            }.bind(this));
        };
        pub.dumpQueue = pub.dumpQueue || function() {
            return queue;
        };
        return pub;
    };
})(this);
