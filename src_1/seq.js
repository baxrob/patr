"use strict";

var Patter = Class.extend({
    init: function(options, uri, toneRow) {
        this.options = options;
        this.uri = uri;
        this.toneRow = window.tr = toneRow;

        this.buildFreqTable();

        this.changed = true;
        this.updateFromURI();

        this.uri.onchangeHook = function() {
            this.updateFromURI();
            this.updateDisplay();
        }.bind(this);
        
        // The Loop Event.
        this.loopCount = 0;
        $(document).on('loop', function(evt) {
            this.loopCount += 1; 
            var reshuf = parseInt(this.reshuf) !== 0;
            if (reshuf && this.loopCount >= this.reshuf) {
                if (this.uri.volatile) {
                    $('#reshuf').addClass('blocked');
                    setTimeout(function() {
                        $('#reshuf').removeClass('blocked');
                    }, 100);
                } else {
                    // TODO: re-select focused input
                    //console.log($(':focus'));
                    this.shuffle();
                    // FIXME: KLUDGE, coupling
                    $('#shuff').addClass('active');
                    setTimeout(function() {
                        $('#shuff').removeClass('active');
                    }, 100);
                }
                this.loopCount = 0;
            }
        }.bind(this));
        
    },
    updateFromURI: function() {
        this.uri.parseHash();
             
        // FIXME: coupling
        //        these varnames should come from patter.js
        var length = this.uri.len || this.randomStepCount();
        var bpm = this.uri.rate || this.randomBPM();
        var reshuf = this.uri.reshuf || '0';
        var tone = this.uri.tone || 'sine'; // FIXME: should be toneRow.tones[0]
        var seq = this.uri.seq && this.uri.seq.length 
            ? this.uri.seq.split(',') : this.generateStepSeq(length)

        this.update({
            stepCount: length,
            bpm: bpm,
            reshuf: reshuf,
            tone: tone,
            seq: seq
        });
        //console.log(this.options.tone, tone, this.uri.tone);

    },
    buildSequence: function() {
        if (this.changed) {
            this.hzSeq = this.hzFromStepSeq();
            this.attackSeq = this.flatAttackSeq();
            this.formattedSeq = this.mergeSequences();
            this.toneRow.updateSequence(this.formattedSeq);

            // FIXME: coupling
            this.uri.update({
                seq: this.stepSeq,
                rate: this.options.bpm,
                len: this.options.stepCount,
                reshuf: this.options.reshuf,
                tone: this.options.tone
            });

            //console.log(soundtoyTones);
            // FIXME: temp kludge, see ix.js
            window.setTone(this.toneRow, this.options.tone);
            
            this.reshuf = this.options.reshuf;
            
            this.changed = false;
        }
    }, // buildSequence
    update: function(params) {
        // FIXME: coupling

        // Pace
        var bpmChanged = params.bpm !== undefined
            && params.bpm !== this.options.bpm;
        bpmChanged && (this.options.bpm = params.bpm);
        
        // Len
        var stepCountChanged = params.stepCount !== undefined 
            && params.stepCount !== this.options.stepCount;
        if (stepCountChanged) {
            // Adjust sequence length if not otherwise changing sequence 
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

        // Shuf
        var reshufChanged = params.reshuf !== undefined
            && params.reshuf !== this.options.reshuf;
        reshufChanged && (this.options.reshuf = params.reshuf);

        // Tone
        //console.log(this.options.tone, params.tone);
        var toneChanged = params.tone !== undefined
            && params.tone !== this.options.tone;
        toneChanged && (this.options.tone = params.tone);
        //console.log(this.options.tone, params.tone);

        // Seq
        var seqChanged = false;
        // FIXME: negate extra conditionals:
        //        params.seq should only be passed if the sequence has
        //        actually changed
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
            // Actual update occurs in buildSequence
            this.buildSequence();
            // 
            stepOverflow && this.reset();
            // FIXME: should live in synth.js
            if (bpmChanged) {
                var lastAttack = this.toneRow.seqIdx > 0 ?
                    this.toneRow.sequence[this.toneRow.seqIdx][0] : 0;
                this.toneRow.elapsed = lastAttack;
            }
            mustPause && this.unpause();
        }.bind(this);

        // FIXME: coupling
        this.changed = bpmChanged || stepCountChanged || seqChanged
            || reshufChanged || toneChanged;
        if (this.isRunning()) {
            if (mustPause) {
                this.toneRow.pause(updateCallback);
            } else {
                this.toneRow.setUpdateHook(updateCallback);
            }
        } else {
            updateCallback();
        }
    }, // update


    updateDisplay: function() {
        // Called from uri.onchangeHook 
        this.updateDisplayHook && this.updateDisplayHook({
            controls: {
                bpm: this.options.bpm,
                stepCount: this.options.stepCount ,
                reshuf: this.options.reshuf,
                tone: this.options.tone
            },
            sequence: this.stepSeq
        });
    },

    updateTone: function(tone) {
        // TODO: use; update to ix.js.window.setTone
        if (tone in soundtoyTones) { 
            toneRow.sampleProc = soundtoyTones._getSampleProc(tone);
            //toneRow.hzGain = toneRow.unity;
        } else {
            toneRow.sampleProc = toneRow[tone];
            toneRow.hzGain = toneRow.bleat;
        }
        toneRow.setUpdateHook(function() {
            console.log('', this);
            this.currentTone = tone;
        });
        var busyWait = setInterval(function() {
            if ($('#tone_menu_button').length) {
                $('#tone_menu_button').html(tone + ' &#x25be;');
                clearInterval(busyWait);
            }
        }, 1);
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
        // FIXME: syntax ambiguity
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

    // FIXME: redundant / inelegant
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
        this.loopCount = 0;
    },
    isRunning: function() {
        return this.toneRow.running;
    },

    // Sequence formatting
    buildFreqTable: function() {
        this.freqTable = [0];
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
