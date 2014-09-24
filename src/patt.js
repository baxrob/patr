"use strict";

// XXX: clang should be an optional arg ? but it's the clock; or we'd need some other? to go/stop
function Row(clang, config) {
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
                this.stepTransform = options.transform || this.stepTransform;
                this.len = options.len || this.len;
                // Lengthen sequence with blanks if p.len > s.len.
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
            //var currentStep = this.seq.clangTimes[this.currentStep % this.seq.len];
            var nextStep = this.seq.clangTimes[this.nextStep()];

            //console.log(nextStep, currentStep);
            if (nextStep) {// && nextStep) {
                var clangLen = (nextStep[0] > currentStep[0])
                    ? nextStep[0] - currentStep[0]
                    : nextStep[0]; // First step case.
                // XXX: clang/tone/synthGen coupling
                clangTime = [clangLen, [currentStep[1]]];
            } else {
                var clangTime = null;
            }

            //console.log('read', this.currentStep, clangTime);
            this.currentStep += 1;
            if (this.currentStep == this.seq.len) {
                this.currentStep = 0;
            }
            //console.log(clangLen, hz);
            return clangTime;
        },
        nextStep: function() {
            // Allow reading first step from final, non-looping step, after which
            // signal sequence end.
            if (this.currentStep == (this.seq.len - 1) && ! this.loop) {
                return null;
            }
            return (this.currentStep + 1) % this.seq.len;
        },

        'goto': function(step) {
            this.currentStep = step % this.seq.len;
        },
        
        // XXX: ? to Patt ?
        once: function(seq) {
            this.update({steps: seq});
            clang.getNext = function() {
                var item = seq.shift();
                return item ? [item[0], [item[1]]] : null;
            };
            clang.bump();
        },

        update: function(options) {
            if (options.pace || options.len || ! this.seq.attacks.length) {
                this.pace = options.pace || this.pace;
                options.attacks = this.patt.evenAttackSeq(
                    options.len || this.seq.len,
                    this.pace 
                ); 
            }
            this.seq.update(options);
            this.seq.assemble();
            if (options.tone) {
                relay.subscribe('clang_edge', function updateTone(data) {
                    clang.setClangForm(options.tone);
                    relay.unsubscribe('clang_edge', updateTone);
                });
            }
        }

    };

    var p = {
        randomBPM: function() {
            return parseInt(Math.random() * 500 + 150);
        },
        randomStepCount: function() {
            var len = Math.random() * 15 + 5;
            return parseInt(len);
        },
        generateStepSeq: function(length, algorithm) {
            if (typeof algorithm === 'string') {
                var generator = patt[algorithm];
            } else if (typeof algorithm === 'function') {
                var generator = algorithm;
            } else if (! algorithm) { // Default
                var self = this;
                var generator = function(idx) {
                    var density = 4;
                    var randVal = parseInt(Math.random() * self.options.maxNote);
                    var note = randVal % density ? randVal : 0;
                    return parseInt(note);
                }
            }
            var stepSeq = [];
            var length = length || this.options.stepCount;

            // Apply generator routine to each step
            for (var i = 0; i < length; i++) {
                stepSeq[i] = generator(i);
            }

            return stepSeq;
        },
        _buildFreqTable: function() {
            this.freqTable = [0];
            var min = this.options.minNote,
                max = this.options.maxNote,
                base = this.options.baseFreq,
                div = this.options.octaveDivisions;
            for (var i = min; i < max; i++) {
                this.freqTable.push(base * Math.pow(2, (i / div)));
            }
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
        flatAttackSeq: function() {
            var length = this.options.stepCount;
            var bpm = this.options.bpm;
            var seq = [length * (60 / bpm)] // Zeroth == total, for looping
            for (var i = 1; i < length; i++) {
                seq.push(i * (60 / bpm));
            }
            return seq;
        },
        evenAttackSeq: function(len, pace) {
            var seq = [len * (60 / pace)] // Zeroth == total, for looping
            for (var i = 1; i < len; i++) {
                seq.push(i * (60 / pace));
            }
            console.log('s', seq);
            return seq;
        },
        mergeSequences: function() {
            var self = this;
            return this.attackSeq.map(function(val, idx) {
                return [val, self.hzSeq[idx]];
            });
        }
    };

    // Initialize.
    row.patt = p;
    var freqTable = row.patt.buildFreqTable({
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
    //console.log(row.seq.clangTimes);
    clang.reader = row.read.bind(row);

    return row;
}

function Patt(config, data, source) {
    var patt = {
    };
    return patt
}
