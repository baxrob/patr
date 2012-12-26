"use strict";

var Patter = Class.extend({
    init: function(options, uri, toneRow) {
        this.options = options;
        this.uri = uri;
        this.toneRow = window.tr = toneRow;

        this.silentNoteVal = 0;
        this.buildFreqTable();

        this.changed = true;
        this.updateFromURI();

        this.uri.onchangeHook = function() {
            this.updateFromURI();
            this.updateDisplay();
        }.bind(this);
    },
    updateFromURI: function() {
        this.uri.parseHash();
             
        // FIXME: these varnames should come from patter.js
        var length = this.uri.len || this.randomStepCount();
        var bpm = this.uri.rate || this.randomBPM();
        var seq = this.uri.seq && this.uri.seq.length 
            ? this.uri.seq.split(',') : this.generateStepSeq(length)
        this.update({
            stepCount: length,
            bpm: bpm,
            seq: seq
        });

    },
    buildSequence: function() {
        if (this.changed) {
            this.hzSeq = this.hzFromStepSeq();
            this.attackSeq = this.flatAttackSeq();
            this.formattedSeq = this.mergeSequences();
            this.toneRow.updateSequence(this.formattedSeq);
            this.uri.update({
                seq: this.stepSeq,
                rate: this.options.bpm,
                len: this.options.stepCount
            });
            this.changed = false;
        }
    },
    update: function(params) {
        var bpmChanged = params.bpm !== undefined
            && params.bpm !== this.options.bpm;
        bpmChanged && (this.options.bpm = params.bpm);
        
        var stepCountChanged = params.stepCount !== undefined 
            && params.stepCount !== this.options.stepCount;
        if (stepCountChanged) {
            if (! params.seq) {
                var diff = params.stepCount - this.options.stepCount;
                while (diff < 0) {
                    this.stepSeq.pop();
                    diff++;
                }
                while (diff > 0) {
                    this.stepSeq.push('0')
                    diff--;
                }
            }
            this.options.stepCount = params.stepCount;
        }

        var seqChanged = false;
        if (params.seq) {
            if (params.seq.length !== this.stepCount) {
                seqChanged = true;
            } else {
                for (var idx = 0; idx < params.seq; idx++) {
                    if (this.stepSeq[idx] !== params.seq[idx]) {
                        seqChanged= true;
                        break;
                    }
                }
            }
            this.stepSeq = params.seq;
        }
        
        var stepOverflow = this.toneRow.seqIdx >= this.options.stepCount - 1;

        var mustPause = this.isRunning() && (bpmChanged || stepCountChanged);

        var updateCallback = function() {
            this.buildSequence();
            stepOverflow && this.reset();
            if (bpmChanged) {
                var lastAttack = this.toneRow.seqIdx > 0 ?
                    this.toneRow.sequence[this.toneRow.seqIdx][0] : 0;
                this.toneRow.elapsed = lastAttack;
            }
            mustPause && this.unpause();
        }.bind(this);

        this.changed = bpmChanged || stepCountChanged || seqChanged;
        // TODO: is this cond overkill, redundant wrt buildSequence check?
        if (this.changed) {
            if (this.isRunning()) {
                if (mustPause) {
                    this.toneRow.pause(updateCallback);
                } else {
                    this.toneRow.setUpdateHook(updateCallback);
                }
            } else {
                updateCallback();
            }
        }
    }, // update

    updateDisplay: function() {
        // Called from uri.onchangeHook 
        this.updateDisplayHook && this.updateDisplayHook({
            controls: {
                bpm: this.options.bpm,
                stepCount: this.options.stepCount 
            },
            sequence: this.stepSeq
        });
    },

    // Sequence data generation
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

    shuffle: function() {
        var newSeq = this.stepSeq.slice(0, this.options.stepCount)
        .sort(function(x) {
            return 0.5 - Math.random();
        });
        this.update({
            seq: newSeq
        });
    },
    clear: function() {
        var newSeq = this.stepSeq.map(function(val, idx) {
            return 0; 
        });
        this.update({
            seq: newSeq
        });
    },

    // Controls
    playSequence: function() {
        this.toneRow.run();
    },
    stop: function() {
        this.toneRow.stop();
    },
    unpause: function() {
        this.toneRow.run();
    },
    pause: function(after) {
        this.toneRow.pause(after);
    },
    reset: function() {
        this.toneRow.reset();
    },
    isRunning: function() {
        return this.toneRow.running;
    },

    // Sequence formatting
    buildFreqTable: function() {
        this.freqTable = [this.silentNoteVal];
        var min = this.options.minNote,
            max = this.options.maxNote,
            base = this.options.baseFreq,
            div = this.options.octaveDivisions;
        for (var i = min; i < max; i++) {
            this.freqTable.push(base * Math.pow(2, (i / div)));
        }
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
    mergeSequences: function() {
        var self = this;
        return this.attackSeq.map(function(val, idx) {
            return [val, self.hzSeq[idx]];
        });
    },
});
