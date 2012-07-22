var waveform;

var Patter = Class.extend({
    init: function(options, uri, toneRow) {
        this.options = options;
        this.uri = uri;
        this.toneRow = window.tr = toneRow;

        this.silentNoteVal = 0;
        this.buildFreqTable();

        this.parseURI();

        this.dirty = true;
        this.buildSequence();

        this.uri.onchangeHook = function() {
            this.parseURI();
            this.buildSequence();
            this.updateDisplay();
        }.bind(this);
    },
    parseURI: function() {
        this.uri.parseHash();
        this.options.stepCount = this.uri.length || this.randomStepCount();
        this.options.bpm = this.uri.rate || this.randomBPM();
        this.stepSeq = this.uri.seq ? this.uri.seq.split(',')
            : this.generateStepSeq(); 
    },
    // TODO: rename to buildSequence ? constructAttackSequence
    buildSequence: function() {
        console.log('build?', this.dirty);
        if (this.dirty) {
            this.hzSeq = this.hzFromStepSeq();
            this.attackSeq = this.flatAttackSeq();
            this.formattedSeq = this.mergeSequences();
            this.toneRow.updateSequence(this.formattedSeq);
            this.uri.update({
                seq: this.stepSeq,
                rate: this.options.bpm,
                length: this.options.stepCount
            });
            this.dirty = false;
        }
    },
    update: function(params, onContinue) {
        if (params.seq) {
            for (var idx = 0; idx < this.stepSeq.length; idx++) {
                if (this.stepSeq[idx] !== params.seq[idx]) {
                    this.dirty = true;
                    break;
                }
            };
            this.dirty && (this.stepSeq = params.seq);
        }
        if (params.stepCount && params.stepCount !== this.options.stepCount) {
            this.dirty = true;
            var diff = params.stepCount - this.options.stepCount;
            if (
                //diff < 0
                //&& 
                this.isRunning() 
                //&& this.toneRow.seqIdx >= params.stepCount
            ) {
                this.toneRow.pause(function() {
                    this.reset(); 
        this.buildSequence();
                    this.unpause();
                }.bind(this));
            }
            while (diff < 0) {
                this.stepSeq.pop();
                diff++;
            }
            while (diff > 0) {
                this.stepSeq.push(0)
                diff--;
            }
            this.options.stepCount = params.stepCount;
        }
        else if (params.bpm && params.bpm !== this.options.bpm) {
            this.dirty = true;
            if (this.isRunning()) {
                this.toneRow.pause(function() {
                    this.buildSequence();
                    var lastAttack = this.toneRow.sequence[
                        this.toneRow.seqIdx
                    ][0];
                    this.toneRow.elapsed = lastAttack;
                    //this.reset();
                    this.unpause();
                }.bind(this));
            }
            this.options.bpm = params.bpm;
        }
        else this.buildSequence();
    },
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

    randomBPM: function() {
        return parseInt(Math.random() * 500 + 150);
    },
    randomStepCount: function() {
        var len = Math.random() * 15 + 5;
        return parseInt(len);
    },
    generateStepSeq: function(algorithm) {
        if (typeof algorithm === 'string') {
            var generator = patt[algorithm];
        } else if (typeof algorithm === 'function') {
            var generator = algorithm;
        } else if (typeof algorithm === 'undefined') {
            var self = this;
            var generator = function(idx) {
                var density = 4;
                var randVal = parseInt(Math.random() * self.options.maxNote);
                var note = randVal % density ? randVal : 0;
                return parseInt(note);
            }
        }
        var stepSeq = [];
        for (var i = 0; i < this.options.stepCount; i++) {
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
