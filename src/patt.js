"use strict";

/* 
*/
function Row(clang, config, relay) {
    var row = {

        // Clock and output: 
        //      expected to supply go, halt, bump and setForm methods
        //      assigned with reader procedure, expected to produce output based on
        //          [dur, params] specification built from sequence aspects
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
                this.steps = options.steps || this.steps;
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
                this.len = options.len || this.len;
                // Extend sequence with blanks if lengthening.
                while (this.len > this.steps.length) {
                    this.steps.push(0);
                }
                // Otherwise, shorten seq.
                while (this.len < this.steps.length) {
                    this.steps.pop();
                }
                this.attacks = options.attacks || this.attacks;
            },
            assemble: function() {
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
            this.currentStepIdx += 1;
            if (this.currentStepIdx == this.seq.len) {
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
        
        // ??
        once: function(seq) {
            this.update({steps: seq});
            clang.getNext = function() {
                var item = seq.shift();
                return item ? [item[0], [item[1]]] : null;
            };
            clang.bump();
        },

        update: function(options) {

            if (util.type(options) == 'String') {
                console.log(options, arguments);
                //options = {arguments[0]: arguments[1]};
                console.log(options);
            }

            // XXX: if options.attackRatios
            // Update or create attack sequence.
            if (options.pace || options.len || ! this.seq.attacks.length) {
                this.pace = options.pace || this.pace;
                // XXX: stepTransforms.attacks
                options.attacks = this.patt.transforms.evenAttackSeq(
                    options.len || this.seq.len,
                    this.pace 
                ); 
            }
            // Wrap single-item step value for seq update.
            if (
                options.vals 
                && options.vals.length == 2 
                && util.type(options.vals[0] == 'Number')
            ) {
                options.vals = [options.vals];
            }
            // Dispatch seq update.
            this.seq.update(options);

            // Fix overflow - at the latest possible point.
            if (options.len && this.currentStepIdx >= options.len) {
                console.log('fix overflow');
                this.currentStepIdx = options.len - 1;
            }
            // Dispatch seq assembly.
            this.seq.assemble();

            // XXX: should do immediately if 'not playing'
            //if (options.tone && clang.playing) {
            if (options.tone) {
                relay && relay.subscribe('clang_end', function updateTone(data) {
                    clang.setForm(options.tone);
                    relay.unsubscribe('clang_end', updateTone);
                });
            }
            //} else if (options.tone) {
            //    clang.setForm(options.tone);
            //}

        }

    };

    // XXX: to Patt()
    var transforms = {
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
        clear: function(seq) {
            return seq.map(function() {
                return 0;
            });
        },
        randomBPM: function() {
            return parseInt(Math.random() * 500 + 150);
        },
        randomStepCount: function() {
            var len = Math.random() * 15 + 5;
            return parseInt(len);
        },
        //
        generateSteps: function(len, min, max, density, hook) {
        },
        generateStepSeq: function(length, minVal, maxVal, density, algorithm) {
            if (util.type(algorithm) == 'String') {
                var generator = this[algorithm];
            } else if (util.type(algorithm) == 'Function') {
                var generator = algorithm;
            } else if (! algorithm) { // Default
                var generator = function(idx) {
                    var randVal = parseInt(
                        Math.random() * (maxVal - minVal) + minVal
                    );
                    var note = (randVal % density) ? randVal : 0;
                    return parseInt(note);
                }.bind(this);
            }
            var stepSeq = [];

            console.log(arguments, algorithm, generator);

            // Apply generator routine to each step
            for (var i = 0; i < length; i++) {
                stepSeq[i] = generator(i);
            }

            return stepSeq;
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
            var seq = [len * (60 / pace)] // Zeroth == total, for looping
            for (var i = 1; i < len; i++) {
                seq.push(i * (60 / pace));
            }
            return seq;
        }
    };
    var schedulers = {
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
                if (! --counter) {
                    this.lookup_hook(hook)();
                    relay.unsubscribe(evt_name, caller);
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
            var hook_id = this.next_id++;
            var counter = count;
            var caller = function() {
                if (! --counter) {  // On the last ... .
                    //console.log(hook, this.lookup_hook(hook));
                    this.lookup_hook(hook)();   // Procedure or proc-reference.
                    if (limit && ! --limit) {   // If ... is next-to-last.
                        // Finish.
                        relay.unsubscribe(evt_name, caller);
                        relay.publish('stage_done', {
                            hook_id: hook_id,
                            evt_name: evt_name,
                            count: count,
                            limit: limit
                        });
                        completion && completion.call(null);
                    }
                    counter = count;    // Reset. 
                }
            }.bind(this);
            this.active[hook_id] = [evt_name, caller];
            relay.subscribe(evt_name, caller);
            return hook_id;
        },
        sequence: function(steps) {
            steps.forEach(function(step, idx) {
                this[step[0]].apply
            }.bind(this));
        },
        cancel: function(relay, hook_id) {
            if (hook_id in this.active) {
                var pair = this.active[hook_id];
                delete this.active[hook_id];
                relay.unsubscribe(pair[0], pair[1]);
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
                this.seq.update({
                    // XXX: 
                    steps: proc.apply(transforms, args)
                    //steps: proc(args)
                });
                this.seq.assemble();
            }.bind(row)
        })(transforms[key]);
    }
    var evt_keys = {
        // XXX: no clang_edge when silenced - see [..]
        beat: 'clang_edge',
        loop: 'loop_edge'
    };
    row.at = function(evt_key, count, hook) {
        var evt_name = evt_keys[evt_key];
        return schedulers.at.call(
            schedulers, relay, evt_name, count, hook
        );
    };
    row.every = function(evt_key, count, limit, hook) {
        // Optional limit argument.
        if (typeof limit == 'function' || typeof limit == 'string' && hook == undefined) {
            hook = limit;
            limit = 0;
        }
        var evt_name = evt_keys[evt_key];
        return schedulers.every.call(
            schedulers, relay, evt_name, count, limit, hook
        );
    };
    row.cancel = function(hook_id) {
        return schedulers.cancel.call(schedulers, relay, hook_id);
    };

    row.patt = {
        transforms: transforms,
        schedulers: schedulers
    };


    // XXX: 
    var freqTable = row.patt.transforms.buildEvenFreqTable({
        minNote: 0,
        
        //maxNote: 200,//46,
        maxNote: 46,
        //maxNote: 26,
        //maxNote: 16,

        baseFreq: 55,

        //octaveDivisions: 42//512//96//48//9//7//12 
        octaveDivisions: 12 
        //octaveDivisions: 7//12 
        //octaveDivisions: 5//12 
        //octaveDivisions: 3//12 
    
    });
    row.update({
        transforms: {
            hz: function(step) {
                return freqTable[step]; 
            }
        }
    });

    //
    clang.reader = row.read.bind(row);

    return row;
}

function Patt(config, data, source) {

    var transforms = {
    
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
    
        // XXX: inverse, retrograde, ..., permute(f), ...

        //
        clear: function(seq) {
            return seq.map(function() {
                return 0;
            });
        },
    
        randomBPM: function() {
            return parseInt(Math.random() * 500 + 150);
        },
        randomStepCount: function() {
            var len = Math.random() * 15 + 5;
            return parseInt(len);
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

        //
        generateSteps: function(len, min, max, density, hook) {
        },
        generateStepSeq: function(length, minVal, maxVal, density, algorithm) {
            if (util.type(algorithm) == 'String') {
                var generator = this[algorithm];
            } else if (util.type(algorithm) == 'Function') {
                var generator = algorithm;
            } else if (! algorithm) { // Default
                var generator = function(idx) {
                    var randVal = parseInt(
                        Math.random() * (maxVal - minVal) + minVal
                    );
                    var note = (randVal % density) ? randVal : 0;
                    return parseInt(note);
                }.bind(this);
            }
            var stepSeq = [];

            console.log(arguments, algorithm, generator);

            // Apply generator routine to each step
            for (var i = 0; i < length; i++) {
                stepSeq[i] = generator(i);
            }

            return stepSeq;
        },

        // XXX: cull
        hzFromStepSeq: function() {
            return this.stepSeq.map(function(stepVal, idx) {
                return this.freqTable[stepVal];
            }.bind(this));
        },
        evenAttackSeq: function(len, pace) {
            var seq = [len * (60 / pace)] // Zeroth == total, for looping
            for (var i = 1; i < len; i++) {
                seq.push(i * (60 / pace));
            }
            return seq;
        }

    };

    var schedulers = {

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
                if (! --counter) {
                    this.lookup_hook(hook)();
                    relay.unsubscribe(evt_name, caller);
                    relay.publish('stage_done', {
                        hook_id: hook_id,
                        evt_name: evt_name,
                        count: count
                    });
                    completion.call(null);  // To clarify: expectedly unbound.
                }
            }.bind(this);
            this.active[hook_id] = [evt_name, caller];
            relay.subscribe(evt_name, caller); 
            return hook_id;
        },
        
        every: function(relay, evt_name, count, limit, hook, completion) {
            var hook_id = this.next_id++;
            var counter = count;
            var caller = function() {
                if (! --counter) {  // On the last ... .
                    this.lookup_hook(hook)();   // Procedure or proc-reference.
                    if (limit && ! --limit) {   // If ... is next-to-last.
                        // Finish.
                        relay.unsubscribe(evt_name, caller);
                        relay.publish('stage_done', {
                            hook_id: hook_id,
                            evt_name: evt_name,
                            count: count,
                            limit: limit
                        });
                        completion.call(null);  // To clarify: expectedly unbound.
                    }
                    counter = count;    // Reset. 
                }
            }.bind(this);
            this.active[hook_id] = [evt_name, caller];
            relay.subscribe(evt_name, caller);
            return hook_id;
        },
        
        sequence: function(steps) {
            steps.forEach(function(step, idx) {
                this[step[0]].apply
            }.bind(this));
        },
        
        cancel: function(relay, hook_id) {
            if (hook_id in this.active) {
                var pair = this.active[hook_id];
                delete this.active[hook_id];
                relay.unsubscribe(pair[0], pair[1]);
                return pair[1];
            }
            return false;
        }

    };

    var patt = {
        schedulers: schedulers,
        transforms: transforms
    };
    return patt;
}
