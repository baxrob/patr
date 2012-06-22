var waveform;

var Patter = Class.extend({
    init: function(options, uri, toneRow) {
        this.options = options;
        this.uri = uri;
        this.toneRow = window.tr = toneRow;

        this.silentNoteVal = 0;
        this.buildFreqTable();

        this.initURI();

        this.updateSequence();
    },
    initURI: function() {
        this.uri.parseHash();
        this.options.stepCount = this.uri.length || this.randomStepCount();
        this.options.bpm = this.uri.rate || this.randomBPM();
        this.stepSeq = this.uri.seq ? this.uri.seq.split(',') : 
            this.generateStepSeq(); 
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
    updateSequence: function(skipURIUpdate) {
        this.hzSeq = this.hzFromStepSeq();
        this.attackSeq = this.flatAttackSeq();
        this.formattedSeq = this.mergeSequences();
        this.toneRow.updateSequence(this.formattedSeq);
        if (! skipURIUpdate) {
            this.uri.update({
                seq: this.stepSeq,
                rate: this.options.bpm,
                length: this.options.stepCount
            });
        }
    },
    update: function(params) {
        // fixme: stage updates for next note-break
        if (params.stepCount) { 
            if (this.toneRow.seqIdx >= params.stepCount) {
                this.toneRow.reset();
            }
            this.options.stepCount = params.stepCount;
        }
        params.bpm && (this.options.bpm = params.bpm);
        params.seq && (this.stepSeq = params.seq);
        this.updateSequence();
    },

    shuffle: function() {
        //console.log(this.stepSeq, this.options.stepCount, this.stepSeq.slice(0, this.options.stepCount));
        var newSeq = this.stepSeq.slice(0, this.options.stepCount)
        .sort(function(x) {
            return 0.5 - Math.random();
        });
        this.update({
            seq: newSeq
        });
    },

    playSequence: function() {
        // fixme: clicks on first note
        //this.toneRow.playSequence();
        this.toneRow.run();
    },
    stop: function() {
        // fixme: should clear blink, but not here
        this.toneRow.stop();
    },
    unpause: function() {
        this.toneRow.run();
    },
    pause: function(after) {
        this.toneRow.pause(after);
    },
    buildFreqTable: function() {
        this.freqTable = [this.silentNoteVal];
        var min = this.options.minNote,
            max = this.options.maxNote,
            base = this.options.baseFreq,
            div = this.options.octaveDivisions;
        for (var i = min; i < max - 1; i++) {
            this.freqTable.push(base * Math.pow(2, (i / div)));
        }
    },
    hzFromStepSeq: function() {
        var self = this;
        return this.stepSeq.map(function(stepVal, idx) {
            return self.freqTable[stepVal];
        });
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
