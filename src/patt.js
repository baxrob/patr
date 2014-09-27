"use strict";

// XXX: clang should be an optional arg ? but it's the clock; or we'd need some other? to go/stop
function Row(clang, config, relay) {
    var row = {

        //
        clang: clang,
        
        // XXX: ? to Patt ?
        pace: config.pace || 0,
        currentStep: config['goto'] || 0,
        loop: config.loop || false,
        tone: config.tone || 'sine',

        seq: {
            steps: config.steps || [],
            stepTransform: config.transform || function(step) { return step; },
            len: config.len || (config.steps ? config.steps.len : 0),
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
                this.stepTransform = options.transform || this.stepTransform;
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
                    this.clangParams[idx] = this.stepTransform(step);
                }.bind(this));
                this.clangTimes = this.attacks.map(function(step, idx) {
                    return [step, this.clangParams[idx]];
                }.bind(this));
            }
        },
        
        go: clang.go.bind(clang),
        
        stop: clang.stop.bind(clang),

        read: function() {
            var currentStep = this.seq.clangTimes[this.currentStep];
            var nextStep = this.seq.clangTimes[this.nextStep()];

            if (currentStep && nextStep) {
                var clangLen = (nextStep[0] > currentStep[0])
                    ? nextStep[0] - currentStep[0]
                    : nextStep[0]; // First step case.
                // XXX: clang/tone/synthGen coupling
                clangTime = [clangLen, [currentStep[1]]];
            } else {
                var clangTime = null;
            }

            this.currentStep += 1;
            if (this.currentStep == this.seq.len) {
                this.currentStep = 0;
            }
            return clangTime;
        },
        nextStep: function() {
            // Allow reading first step from final, non-looping step, after which
            // signal sequence end.
            if (this.currentStep == (this.seq.len - 1)) {
                if (! this.loop) {
                    return null;
                } else {
                    relay.publish('loop_edge', [this.currentStep]);
                }
            }
            return (this.currentStep + 1) % this.seq.len;
        },

        'goto': function(step) {
            this.currentStep = step % this.seq.len;
        },
        
        once: function(seq) {
            this.update({steps: seq});
            clang.getNext = function() {
                var item = seq.shift();
                return item ? [item[0], [item[1]]] : null;
            };
            clang.bump();
        },

        update: function(options) {
            // Update or create attack sequence.
            if (options.pace || options.len || ! this.seq.attacks.length) {
                this.pace = options.pace || this.pace;
                options.attacks = this.patt.transforms.evenAttackSeq(
                    options.len || this.seq.len,
                    this.pace 
                ); 
            }
            // Wrap single-item step value for seq.update.
            if (
                options.vals 
                && options.vals.length == 2 
                && util.type(options.vals[0] == 'Number')
            ) {
                options.vals = [options.vals];
            }
            this.seq.update(options);
            // Fix overflow - at the latest possible point.
            if (options.len && this.currentStep >= options.len) {
                console.log('fix overflow');
                this.currentStep = options.len - 1;
            }
            this.seq.assemble();
            if (options.tone) {
                relay && relay.subscribe('clang_end', function updateTone(data) {
                    clang.setForm(options.tone);
                    relay.unsubscribe('clang_end', updateTone);
                });
            }
        }

    };

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
        buildFreqTable: function(options) {
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
    var sequencers = {
        next_id: 0,
        active: {},
        lookup_hook: function(hook) {
            var proc = (hook in transforms) ? row[hook].bind(row) : 
                (util.type(hook) == 'Function') ? hook : null;
            return proc
        },
        at: function(relay, evt_name, count, hook) {
            var hook_id = this.next_id++; 
            var caller = function() {
                if (! --count) {
                    this.lookup_hook(hook)();
                    relay.unsubscribe(evt_name, caller);
                }
            }.bind(this);
            this.active[hook_id] = [evt_name, caller];
            relay.subscribe(evt_name, caller); 
            return hook_id;
        },
        each: function(relay, evt_name, count, limit, hook) {
            var hook_id = this.next_id++;
            var counter = count;
            var caller = function() {
                if (! --counter) {
                    this.lookup_hook(hook)();
                    if (limit && ! --limit) {
                        relay.unsubscribe(evt_name, caller);
                    }
                    counter = count;
                }
            }.bind(this);
            this.active[hook_id] = [evt_name, caller];
            relay.subscribe(evt_name, caller);
            return hook_id;
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
    for (var key in transforms) {
        row[key] = (function(proc) {
            return function() {
                var args = Array.prototype.slice.call(arguments);
                args.unshift(this.seq.steps);
                this.seq.update({
                    steps: proc.apply(transforms, args)
                    //steps: proc(args)
                });
                this.seq.assemble();
            }.bind(row)
        })(transforms[key]);
    }
    var evt_keys = {
        beat: 'clang_edge',
        loop: 'loop_edge'
    };
    row.at = function(evt_key, count, hook) {
        var evt_name = evt_keys[evt_key];
        return sequencers.at.call(
            sequencers, relay, evt_name, count, hook
        );
    };
    row.each = function(evt_key, count, limit, hook) {
        var evt_name = evt_keys[evt_key];
        return sequencers.each.call(
            sequencers, relay, evt_name, count, limit, hook
        );
    };
    row.cancel = function(hook_id) {
        return sequencers.cancel.call(sequencers, relay, hook_id);
    };
    /*
    for (var key in sequencers) {
        row[key] = (function(proc) {
            return function(evt_name, hook) {
                    proc(hook);
                    //hook.apply(sequencers)
            }.bind(row)
        })(sequencers[key]);
    }
    */
    row.patt = {
        transforms: transforms,
        sequercers: sequencers
    };
    var freqTable = row.patt.transforms.buildFreqTable({
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
        transform: function(step) {
            return freqTable[step]; 
        }
    });
    clang.reader = row.read.bind(row);

    return row;
}

function Patt(config, data, source) {
    var patt = {
    };
    return patt
}
