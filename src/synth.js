
var ToneRow = Class.extend({
    init: function(context, bufferLength) {
        this.context = context;
        this.sampleRate = this.context.sampleRate;
        this.bufferLength = bufferLength;

        this.jsNode = this.context.createJavaScriptNode(
            this.bufferLength, 0, 2
        );
        this.jsNode.onaudioprocess = this.onProcess.bind(this); 

        var baseGain = 0.8;
        this.block = new ToneBlock(this.sampleRate, baseGain);

        this.reset();
        this.sequence = [];
        this.sequenceUpdateHook = null;
        this.running = false;
    },
    setUpdateHook: function(newHook) {
        var restoreUpdateHook = this.sequenceUpdateHook;
        this.sequenceUpdateHook = function() {
            newHook();
            this.sequenceUpdateHook = restoreUpdateHook;
        };
    },
    updateSequence: function(sequence) {
        if (this.running) {
            this.setUpdateHook(function() {
                this.sequence = sequence;
            }.bind(this));
        } else {
            this.sequence = sequence;
        }
    },
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
    pause: function(onComplete) {
        this.setUpdateHook(function() {
            // Store current sequence, blank, disconnect and restore
            var restoreElapsed = this.elapsed;

            //console.log(this.elapsed, this.stepSec);
            
            var restoreSequence = [];
            // Manually copy seqence steps to restore
            for (var i in this.sequence) {
                restoreSequence[i] = this.sequence[i].slice();
            }
            // Empty sequence - set all notes to zero
            this.sequence = this.sequence.map(function(el, idx) {
                el[1] = 0;
                return el;
            });
            // FIXME:

            //console.log(this.bufferLength / this.sampleRate);
            
            // Somewhat arbitrary 110 ms pause - otherwise we get a click
            // FIXME: Explain: 
            setTimeout(function() {
                //console.log(this.newNote, this.elapsed, restoreElapsed);
                //console.log(this.elapsed - restoreElapsed);
                if (this.elapsed < restoreElapsed) {
                    console.log('crak?', restoreElapsed + this.stepSec, this.elapsed, restoreElapsed, this.sequence[this.sequence.length - 1], this.sequence[this.seqIdx][0]);
                } else {
                    console.log('ok', restoreElapsed + this.stepSec, this.elapsed, restoreElapsed, this.sequence[this.seqIdx][0]);
                }
                this.jsNode.disconnect();
                this.running = false;
                // Reset to next note
                this.sequence = restoreSequence;
                this.elapsed = restoreElapsed + this.stepSec;

                this.elapsed = this.seqIdx == 0 ? 0
                    : this.sequence[this.seqIdx][0];

                this.block.writeSample = 0;
                // Force first note case
                //this.newNote = true;
                this.onComplete && this.onComplete();
            }.bind(this), 110);//this.bufferLength / this.sampleRate * 1000 + 10);//0);//110);
        }.bind(this));
    },
    reset: function() {
        this.firstLoop = true;
        this.newNote = true;
        this.seqIdx = 0;
        this.elapsed = 0;
        this.block.writeSample = 0;
    },
    stageBeatEvent: function(idx, length, onsetDelay) {
        setTimeout(function() {
            var evt = document.createEvent('Event');
            evt.initEvent('beat', false, false);
            evt.length = idx * length * 1000;
            evt.beat = parseInt(idx);
            document.dispatchEvent(evt);
        }, onsetDelay * 1000);
    },
    onProcess: function(evt) {
        var buffer = evt.outputBuffer,
            stereoBuffer = [
                buffer.getChannelData(0),
                buffer.getChannelData(1)
            ];
        var hertz = this.thisHz = this.sequence[this.seqIdx][1],
            nextSeqIdx = (this.seqIdx + 1) % this.sequence.length,
            nextAttack = this.nextAttack = this.sequence[nextSeqIdx][0],
            nextHertz = this.sequence[nextSeqIdx][1];
        var rampOnset = nextAttack - (this.block.rampLen / this.sampleRate);

        // Special cases for first note in sequence
        if (this.seqIdx === 0 && this.newNote) {
            if (this.firstLoop) {
                // Absolute beginning, so fire the first beat immediately 
                this.stageBeatEvent(this.seqIdx, nextAttack, 0);
                this.firstLoop = false;
            } else {
                //console.log('looping', this.elapsed, this.stepSec);

                // Looping, so rewind elapsed by unused buffer 
                this.elapsed = buffer.duration - this.stepSec;

                //console.log('adjusted', this.elapsed, this.stepSec);
            }
        }

        // Ramp-out begins within this buffer
        if (rampOnset <= this.elapsed + buffer.duration) {
            this.newNote = true;
            this.stepSec = nextAttack - this.elapsed;

            // If ramp-out crosses buffer boundary, fudge it
            if (this.elapsed + buffer.duration < nextAttack) {
                var blockLength = buffer.length;
            } else { 
                var blockLength = parseInt(this.stepSec * this.sampleRate);
            }

            this.block.fillBuffer(
                hertz, blockLength, stereoBuffer, 0, true, 0
            );

            // Perform sequence update between notes
            if (this.sequenceUpdateHook) {
                this.sequenceUpdateHook();
            }

            // Begin next note
            this.seqIdx = nextSeqIdx;
            hertz = this.sequence[nextSeqIdx][1];
            // Reset phase
            this.block.writeSample = 0;

            this.stageBeatEvent(this.seqIdx, nextAttack, this.stepSec);

            var offset = blockLength;
            blockLength = buffer.length - offset;

            this.block.fillBuffer(
                hertz, blockLength, stereoBuffer, offset, false, 0
            );
        } else {
            // Full single-Hz buffer
            this.newNote = false;
            this.block.fillBuffer(
                hertz, buffer.length, stereoBuffer, 0, false, 0
            );
        }
        this.elapsed += buffer.duration;
    }
});


var ToneBlock = Class.extend({
    init: function(sampleRate, baseGain) {
        this.sampleRate = sampleRate;
        this.baseGain = baseGain;

        this.sampleVal = this.sine;
        this.hzGain = this.bleat;

        this.rampLen = 250;
        this.writeSample = 0;
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
                    * this.sampleVal(hz, this.writeSample) + phase; 
                buffers[0][idx] = buffers[1][idx] = sampleVal;
            }
        }
    },
    // Sample values
    sine: function(hz, idx, phase) {
        (phase === undefined) && (phase = 0);
        var sampleVal = Math.sin(
            hz * (2 * Math.PI) * idx / this.sampleRate + phase
        );
        return sampleVal;
    },
    noise: function() {
        return sampleVal = 1 - (Math.random() * 2);
    },
    // Frequency based gain envelope
    bleat: function(hz) {
        var divisor = 220,      // "cutoff"
            multiplier = 2.4;   // "max gain"
        var cosh = function(n) {
            return (Math.exp(n) + Math.exp(-n)) / 2;
        };
        var gainVal = 1 / cosh(hz / divisor) * multiplier * this.baseGain;
        return gainVal;
    }
});
