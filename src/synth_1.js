"use strict";

var ClangBlock = Class.extend({

    init: function(sampleRate, baseGain) {    
        this.sampleRate = sampleRate;
        this.baseGain = baseGain;

        // Override in sub-class
        this.sampleProc = function(hz, idx, phase) { return 0; }; 
        this.hzGain = function(hz) { return this.baseGain; };

        this.rampLen = 240;
        this.writeSample = 0;
    },

    // TODO: rampIn option, later: adsr
    fillBuffer: function(hz, len, buffers, offset, rampOut, phase) {
        (hz >= 20) || (hz = 0);
        var idx = offset,
            rampLen = rampOut ? this.rampLen : 0,
            gain = this.hzGain(hz),
            writeEnd = len + offset,
            sustainEnd = writeEnd - rampLen,
            sampleVal;

        for ( ; idx < sustainEnd; idx++, this.writeSample++) {
            sampleVal = 
                gain 
                * this.sampleProc(hz, this.writeSample) 
                + phase;
            buffers[0][idx] = buffers[1][idx] = sampleVal;
        }

        if (rampOut) {
            var rampPos = rampLen;
            for ( ; idx < writeEnd; idx++, this.writeSample++) {
                sampleVal = (rampPos-- / rampLen) * gain
                    * this.sampleProc(hz, this.writeSample) + phase; 
                buffers[0][idx] = buffers[1][idx] = sampleVal;
            }
        }
    } // fillBuffer

}); // ClangBlock

var Clang = ClangBlock.extend({
    
    // FIXME: much of this belongs in ClangRow
    //        ? and / or in seq/patt ?
    init: function(sampleRate, baseGain) {

        this._super(sampleRate, baseGain);

        var createProcessor = this.context.createScriptProcessor 
            || this.context.createJavaScriptNode;
        //this.processorNode = this.context.createSriptProcessor(
        //this.processorNode = this.context.createJavaScriptNode(
        this.processorNode = createProcessor.call(
            this.context, this.bufferLength, 2, 2//, 0, 2
        );
        window.pn = this.processorNode;
        this.processorNode.onaudioprocess = this.onProcess.bind(this); 

    },

    // TODO: ? replace run / stop ?
    strike: function(attack, duration) {
    },
    halt: function() {
    },

    // TODO: use pub-sub (a la b.alman micro pubsub)
    setUpdateHook: function(newHook) {
        // FIXME: is this safe if updateHook is changed during execution?
        this.updateHook = function() {
            //console.log('newHook', newHook);
            newHook();
            this.updateHook = null;
        };
    },
    updateSequence: function(sequence) {
        // FIXME: this is redundant wrt patt.update
        //        where should it occur?
        if (this.running) {
            this.setUpdateHook(function() {
                this.sequence = sequence;
            }.bind(this));
        } else {
            this.sequence = sequence;
        }
        this.sequence = sequence;
    },
    
    run: function(durationLimit) {
        if (this.sequence.length && this.processorNode.onaudioprocess) {
            this.processorNode.connect(this.context.destination);
            this.running = true;
            //console.log('run', this.sequence.length, this.processorNode.onaudioprocess, this.context.destination);
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

            // TODO: timing tests
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
            */
            var timeout = this.bufferLength / this.sampleRate * 1000 + 75;
            setTimeout(function() {
                //console.log('atpause', (this.context.currentTime - startCtxTime) * 1000, (Date.now() - startDateTime));
                this.processorNode.disconnect();
                this.running = false;
                // Reset to next note
                this.sequence = restoreSequence;
                this.elapsed = this.seqIdx == 0 ? 0
                    : this.sequence[this.seqIdx][0];
                this.writeSample = 0;

                onComplete && onComplete.bind(this)();
            }.bind(this), timeout);

            /*
            timeout = this.stepSec;
            timeout += 100;

            var doPause = function(t) {
                var progress = t - start;

                console.log('inc', t - lastT);
                // TODO: timing tests
                lastT = t;

                if (progress >= timeout) {

                    this.processorNode.disconnect();
                    this.running = false;
                    // Reset to next note.
                    this.sequence = restoreSequence;
                    this.elapsed = this.seqIdx == 0 ? 0
                        : this.sequence[this.seqIdx][0];
                    this.writeSample = 0;

                    onComplete && onComplete.bind(this)();
                } else {
                    this.pauseRequestId = requestAnimationFrame(doPause);
                }
            }.bind(this);

            var requestAnimationFrame =  window.mozRequestAnimationFrame 
            //var requestAnimationFrame = window.requestAnimationFrame
            //    || window.mozRequestAnimationFrame 
                || window.webkitRequestAnimationFrame;
            var start = window.mozAnimationStartTime || Date.now();
            
            // TODO: timing tests
            var lastT = start;

            // FIXME: 
            if (this.pauseRequestId !== undefined) {
                console.log('yo');
                window.cancelAnimationFrame(this.pauseRequestId);
            }
            this.pauseRequestId = requestAnimationFrame(doPause); 
            */

        }.bind(this)); // setUpdateHook call
    
    }, // pause

    stageBeatEvent: function(idx, length, onsetDelay) { // onsetDelay in seconds
        // FIXME: does this timeout matter, when visual perception has 200ms LND?
        setTimeout(function() {
            var evt = document.createEvent('Event');
            evt.initEvent('beat', false, false);
            evt.length = idx * length * 1000;
            evt.beat = parseInt(idx);
            document.dispatchEvent(evt);
        }, onsetDelay * 1000);
    },
    
    onProcess: function(evt) {
        if (! this.running) {
            return;
        }
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
            }
        }
        // Last note case.
        if (
            this.seqIdx == this.sequence.length - 1
            && this.newNote
        ) {
            $.event.trigger('loop');
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
            //    (by < rampLen) to complete ramp out.
            if (bufferEnd < nextAttack) {
                var blockLength = buffer.length;
            } else { 
                var blockLength = parseInt(this.stepSec * this.sampleRate);
            }

            this.fillBuffer(
                hertz, blockLength, stereoBuffer, 0, true, 0
            );

            // Perform sequence update between notes.
            if (this.updateHook) {
                this.updateHook(this.stepSec * 1000);
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
        this.updateHook = null;
        this.running = false;
    
    }
}); // ClangRow

var ToneRow = ClangRow.extend({
    init: function(context, bufferLength, sampleRate, baseGain) {
        this._super(context, bufferLength, sampleRate, baseGain);

        this.sampleProc = this.sine;
        this.currentTone = 'sine';
        this.hzGain = this.bleat;
    },
    noise: function(hz, idx, phase) {
        return 1 - (Math.random() * 2);
    },
    sine: function(hz, idx, phase) {
        (phase === undefined) && (phase = 0);
        var sampleVal = Math.sin(
            hz * (2 * Math.PI) * idx / this.sampleRate + phase
        );
        return sampleVal;
    },
    // FIXME: this is totally arbitrary - add all partials  < nyquist
    partials: 20,
    square: function(hz, idx, phase) {
        (phase === undefined) && (phase = 0);
        var sampleVal = this.sine(hz, idx, phase);
        for (var part = 1; part <= this.partials; part++) {
            var partGain = 1 / (2 * part - 1),
                partHz = (2 * part - 1) * hz;
            sampleVal += partGain * this.sine(partHz, idx, phase);
        }
        // TODO: tone -> gain mapping
        return 0.14 * sampleVal;
    },
    bleat: function(hz) {
        var divisor = 220,      // "cutoff"
            multiplier = 2.4;   // "max gain"
        var cosh = function(n) {
            return (Math.exp(n) + Math.exp(-n)) / 2;
        };
        var gainVal = 1 / cosh(hz / divisor) * multiplier * this.baseGain;
        
        return gainVal;
    },
    crinkle: function(hz) {
        var gainVal = 5 / Math.sqrt(2*Math.PI) * Math.pow(
            Math.E, (-1 / 200000 * Math.pow(hz, 2))
        );
        return gainVal;
    },
    unity: function(hz) {
        return this.baseGain * 0.65;
    }
});



