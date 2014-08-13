"use strict";

var ClangBlock = Class.extend({

    init: function(sampleRate, baseGain) {    
        this.sampleRate = sampleRate;
        this.baseGain = baseGain;

        this.sampleProc = function(hz, idx, phase) { return 0; }; // Override
        this.hzGain = function(hz) { return this.baseGain; };     // Override

        this.rampLen = 240;
        this.writeSample = 0;
    },

    fillBuffer: function(hz, len, buffers, offset, rampOut, phase) {
        (hz >= 20) || (hz = 0);
        var idx = offset,
            rampLen = rampOut ? this.rampLen : 0,
            gain = this.hzGain(hz),
            writeEnd = len + offset,
            sustainEnd = writeEnd - rampLen,
            sampleVal;

        for ( ; idx < sustainEnd; idx++, this.writeSample++) {
            sampleVal = gain * this.sampleProc(hz, this.writeSample) 
                + phase;
            buffers[0][idx] = buffers[1][idx] = sampleVal;
        }

        if (rampOut) {
            var rampPos = rampLen;
            for ( ; idx < writeEnd; idx++, this.writeSample++) {
                sampleVal = (rampPos-- / rampLen) * gain
                //sampleVal = Math.sqrt(rampPos-- / rampLen) * gain
                //sampleVal = Math.log((rampPos-- / rampLen)+ 1)*1.442 * gain
                    * this.sampleProc(hz, this.writeSample) + phase; 
                buffers[0][idx] = buffers[1][idx] = sampleVal;
            }
        }
    } // fillBuffer

}); // ClangBlock

var Clang = ClangBlock.extend({
    
    // FIXME: much of this belongs in ClangRow
    init: function(sampleRate, baseGain) {

        this._super(sampleRate, baseGain);

        this.sampleProc = function(hz, idx, phase) { return 0; }; // Override
        this.hzGain = function(hz) { return this.baseGain; };    // Override

        //this.processorNode = this.context.createSriptProcessorNode(
        this.processorNode = this.context.createJavaScriptNode(
            this.bufferLength, 2, 2//, 0, 2
        );
        this.processorNode.onaudioprocess = this.onProcess.bind(this); 

    },

    // TODO: replace run / stop
    strike: function(attack, duration) {
    },
    halt: function() {
    },

    // TODO: use pub-sub, ala balman
    setUpdateHook: function(newHook) {
        //var oldHook = this.sequenceUpdateHook;
        this.sequenceUpdateHook = function() {
            newHook();
            this.sequenceUpdateHook = null;
        };
    },
    updateSequence: function(sequence) {
        // FIXME: necessary?
        if (this.running) {
            this.setUpdateHook(function() {
                this.sequence = sequence;
            }.bind(this));
        } else {
            this.sequence = sequence;
        }
        /*
        */
        // 
        this.sequence = sequence;
    },
    
    run: function(durationLimit) {
        if (this.sequence.length && this.processorNode.onaudioprocess) {
            this.processorNode.connect(this.context.destination);
            this.running = true;
            if (durationLimit !== undefined) {
                setTimeout(function() {
                    this.stop();
                }.bind(this), durationLimit);
            }
        }
    },
    stop: function() {
        this.pause(this.reset);
    },
    reset: function() {
        this.firstLoop = true;
        this.newNote = true;
        this.seqIdx = 0;
        this.elapsed = 0;
        this.writeSample = 0;
    },
    pause: function(onComplete) {
        this.setUpdateHook(function(timeout) {
            //var startCtxTime = this.context.currentTime;
            //var startDateTime = Date.now();
            //console.log(startDateTime, startCtxTime);

            // Store current sequence, then zero-fill.
            var restoreSequence = [];
            for (var i in this.sequence) {
                restoreSequence[i] = this.sequence[i].slice();
            }
            this.sequence = this.sequence.map(function(el, idx) {
                el[1] = 0;
                return el;
            });
            
            // Disconnect and restore.

            // UGH:
            // FIXME: just do a timeout longer than bufferDuration
            //        or busyLoop            
            /*
            var timeout = this.bufferLength / this.sampleRate * 1000 + 75;
            setTimeout(function() {
                console.log('atpause', (this.context.currentTime - startCtxTime) * 1000, (Date.now() - startDateTime));
                this.processorNode.disconnect();
                this.running = false;
                // Reset to next note
                this.sequence = restoreSequence;
                this.elapsed = this.seqIdx == 0 ? 0
                    : this.sequence[this.seqIdx][0];
                this.writeSample = 0;

                onComplete && onComplete.bind(this)();
            }.bind(this), timeout);
            */

            timeout = this.stepSec;
            timeout += 100;

            var doPause = function(t) {
                var progress = t - start;

                //console.log('inc', t - lastT);
                lastT = t;

                if (progress >= timeout) {

                    this.processorNode.disconnect();
                    this.running = false;
                    // Reset to next note
                    this.sequence = restoreSequence;
                    this.elapsed = this.seqIdx == 0 ? 0
                        : this.sequence[this.seqIdx][0];
                    this.writeSample = 0;

                    onComplete && onComplete.bind(this)();
                } else {
                    requestAnimationFrame(doPause);
                }
            }.bind(this);

            var requestAnimationFrame = window.mozRequestAnimationFrame 
                || window.webkitRequestAnimationFrame;
            var start = window.mozAnimationStartTime || Date.now();
            var lastT = start;
            requestAnimationFrame(doPause); 
            /*
            */

        }.bind(this));
    }, // pause

    stageBeatEvent: function(idx, length, onsetDelay) {
        // FIXME: does this matter, when visual perception as 200ms LND?
        setTimeout(function() {
            var evt = document.createEvent('Event');
            evt.initEvent('beat', false, false);
            evt.length = idx * length * 1000;
            evt.beat = parseInt(idx);
            document.dispatchEvent(evt);
        }, onsetDelay * 1000);
    },
    
    onProcess: function(evt) {
        // KLUDGE: double safety against sequence shrink race condition 
        // FIXME: necessary?
        if (this.seqIdx >= this.sequence.length) {
            this.seqIdx = 0;
        }
        var buffer = evt.outputBuffer,
            stereoBuffer = [
                buffer.getChannelData(0),
                buffer.getChannelData(1)
            ];
        var hertz = this.sequence[this.seqIdx][1],
            nextSeqIdx = (this.seqIdx + 1) % this.sequence.length,
            nextAttack = this.sequence[nextSeqIdx][0];

        // Special cases for first note in sequence.
        if (this.seqIdx === 0 && this.newNote) {
            if (this.firstLoop) {
                // Absolute beginning, so fire the first beat now.
                this.stageBeatEvent(this.seqIdx, nextAttack, 0);
                this.firstLoop = false;
            } else {
                // Looping, so rewind elapsed by unused buffer .
                this.elapsed = buffer.duration - this.stepSec;
                $.event.trigger('loop');   
            }
        }

        var rampOnset = nextAttack - (this.rampLen / this.sampleRate);
        var bufferEnd = this.elapsed + buffer.duration;

        // TODO: optionally join adjacent repeated notes with
        //       brief pitch shift
        if (rampOnset <= bufferEnd) {
            // Ramp-out begins within this buffer.
            this.newNote = true;
            this.stepSec = nextAttack - this.elapsed;

            // If we are ramping out, but the next attack is not 
            //    in this buffer, then shorten note slightly 
            //    (by < rampLen) to complete rampOut.
            if (bufferEnd < nextAttack) {
                var blockLength = buffer.length;
            } else { 
                var blockLength = parseInt(this.stepSec * this.sampleRate);
            }

            this.fillBuffer(
                hertz, blockLength, stereoBuffer, 0, true, 0
            );

            // Perform sequence update between notes.
            if (this.sequenceUpdateHook) {
                this.sequenceUpdateHook(this.stepSec * 1000);
            }

            // Begin next note.
            this.seqIdx = nextSeqIdx;
            hertz = this.sequence[this.seqIdx][1];

            // Reset phase.
            this.writeSample = 0;

            this.stageBeatEvent(this.seqIdx, nextAttack, this.stepSec);

            var offset = blockLength;
            blockLength = buffer.length - offset;

            this.fillBuffer(
                hertz, blockLength, stereoBuffer, offset, false, 0
            );
        } else {
            // Full single-Hz buffer.
            this.newNote = false;
            this.fillBuffer(
                hertz, buffer.length, stereoBuffer, 0, false, 0
            );
        }
        this.elapsed += buffer.duration;
    } // onProcess

}); // Clang



//
var ClangRow = Clang.extend({

    init: function(context, bufferLength) {

        this.context = context;
        this.sampleRate = this.context.sampleRate;
        this.bufferLength = bufferLength;

        // Considering 0.8 a "sensible default".
        this.baseGain = 0.8;

        this._super(this.sampleRate, this.baseGain);

        var baseGain = 0.8;

        this.reset();
        this.sequence = [];
        this.sequenceUpdateHook = null;
        this.running = false;
    
    }
}); // ClangRow


var BeatRow = ClangRow.extend({
    init: function(context, bufferLength, sampleRate, baseGain) {
        this._super(context, bufferLength, sampleRate, baseGain);
    },
    p1Val: function(p1_val, idx, phase) {
        // STUB
    },
    p2Gain: function(p2_val) {
        // STUB
    }
});

var SineRow = ClangRow.extend({
    init: function(context, bufferLength, sampleRate, baseGain) {
        this._super(context, bufferLength, sampleRate, baseGain);
    }
});

var SineRow = ClangRow.extend({
});

var NoiseCrinkleRow = ClangRow.extend({
    init: function(context, bufferLength, sampleRate, baseGain) {
        this._super(context, bufferLength, sampleRate, baseGain);

        this.sampleProc = this.noise;
        this.hzGain = this.crinkle;
    },
    // Sample values
    noise: function(hz, idx, phase) {
        return 1 - (Math.random() * 2);
    },
    // Frequency based gain envelope
    crinkle: function(hz) {
        var gainVal = 5 / Math.sqrt(2*Math.PI) * Math.pow(
            Math.E, (-1 / 200000 * Math.pow(hz, 2))
        );
        return gainVal;
    }
});

var SineBleatRow = ClangRow.extend({
    init: function(context, bufferLength, sampleRate, baseGain) {
        this._super(context, bufferLength, sampleRate, baseGain);

        this.sampleProc = this.sine;
        this.currentTone = 'sine';
        this.hzGain = this.bleat;
    },
    // Sample values
    sine: function(hz, idx, phase) {
        (phase === undefined) && (phase = 0);
        var sampleVal = Math.sin(
            hz * (2 * Math.PI) * idx / this.sampleRate + phase
        );
        return sampleVal;
    },
    square: function(hz, idx, phase) {

    },
    // Frequency based gain envelope
    bleat: function(hz) {
        var divisor = 220,      // "cutoff"
            multiplier = 2.4;   // "max gain"
        //divisor = 20;
        //multiplier = 2.8;
        var cosh = function(n) {
            return (Math.exp(n) + Math.exp(-n)) / 2;
        };
        var gainVal = 1 / cosh(hz / divisor) * multiplier * this.baseGain;
        //(1/sqrt(2*pi))*6*e^(-1/290000*x^2)
        
        return gainVal;
    },
    crinkle: function(hz) {
        var gainVal = 5 / Math.sqrt(2*Math.PI) * Math.pow(
            Math.E, (-1 / 200000 * Math.pow(hz, 2))
        );
        return gainVal;
    },
    unity: function(hz) {
        return this.baseGain * 0.9;
    }
});

//
var ToneRow = ClangRow.extend({
    // STUB:
    init: function(context, bufferLength) {
        this._super(context, bufferLength);
    }
});

ToneRow = SineBleatRow;

