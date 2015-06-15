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
            // XXX: ? use/check hasOwnProperty ?
            queue[evtKey] || (queue[evtKey] = []);
            queue[evtKey].push(callback);
            // XXX: or assume, eg, dbg=console.log.bind(console)
            (this.dbg.mode & this.dbgModes.DBG_SUB) && this.dbg.proc.call(
                this.dbg,
                'subscribe: key, idx, name, callback:', 
                evtKey, (queue[evtKey].length - 1), callback.name, callback,
                '| sub.this:', this
            );
        };
        
        // XXX: ? this can't unsub anonymous f() ? see js f == f
        // - return unsub from sub
        // - use queue[evtKey].push([f.toString, f])
        // - return idx from sub
        pub.unsubscribe = pub.unsubscribe || function(evtKey, callback) {
            // XXX: should expect bool true or string command to clear all
            if (! callback) {
                // Unsubscribe /everything/ from evtKey if no callback specified.
                delete queue[evtKey];
            } else {
                for (var idx in queue[evtKey]) {
                    // XXX: 
                    //if (queue[evtKey][idx] == callback) {
                    //if (queue[evtKey][idx].toString() == callback.toString()) {
                    if (queue[evtKey][idx] == callback) {
                        // XXX: use [].splice
                        delete queue[evtKey][idx];
                        (this.dbg.mode & this.dbgModes.DBG_UNSUB) && this.dbg.proc.call(
                            this.dbg,
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
            //return;
            // XXX: ? s/proc/callback | s/callback/proc ?
            queue[evtKey] && queue[evtKey].forEach(function(proc, idx) {
                //proc(data);
                //console.log(proc, this.dbg.mode, this.dbgModes.DBG_PUB);
                try {
                    //console.log(proc, typeof proc, data);
                    proc(data);
                } catch(e) {
                    console.log(e.stack);
                }
                (this.dbg.mode & this.dbgModes.DBG_PUB) && this.dbg.proc.call(
                    this.dbg,
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
