"use strict";

// XXX: no patt.sched/seq can be deterministic without re-setting seq idx
//      should reset seqIdx on ??? by flag?
//      -- row.update('step', n)

/* 
*/
function Row(clang, config, relay) {
    var row = {

        // Clock and output: 
        //      expected to supply go, halt, bump and setForm methods
        //      assigned with a reader procedure, and expected to produce output 
        //      based on [dur, params] specification built from sequence aspects
        clang: clang,
        
        // XXX: ? when pace == 0 ?
        pace: config.pace || 0,
        currentStepIdx: config['goto'] || 0,
        loop: config.loop || false,
        tone: config.tone || 'sine',

        seq: {

            steps: config.steps || [],
            stepTransforms: config.transforms || {},
            // XXX: ! not working with no config.len !?
            len: config.len || (config.steps ? config.steps.len : 0),
            // XXX: note coupling with 'clang' abstraction naming
            clangParams: [],
            attacks: config.attacks || [],
            clangTimes: [],
            
            update: function(options) {
                options.steps && (this.steps = options.steps.slice());
                this.steps = options.steps || this.steps;
                //console.log(this.steps, this.steps.length);
                if (options.vals) {
                    options.vals.forEach(function(pair) {
                        // Ignore out-of-range assignments.
                        if (pair[0] < this.steps.length) {
                            this.steps[pair[0]] = pair[1];
                        }
                    }.bind(this));
                }
                this.stepTransforms = options.transforms || this.stepTransforms;
                // XXX: options.len || this.steps.length || this.len;
                // ??
                this.len = options.len || this.steps.length || this.len;
                //console.log(options.len, this.len);
                // Extend sequence with blanks if lengthening.
                while (this.len > this.steps.length) {
                    this.steps.push(0);
                }
                // XXX:
                // Otherwise, shorten seq.
                while (this.len < this.steps.length) {
                    this.steps.pop();
                }
                // XXX: 
                this.attacks = options.attacks || this.attacks;

                // XXX:
                //this.attacks.splice(this.len);
                relay.publish('seq_updated', {
                    options: options,
                    row: row
                });
            },
            assemble: function() {
                //console.log(this.steps);
                this.clangParams = [];
                this.steps.forEach(function(step, idx) {
                    this.clangParams[idx] = {
                        idx: idx,
                        time: this.attacks[idx],
                        //value: this.stepTransform(step),
                        ratio: idx / this.steps.length
                    };
                    for (var key in this.stepTransforms) {
                        this.clangParams[idx][key] 
                            = this.stepTransforms[key](step);
                    }
                }.bind(this));
                this.clangTimes = this.attacks.map(function(stepTime, idx) {
                    return [stepTime, this.clangParams[idx]];
                }.bind(this));
            }

        },
        
        go: clang.go.bind(clang),
        
        halt: clang.halt.bind(clang),
        
        //
        once: function(seq) {
            seq = seq || this.seq.steps;
            console.log('once', this);
            //this.halt();
            this.reset();
            this.update('steps', seq);
            var end = function(data) {
                relay.unsubscribe('loop_edge', end);
                console.log('end', this, this.halt);
                this.halt();
            }.bind(this);
            relay.subscribe('loop_edge', end);
            this.go();
        },

        reset: function() {
            this.currentStepIdx = 0;
        },

        read: function() {
            //
            var currentStep = this.seq.clangTimes[this.currentStepIdx];
            var nextStep = this.seq.clangTimes[this.getNextStepIdx()];
            //console.log(currentStep, nextStep);

            if (currentStep && nextStep) {
                var clangLen = (nextStep[0] > currentStep[0])
                    ? nextStep[0] - currentStep[0]
                    : nextStep[0]; // First step case.
                clangTime = [clangLen, currentStep[1]];
            } else {
                var clangTime = null;
            }

            // XXX: note loop_edge can't report processorNode playbackTime from here
            //      but there will (always?) be a corresponding clang_edge
            this.currentStepIdx += 1;
            if (this.currentStepIdx == this.seq.len) {
                // XXX: 'loop_onset'
                relay.publish('loop_edge', {
                    currentStepIdx: this.currentStepIdx,
                    contextTime: this.clang.context.currentTime
                });
                this.currentStepIdx = 0;
            }
            return clangTime;
        },

        getNextStepIdx: function() {
            // Allow reading first step from final, non-looping step, 
            // then signal that sequence has ended.
            if (
                this.currentStepIdx == (this.seq.len - 1) 
                && ! this.loop
            ) {
                return null;
            }
            return (this.currentStepIdx + 1) % this.seq.len;
        },

        'goto': function(step) {
            this.currentStepIdx = step % this.seq.len;
        },

        // XXX:
        broadcast: function(evtName, inputData) {
            var evtData = {
                //stage_done
            }; 
            var data = evtName in evtData ? evtData[evtName] : {};
            for (var key in inputData) {
                data[key] = inputData[key];
            }
            return data; 
        },

        update: function(options) {

            if (util.type(options) == 'String' && arguments.length == 2) {
                options = {};
                options[arguments[0]] = arguments[1];
            }

            // Wrap single-item step value for seq update.
            if (
                options.vals 
                && options.vals.length == 2 
                && util.type(options.vals[0] == 'Number')
            ) {
                options.vals = [options.vals];
            }

            // XXX: if options.attackRatios
            // Update or create attack sequence.
            if (
                options.pace
                || options.len
                //|| this.seq.attacks.length != this.seq.steps.length
                || options.steps
            ) {
                //console.log('updy att', options.len, options.steps.length, this.seq.len, this.seq.steps.length);
                this.pace = options.pace || this.pace;
                // XXX: stepTransforms.attacks
                //console.log(options.len, this.seq.len, this.seq.steps.length);
                // XXX: 
                options.attacks = this.patt.transforms.evenAttackSeq(
                    options.len || (options.steps && options.steps.length)
                        || this.seq.len,
                    this.pace 
                ); 
            }

            // Dispatch seq update.
            this.seq.update(options);

            // Fix overflow - at the latest possible point.
            if (options.len && this.currentStepIdx >= options.len) {
                console.log('fix overflow');
                //this.currentStepIdx = options.len - 1;
                this.currentStepIdx = 0;//options.len - 1;
            }
            // Dispatch seq assembly.
            this.seq.assemble();

            // XXX: should do immediately if 'not playing'
            //if (options.tone && clang.playing) {
            if (options.tone) {
                relay && relay.subscribe('clang_edge', function updateTone(data) {
                    //console.log('tone update hook', options.tone);
                    clang.setForm(options.tone);
                    relay.unsubscribe('clang_edge', updateTone);
                });
            }
            //} else if (options.tone) {
            //    clang.setForm(options.tone);
            //}

        }

    }; // row

    // XXX: to Patt()
    var transforms = {

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
        },

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
            if (util.type(hook) == 'String') {
                var generator = this[hook];
            } else if (util.type(hook) == 'Function') {
                var generator = hook;
            } else if (! hook) { // Default
                var generator = function(idx) {
                    var randVal = parseInt(
                        Math.random() * (max - min) + min
                    );
                    // XXX:
                    var note = (idx % density) ? randVal : 0;
                    //var note = (randVal % density) ? randVal : 0;
                    return parseInt(note);
                }.bind(this);
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
        // XXX: cull
        hzFromStepSeq: function() {
            return this.stepSeq.map(function(stepVal, idx) {
                return this.freqTable[stepVal];
            }.bind(this));
        },
        evenAttackSeq: function(len, pace) {
            //console.log('gen attacks: len, pace:', len, pace);
            var seq = [len * (60 / pace)] // Zeroth == total, for looping
            for (var i = 1; i < len; i++) {
                seq.push(i * (60 / pace));
            }
            return seq;
        }
    };
    var schedulers = {
        
        // (proper) Schedulers.

        // XXX: next/active mechanism should re-use ids
        next_id: 0,
        active: {},
        lookup_hook: function(hook) {
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
            relay.subscribe(evt_name, caller);
            return hook_id;
        },

        // Sequencers.
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
                var cmd = stage[0];
                var args = stage[1];
                args = args.map(function(arg) {
                    //console.log(util.type(arg));
                    if (util.type(arg) == 'Array') {
                        return function() {
                            //console.log(row[arg[0]], arg[1]);
                            row[arg[0]].apply(row, arg[1]);
                        }.bind(this);
                    } else {
                        return arg;
                    }
                });
                //console.log(row[cmd], args);
                //console.log('runStage', hook_id);
                //this.chainHookId = hook_id = row[cmd].apply(row, args);

                // XXX:
                row.patt.schedulers.chainHookId = hook_id 
                    = row[cmd].apply(row, args);
                
                counter += 1;
            };
            relay.subscribe('stage_done', function done(data) {
                //console.log(data.hook_id, hook_id, this);
                if (data.hook_id == hook_id) {
                    if (counter == stages.length && once) {
                        relay.unsubscribe('stage_done', done);
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
    };


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
    //clang.reader = row.read.bind(row);
    clang.updateReader(row.read.bind(row));
    clang.connect();

    return row;
}



// ##########################################################################

// XXX:
//function Patt(options, source, relay) {
function Patt(config, data, source) {
    var patt = {
        schedulers: schedulers,
        transforms: transforms
    };
    return patt;
}
