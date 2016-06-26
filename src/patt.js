"use strict";

// XXX:
//      Add manual history tracking, coordinate-able with IX back/pageLeave and
//      fwd/pageLoad branching notification/confirm and display-ability (via
//      arbitrary data representation), by means of cookie, lStorage, etc




// ##########################################################################

// XXX:
//function Patt(options, source, relay) {
function Patt(target, config, relay) {

    function init() {
        console.log(this);
        for (var procName in this.transforms.morph) {
            var proc = this.transforms.morph[procName];

        }
    }

    /*
    // Initialize.

    //
    for (var key in transforms) {
        row[key] = (function(proc) { // Loop closure.
            return function() {
                //
                var args = Array.prototype.slice.call(arguments);
                args.unshift(this.seq.steps);
                // Call seq.update/assemble directly, since we aren't changing
                //  other seq params.
                this.seq.update({
                    // XXX: 
                    steps: proc.apply(transforms, args)
                    //steps: proc(args)
                });
                this.seq.assemble();
            }.bind(row)
        })(transforms[key]);
    }
    row.invert = function() {
        this.seq.update({
            steps: transforms.invert(
                this.seq.steps, config.stepMin, config.stepMax
            )
            //steps: transforms.invert.bind(transforms)(this.seq.steps, 0, 46)
        });
        this.seq.assemble();
    }.bind(row);

    row.regen = function(len, min, max, density) {
        len = len || this.seq.len;
        min = min || config.stepMin;
        max = max || config.stepMax;
        density = density || 4; 
        this.seq.update({
            steps: transforms.generateSteps(len, min, max, density)
        });
        this.seq.assemble();
    }.bind(row);

    var evt_keys = {
        // XXX: no clang_edge when silenced - see [..]
        beat: 'clang_edge',
        loop: 'loop_edge'
    };
    row.at = function(evt_key, count, hook, completion) {
        var evt_name = evt_keys[evt_key];
        //console.log('row.at', evt_name, evt_key, count, hook, completion);
        return schedulers.at.call(
            schedulers, relay, evt_name, count, hook, completion
        );
    };
    //row.every = function(evt_key, count, limit, hook, completion) {
    row.every = function(evt_key, count, limit, hook, completion) {
        //console.log(evt_key, count, limit);
        // Optional limit argument.
        if (typeof limit == 'function' || typeof limit == 'string' && hook == undefined) {
            hook = limit;
            limit = 0;
        }
        var evt_name = evt_keys[evt_key];
        return schedulers.every.call(
            schedulers, relay, evt_name, count, limit, hook, completion
        );
    };
    row.chain = schedulers.chain;
    row.cancel = function(hook_id) {
        return schedulers.cancel.call(schedulers, relay, hook_id);
    };

    row.patt = {
        transforms: transforms,
        schedulers: schedulers
    };
    */


    // XXX: 
    var freqTable = row.patt.transforms.buildEvenFreqTable({
        //minNote: 0,
        minNote: config.stepMin || 0,
        
        //maxNote: 200,//46,
        //maxNote: 46,
        maxNote: config.stepMax || 46,
        //maxNote: 26,
        //maxNote: 16,

        //baseFreq: 55,
        baseFreq: config.minFreq || 55,

        //octaveDivisions: 42//512//96//48//9//7//12 
        
        //octaveDivisions: 12 
        octaveDivisions: config.octaveDivs || 12,

        //octaveDivisions: 7//12 
        //octaveDivisions: 5//12 
        //octaveDivisions: 3//12 
    
    });
    //console.log(freqTable);
    row.update({
        transforms: {
            hz: function(step) {
                return freqTable[step]; 
            }
        }
    });

    //
    clang.reader = row.read.bind(row);



    // XXX: to Patt()
    var transforms = {

        morph: {
            // Morphings.
            map: function(seq, proc) {
                return seq.map(proc); 
            },
            sort: function(seq, proc) {
                return seq.slice().sort(proc);
            },
            reorder: function(seq, proc) {
                proc = proc || function() {
                    return 0.5 - Math.random();
                };
                return this.sort(seq, proc);
            },
            reverse: function(seq) {
                return seq.reverse();
            },
            invert: function(seq, min, max) {
                // XXX: 0 should invert to 0, not 46
                min = window.min || 1;
                max = window.max || max;
                //console.log(min, max, max - min);
                return this.map(seq, function(step, idx) {
                    //
                    //if (step == 0) return step;
                    //var minDiff = step - min;
                    //var maxDiff = max - step;
                    //
                    var minDiff = step < min ? step : step - min;
                    var maxDiff = step < min ? step : max - step;
                    //console.log(step, idx, minDiff, maxDiff, max, min, max - min);
                    return minDiff < maxDiff ? max - minDiff
                        : minDiff > maxDiff ? min + maxDiff : step;    
                });
            },
            rotate: function(seq, n) {
                n = n || 1;
                return this.map(seq, function(step, idx, seq) {
                    // Note: negative modulus bug
                    var len = seq.length;
                    var rotIdx = (((idx + n) % len) + len) % len;
                    //console.log(idx, n, rotIdx);
                    return seq[rotIdx];
                });

            },

            clear: function(seq) {
                return seq.map(function() {
                    return 0;
                });
            }
        }, // morph

        generate: {

            // Generators.
            randomBPM: function() {
                return parseInt(Math.random() * 500 + 150);
            },
            randomStepCount: function() {
                var len = Math.random() * 15 + 5;
                return parseInt(len);
            },
            //
            // density: 
            generateSteps: function(len, min, max, density, hook) {
                // XXX: foo
                if (util.type(hook) == 'String') {
                    var generator = this[hook];
                } else if (util.type(hook) == 'Function') {
                    var generator = hook;
                } else if (! hook) { // Default
                    var generator = function(idx) {
                        var randVal = parseInt(
                            Math.random() * (max - min) + min
                        );
                        //) + 1;

                        // XXX:
                        var note = (idx % density) ? randVal : 0;
                        //var note = (randVal % density) ? randVal : 0;
                        return parseInt(note);
                    }.bind(this); // XXX:
                }
                var steps = [];

                // Apply generator routine to each step
                for (var i = 0; i < len; i++) {
                    steps[i] = generator(i);
                }

                return steps;
            },
            buildEvenFreqTable: function(options) {
                var freqTable = [0];
                var min = options.minNote,
                    max = options.maxNote,
                    base = options.baseFreq,
                    div = options.octaveDivisions;
                for (var i = min; i < max; i++) {
                    freqTable.push(base * Math.pow(2, (i / div)));
                }
                return freqTable;
            },
            evenAttackSeq: function(len, pace) {
                //console.log('gen attacks: len, pace:', len, pace);
                var seq = [len * (60 / pace)] // Zeroth == total, for looping
                for (var i = 1; i < len; i++) {
                    seq.push(i * (60 / pace));
                }
                return seq;
            }
        } // generate
    }; // transforms

    var automations = {

        schedule: {
            
            // (proper) Schedulers.

            // XXX: next/active mechanism should re-use ids
            next_id: 0,
            active: {},
            lookup_hook: function(hook) {
 
                // XXX: explicit reference
                var proc = (hook in transforms) ? row[hook].bind(row) : 
                    (util.type(hook) == 'Function') ? hook : null;
                return proc
            },
            // XXX: at(relay, evt_name, count, proc, done_proc)
            // XXX: at(relay, evt_name, count, expedient, when_done)
            // XXX: at(relay, evt_name, count, expedient, completion)
            at: function(relay, evt_name, count, hook, completion) {
                var hook_id = this.next_id++; 
                var counter = count;
                var caller = function() {
                    if (! --counter) {  // On the target [evt_name] occurrence.
                        this.lookup_hook(hook)();   // Procedure or proc-reference call.
                        //console.log('cancel in at', hook_id, this);
                        //relay.unsubscribe(evt_name, caller);
                        this.cancel(relay, hook_id);
                        relay.publish('stage_done', {
                            hook_id: hook_id,
                            evt_name: evt_name,
                            count: count
                        });
                        completion && completion.call(null);
                    }
                }.bind(this);
                this.active[hook_id] = [evt_name, caller];

                // XXX: explicit reference
                relay.subscribe(evt_name, caller); 
                return hook_id;
            },
            every: function(relay, evt_name, count, limit, hook, completion) {
                // XXX: 
                /*
                var data = {
                    stage_step: [hook_id, evt_name, count, limit, @counter],
                    stage_done: [hook_id, evt_name, count, limit],
                    hook_id: this.next_id++,
                    evt_name: evt_name,
                    count: count,
                    limit: limit
                };
                */
                var hook_id = this.next_id++;
                var counter = count;
                var caller = function() {
                    if (! --counter) {
                        // XXX: ? relay/broadcast these ?
                        //console.log(hook);
                        this.lookup_hook(hook)();
                        if (limit && ! --limit) {   // Final repitition.
                            relay.unsubscribe(evt_name, caller);
                            this.cancel(hook_id);
                            relay.publish('stage_done', {
                                hook_id: hook_id,
                                evt_name: evt_name,
                                count: count,
                                limit: limit
                            });
                            completion && completion.call(null);
                        }
                        // XXX: else { 
                        counter = count;    // Reset. 
                    }
                }.bind(this);
                //this.active[data.hook_id] = [evt_name, caller];
                this.active[hook_id] = [evt_name, caller];

                // XXX: explicit reference
                relay.subscribe(evt_name, caller);
                return hook_id;
            },

            cancel: function(relay, hook_id) {
                //console.log('row.cancel', hook_id, this.active[hook_id]);
                if (hook_id in this.active) {
                    var pair = this.active[hook_id];
                    relay.unsubscribe(pair[0], pair[1]);
                    delete this.active[hook_id];
                    //console.log('deleted?', this.active[hook_id]);
                    // XXX: ?
                    // return true;
                    return pair[1];
                }
                return false;
            }

        }, // schedule

        sequence: {
            cycle: function(stages) {
            },

            chainHookId: null,
            chain: function(stages, once, completion) {
                // Assumes no non-ending stages.
                // XXX: enforce this - reject, throw, or force single 'every'
                var hook_id = null;
                var counter = 0;
                function runStage() {
                    var stage = stages[counter % stages.length];
                    console.log('stage', stage);
                    var cmd = stage[0];
                    var args = stage[1];
                    var parsedArgs = args.map(function(arg) {
                        if (util.type(arg) == 'Array') {
                            return function() {
                                row[arg[0]].apply(row, arg[1]);
                            }.bind(this);
                        } else {
                            return arg;
                        }
                    });
                    console.log(cmd, parsedArgs);

                    // XXX: explicit reference
                    row.patt.schedulers.chainHookId = hook_id 
                        = row[cmd].apply(row, parsedArgs);

                    counter += 1;
                };
                
                // Catch and continue chain on signal from row at/each methods. 
                relay.subscribe('stage_done', function(data) {
                    if (data.hook_id == hook_id) {
                        if (counter == stages.length && once) {
                            relay.publish('chain_done');
                        } else {
                            runStage();
                        }
                    }
                });
                runStage();
                //return hook_id;
                /*
                return (function runStages(stages) {
                    return (function runStage(stage, idx) {
                        var cmd = stage[0];
                        var args = stage[1];
                        // transform args:
                        // args.forEach(function(arg, idx) {
                        // });
                        this[cmd].apply(this, args);
                    }.bind(this))(stages[0], 0);
                }.bind(this))(stages);
                */
            },

            ordering: function(steps) {
            },
            timeline: function(data) {
            },

            cancel: function(relay, hook_id) {
                //console.log('row.cancel', hook_id, this.active[hook_id]);
                if (hook_id in this.active) {
                    var pair = this.active[hook_id];
                    relay.unsubscribe(pair[0], pair[1]);
                    delete this.active[hook_id];
                    //console.log('deleted?', this.active[hook_id]);
                    // XXX: ?
                    // return true;
                    return pair[1];
                }
                return false;
            }
        } // sequence
    }; // automations

    var patt = {
        init: init,
        transforms: transforms,
        automations: automations
    };

    var instance = Object.create(patt);
    instance.init(config, data, source);

    return instance;
}
