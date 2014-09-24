"use strict";


 function ClangForms(clang) {
    var clangForms = {
        tone: {
            sine: function(idx, hz) {
                var val = this.sampleGen.sine(idx, hz)
                    * this.nGain.bleat(hz); 
                return val;
            },
            square: function(idx, hz) {
                return this.sampleGen.square(idx, hz)
                    * this.nGain.bleat(hz);
            },
            spring: function(idx, hz) {
                return soundtoyTones._getSampleProc('spring')(idx, hz)
                    * 0.6 * this.nGain.crinkle(hz);
            },
            organ: function(idx, hz) {
                return soundtoyTones._getSampleProc('piano1')(idx, hz)
                    * 0.65 * this.nGain.bleat(hz);
            },
            wind: function(idx, hz) {
                return soundtoyTones._getSampleProc('flute1')(idx, hz)
                    * 0.65 * this.nGain.crinkle(hz);
            }
        },

        sampleGen: {
            noise: function() {
                return 1 - (Math.random() * 2);
            },
            sine: function(idx, hz) {
                var sampleVal = Math.sin(
                    hz * (2 * Math.PI) * idx / clang.sampleRate 
                );
                return sampleVal;
            },
            square: function(idx, hz) {
                //console.log(this);
                // XXX: add all partials  < nyquist
                var partials = 5;
                var sampleVal = this.sine(hz, idx);
                for (var part = 1; part <= partials; part++) {
                    var partGain = 1 / (2 * part - 1);
                    var partHz = (2 * part - 1) * hz;
                    sampleVal += partGain * this.sine(partHz, idx);
                }
                return 0.14 * sampleVal;
            },
        },
        // XXX: s/nGain/x2y
        nGain: {
            bleat: function(hz) {
                var divisor = 220,      // "cutoff"
                    multiplier = 2.4;   // "max gain"
                var cosh = function(n) {
                    return (Math.exp(n) + Math.exp(-n)) / 2;
                };
                var gainVal = 1 / cosh(hz / divisor) * multiplier 
                    * clang.baseGain;
                
                return gainVal;
            },
            crinkle: function(hz) {
                // XXX: baseGain ???
                var gainVal = 5 / Math.sqrt(2*Math.PI)// * clang.baseGain 
                    * Math.pow(
                        Math.E, (-1 / 200000 * Math.pow(hz, 2))
                    );
                return gainVal;
            },
            unity: function(hz) {
                return clang.baseGain * 0.65;
            }

        }
    };
    return clangForms;
}


// XXX: ? use options arg - for buflen, gain, clangform/tone, inputs, outputs, etc .. implying defaults ?
// context, reader, relay, config/options 
// [XXX: config for base settings, options for reconfigurables? - but, overlap]
function Clang(
    context, 
    bufferLength, 
    baseGain, 
    clangForm, 
    reader, // reader
    relay
) {

    // Prototype
    var clang = {

        // XXX: hmm, context and manbe bufferLength should be referenced directly,
        //      not linked to this
        context: context,
        sampleRate: context.sampleRate,
        bufferLength: bufferLength,
        baseGain: baseGain,
        // XXX: ? getter / readNext / grabNext / reader / nextGetter ?
        reader: reader || function() { return null; },
        //synthProc: synthProc || 'sine',

        running: false,
        rampLen: 240,
        sampleIdx: 0,
        elapsed: 0,

        duration: 0,    // Clang duration.
        params: [],     // Params for synthProc.

        processorNode: context.createScriptProcessor(
            bufferLength, 0, 2//2, 2
        ),

        // XXX: future interface 
        //  buffers, synthParams, offsetSamps, fillSamps, phase, duckIn, duckOut
        populateBuffers: function(
            buffers, synthParams, offsetSamps, fillSamps, duckOut
        ) {
            var bufferIdx = offsetSamps;
            var bufferEndIdx = offsetSamps + fillSamps;
            var fadeStart = bufferEndIdx - (duckOut ? this.rampLen : 0);
            var sampleVal;

            while (bufferIdx < fadeStart) {
                sampleVal = this.synthProc(
                    this.sampleIdx, synthParams
                );
                buffers[0][bufferIdx] = buffers[1][bufferIdx] = sampleVal;
                bufferIdx++;
                this.sampleIdx++;
            }

            if (duckOut) {
                var fadePos = this.rampLen;
                while (bufferIdx < bufferEndIdx) {
                    sampleVal = (fadePos-- / this.rampLen) 
                        * this.synthProc(
                            this.sampleIdx, synthParams
                        ); 
                    buffers[0][bufferIdx] = buffers[1][bufferIdx] = sampleVal;
                    bufferIdx++;
                    this.sampleIdx++;
                }
            }
        },
        
        // XXX: clagforms lib ref or proc - hook
        setClangForm: function(hook) {

            // XXX: util.type
            var argType = Object.prototype.toString.call(
                hook
            ).match(/(\w+)\]/)[1];

            if (argType == 'Function') {
                this.synthProc = hook;
            } else {
                // Later synthProc call will throw error if no such method.
                // XXX: .. = clangForms...
                this.synthProc = this.clangForms.tone[hook].bind(this.clangForms);
            }

        },

        go: function() {
            this.processorNode.connect(this.context.destination);
        },

        stop: function() {
            // schedule: null clang then disconnect
        },        

        readNext: function() {
            var spec = this.reader();
            this.duration = spec ? spec[0] : 0;
            this.params = spec ? spec[1] : [];
            this.elapsed = 0;
            this.sampleIdx = 0;
        },

        bump: function() {
            this.running = false;
        },

        bufferHandler: function(evt) {

            if (! this.running) {
                this.readNext();
                if (this.duration) {
                    // XXX: ? called sync, before any buffer manipulation ?
                    relay.publish('clang_edge', [0, this.duration]);
                }
            }

            this.running || (this.running = true);

            var buffer = evt.outputBuffer;
            var stereoBuffer = [
                buffer.getChannelData(0),
                buffer.getChannelData(1)
            ];

            if (! this.duration) {  // Silence.
                for (var idx=0; idx < buffer.length; idx++) {
                    stereoBuffer[0][idx] = stereoBuffer[1][idx] = 0;
                }
                return;
            }

            var rampOnset = this.duration - (this.rampLen / this.sampleRate);
            var bufferEndTime = this.elapsed + buffer.duration;
            var clangEnding = rampOnset <= bufferEndTime;

            if (! clangEnding) {
                // Fill buffer and continue.
                this.populateBuffers(
                    stereoBuffer, this.params, 0, buffer.length, false
                );
            } else {
                
                var tailDuration = this.duration - this.elapsed;

                // If ramp-out won't fit in this buffer shorten it, leaving
                // (n < rampLen) samples of inserted silence for next buffer.
                var rampCrossesBuffer = bufferEndTime < this.duration; 
                if (rampCrossesBuffer) {
                    console.log('ramp crossing buffer');
                    var blockLength = buffer.length;
                } else { 
                    var blockLength = parseInt(tailDuration * this.sampleRate);
                }

                this.populateBuffers(
                    stereoBuffer, this.params, 0, blockLength, true
                );

                this.readNext();
                //console.log(this);

                // Publish clang_edge event if next clang isn't silent.
                if (this.duration) {
                    relay.publish('clang_edge', [tailDuration, this.duration]);
                }

                var offset = blockLength;
                blockLength = buffer.length - offset;

                this.populateBuffers(
                    stereoBuffer, this.params, offset, blockLength, false 
                );

            }
            
            this.elapsed += buffer.duration;
            
        }

    };

    // Initialization
    clang.processorNode.onaudioprocess = clang.bufferHandler.bind(clang); 
    //clangForms.sampleRate = clang.sampleRate;
    //clangForms.baseGain = clang.baseGain;
    //clang.setClangForm(clangForm);
    clang.clangForms = ClangForms(clang);
    clang.setClangForm(clangForm);
    
    return clang;
}
