"use strict";
/*
NoteBlock
SoundChunk
Clang

ClangRow: 
Clang
ClangBlock
*/

var ToneRow = ClangRow.extend({
    init: function(context, bufferLength, sampleRate, baseGain) {
        this._super(context, bufferLength, sampleRate, baseGain);
    }
});

var BeatRow = ClangRow.extend({
    init: function(context, bufferLength, sampleRate, baseGain) {
        this._super(context, bufferLength, sampleRate, baseGain);
    },
    p1Val: function(p1_val, idx, phase) {
    },
    p2Gain: function(p2_val) {
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

        this.sampleVal = this.noise;
        this.hzGain = this.crinkle;
    },
    // Sample values
    noise: function(hz, idx, phase) {
        return sampleVal = 1 - (Math.random() * 2);
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

        this.sampleVal = this.sine;
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
        // TODO: this.crinkle
        
        //gainVal = 5 / Math.sqrt(2*Math.PI) * Math.pow(
        //    Math.E, (-1 / 200000 * Math.pow(hz, 2))
        //);
        
        return gainVal;
    }
});



var ClangRow = Clang.extend({

    init: function(context, bufferLength) {

        this.context = context;
        this.sampleRate = this.context.sampleRate;
        this.bufferLength = bufferLength;

        // Considering 0.8 a "sensible default"
        this.baseGain = 0.8;

        this._super(this.sampleRate, this.baseGain);

        var baseGain = 0.8;

        //this.block = new ToneBlock(this.sampleRate, baseGain);

        this.reset();
        this.sequence = [];
        this.sequenceUpdateHook = null;
        this.running = false;
    
        // ?
        //this.subrows = [this];

    },

    run: function() {
    }

}); // var ClangRow = Clang.extend({



var Clang = ClangBlock.extend({
    
    // 
    init: function(sampleRate, baseGain) {

        this._super(sampleRate, baseGain);

        this.sampleVal = function(hz, idx, phase) { return 0; }; // Override
        this.hzGain = function(hz) { return this.baseGain; };    // Override

        this.processorNode = this.context.createJavaScriptNode(
            this.bufferLength, 2, 2//, 0, 2
        );
        this.jsNode.onaudioprocess = this.onProcess.bind(this); 

    },

    //
    strike: function(attack, duration) {
    },
    halt: function() {
    },

    // Public
    setUpdateHook: function(newHook) {
        this.sequenceUpdateHook = function() {
            newHook();
            this.sequenceUpdateHook = null;
        };
    },
    // Public
    updateSequence: function(sequence) {
        if (false && this.running) {
            this.setUpdateHook(function() {
                this.sequence = sequence;
            }.bind(this));
        } else {
            this.sequence = sequence;
        }
    },
    
    // 
    run: function(durationLimit) {
        if (this.sequence.length && this.jsNode.onaudioprocess) {
            this.jsNode.connect(this.context.destination);
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
        this.setUpdateHook(function() {
            // Store current sequence, then zero-fill
            var restoreSequence = [];
            for (var i in this.sequence) {
                restoreSequence[i] = this.sequence[i].slice();
            }
            this.sequence = this.sequence.map(function(el, idx) {
                el[1] = 0;
                return el;
            });
            
            // Disconnect and restore

            // FIXME: is this understanding accurate?
            // Wait until current buffer has been written - buffer duration
            //      plus arbitrary 65 ms timeout latency
            // TODO: use requestAnimationFrame?
            var timeout = this.bufferLength / this.sampleRate * 1000 + 65;
            setTimeout(function() {
                this.jsNode.disconnect();
                this.running = false;
                // Reset to next note
                this.sequence = restoreSequence;
                this.elapsed = this.seqIdx == 0 ? 0
                    : this.sequence[this.seqIdx][0];
                this.writeSample = 0;

                onComplete && onComplete.bind(this)();
            }.bind(this), timeout);
        }.bind(this));
    }, // pause: function(onComplete) {
    
    // 
    stageBeatEvent: function(idx, length, onsetDelay) {
        // TODO: use requestAnimationFrame
        setTimeout(function() {
            var evt = document.createEvent('Event');
            evt.initEvent('beat', false, false);
            evt.length = idx * length * 1000;
            evt.beat = parseInt(idx);
            document.dispatchEvent(evt);
        }, onsetDelay * 1000);
    },
    
    //
    onProcess: function(evt) {
        // KLUDGE: double safety against sequence shrink race condition 
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
            nextAttack = this.nextAttack = this.sequence[nextSeqIdx][0],
            nextHertz = this.sequence[nextSeqIdx][1];
        var rampOnset = nextAttack - (this.rampLen / this.sampleRate);

        // Special cases for first note in sequence
        if (this.seqIdx === 0 && this.newNote) {
            if (this.firstLoop) {
                // Absolute beginning, so fire the first beat immediately 
                this.stageBeatEvent(this.seqIdx, nextAttack, 0);
                this.firstLoop = false;
            } else {
                // Looping, so rewind elapsed by unused buffer 
                this.elapsed = buffer.duration - this.stepSec;
            }
        }

        // Ramp-out begins within this buffer
        // TODO: (optionally?) join adjacent repeated notes (no ramp out)
        if (rampOnset <= this.elapsed + buffer.duration) {
            this.newNote = true;
            this.stepSec = nextAttack - this.elapsed;

            // If ramp-out crosses buffer boundary, fudge it
            if (this.elapsed + buffer.duration < nextAttack) {
                var blockLength = buffer.length;
            } else { 
                var blockLength = parseInt(this.stepSec * this.sampleRate);
            }

            this.fillBuffer(
                hertz, blockLength, stereoBuffer, 0, true, 0
            );

            // Perform sequence update between notes
            if (this.sequenceUpdateHook) {
                this.sequenceUpdateHook();
            }

            // Begin next note
            this.seqIdx = nextSeqIdx;
            //hertz = this.sequence[nextSeqIdx][1];
            hertz = nextHertz;

            // Reset phase
            this.writeSample = 0;

            this.stageBeatEvent(this.seqIdx, nextAttack, this.stepSec);

            var offset = blockLength;
            blockLength = buffer.length - offset;

            this.fillBuffer(
                hertz, blockLength, stereoBuffer, offset, false, 0
            );
        } else {
            // Full single-Hz buffer
            this.newNote = false;
            this.fillBuffer(
                hertz, buffer.length, stereoBuffer, 0, false, 0
            );
        }
        this.elapsed += buffer.duration;
    } // onProcess: function(evt) {


}); // var Clang = ClangBlock.extend({



var ClangBlock = Class.etend({

    init: function(sampleRate, baseGain) {    
        this.sampleRate = sampleRate;
        this.baseGain = baseGain;

        this.sampleVal = function(hz, idx, phase) { return 0; }; // Override
        this.hzGain = function(hz) { return this.baseGain; };    // Override

        this.rampLen = 0;
        this.writeSample = 0;
    },
    sanity: function() {
    },
    /*
    noise: function(hz,) {
        return sampleVal = 1 - (Math.random() * 2);
    },
    */
    _fillBuffer: function(hz, len, buffers, offset, rampOut, phase) {
    },
    fillBuffer: function(hz, len, buffers, offset, rampOut, phase) {
        (hz >= 20) || (hz = 0);
        var idx = offset,
            rampLen = rampOut ? this.rampLen : 0,
            gain = this.hzGain(hz),
            writeEnd = len + offset;

        for ( ; idx < writeEnd - rampLen; idx++, this.writeSample++) {
            var sampleVal = gain * this.sampleVal(hz, this.writeSample) 
                + phase;
            buffers[0][idx] = buffers[1][idx] = sampleVal;
        }

        if (rampOut) {
            var rampPos = rampLen;
            for ( ; idx < writeEnd; idx++, this.writeSample++) {
                sampleVal = (rampPos-- / rampLen) * gain
                //sampleVal = Math.sqrt(rampPos-- / rampLen) * gain
                //sampleVal = Math.log((rampPos-- / rampLen)+ 1)*1.442 * gain
                    * this.sampleVal(hz, this.writeSample) + phase; 
                buffers[0][idx] = buffers[1][idx] = sampleVal;
            }
        }
    } // fillBuffer: function(hz, len, buffers, offset, rampOut, phase) {

}); // var ClangBlock = Class.etend({

