"use strict";

var util = {
    type: function(obj) {
        return Object.prototype.toString.call(obj).match(/(\w+)\]/)[1];
    }
}
function ClangForms(sampleRate) {
    var clangForms = {

        getTone: function(tone) {
            var toneSpec = this.tone[tone].slice();
            var synthHook = toneSpec.shift();
            var gainHook = toneSpec.shift();
            //console.log(tone, this.tone, synthHook, gainHook, toneSpec);
            var toneProcs = [
                util.type(synthHook) == 'Function' ? synthHook
                    : this.sampleGen[synthHook].bind(this.sampleGen),
                util.type(gainHook) == 'Function' ? gainHook
                    : this.nGain[gainHook]
            ];
            console.log(toneProcs);
            return toneProcs.concat(toneSpec);  // Concat multipliers.
        },

        sampleGen: {
            noise: function() {
                return 1 - (Math.random() * 2);
            },
            sine: function(idx, hz, sampleRate) {
                var sampleVal = Math.sin(
                    hz * (2 * Math.PI) * idx / sampleRate 
                );
                return sampleVal;
            },
            square: function(idx, hz, sampleRate) {
                function sine(idx, hz, sampleRate) {
                    var sampleVal = Math.sin(
                        hz * (2 * Math.PI) * idx / sampleRate 
                    );
                    return sampleVal;
                };
                // XXX: add all partials  < nyquist
                var partials = 20;
                var sampleVal = sine(hz, idx, sampleRate);
                for (var part = 1; part <= partials; part++) {
                    var partGain = 1 / (2 * part - 1);
                    var partHz = (2 * part - 1) * hz;
                    sampleVal += partGain * sine(partHz, idx, sampleRate);
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
                var gainVal = 1 / cosh(hz / divisor) * multiplier;
                
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
                return 0.65;
            }

        }
    };
    clangForms.tone = {
        sine: [clangForms.sampleGen.sine, clangForms.nGain.bleat],
        square: [
            clangForms.sampleGen.square, 
            clangForms.nGain.bleat
        ],
        spring: [
            soundtoyTones._getSampleProc('bell', sampleRate),
            clangForms.nGain.crinkle, 
            //0.2
            0.65
        ],
        organ: [
            soundtoyTones._getSampleProc('piano1', sampleRate),
            clangForms.nGain.bleat,
            0.65
        ],
        wind: [
            soundtoyTones._getSampleProc('flute1', sampleRate),
            clangForms.nGain.crinkle, 
            0.8125
        ]
    };
    return clangForms;
}


// XXX: ? use options arg - for buflen, gain, clangform/tone, inputs, outputs, etc .. implying defaults ?
// context, reader, relay, config/options 
// [XXX: config for base settings, options for reconfigurables? - but, overlap]
function Clang(
    context,        // swappable? 
    bufferLength,   // not swappable 
    baseGain,       // s
    clangForm,      // s 
    reader,         // s
    relay           // not?
) {

    // Prototype
    var clang = {

        // XXX: hmm, context and maybe bufferLength should be referenced directly,
        //      not linked to this - as relay currently is [ would this mean 
        //      problems for possible extensions of this obj-instantiation form? ]
        context: context,
        sampleRate: context.sampleRate,
        bufferLength: bufferLength,
        baseGain: baseGain,
        reader: reader || function() { return null; },

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
            //synthParams, fillSamps, buffers, offsetSamps, duckOut
        ) {
            //this.synthProc = bell;
            //this.gainProc = function() { return 1; };
            var gain = this.gainProc(synthParams[0]) * this.baseGain;
            var bufferIdx = offsetSamps;
            var bufferEndIdx = offsetSamps + fillSamps;
            var fadeStart = bufferEndIdx - (duckOut ? this.rampLen : 0);
            var sampleVal;

            while (bufferIdx < fadeStart) {
                sampleVal = this.synthProc(
                    this.sampleIdx, synthParams[0], this.sampleRate
                ) * gain + 0;
                buffers[0][bufferIdx] = buffers[1][bufferIdx] = sampleVal;
                bufferIdx++;
                this.sampleIdx++;
            }

            if (duckOut) {
                var fadePos = this.rampLen;
                while (bufferIdx < bufferEndIdx) {
                    sampleVal = (fadePos-- / this.rampLen)
                        * this.synthProc(
                            this.sampleIdx, synthParams[0], this.sampleRate
                        ) * gain + 0; 
                    buffers[0][bufferIdx] = buffers[1][bufferIdx] = sampleVal;
                    bufferIdx++;
                    this.sampleIdx++;
                }
            }
        },
        
        setForm: function(hook) {
            if (util.type(hook) == 'Function') {
                this.synthProc = hook;
            } else {
                // Later synthProc call will throw error if no such method.
                var clangFactors = this.forms.tone[hook].slice();
                var synthProc = clangFactors.shift();
                var gainProc = clangFactors.shift() || function() { return 1; };
                var multiplier = 1;
                while (clangFactors.length) {
                    multiplier *= clangFactors.shift();
                }
                this.synthProc = function(idx, hz) {
                    return synthProc(idx, hz, this.sampleRate);
                };
                this.gainProc = function(hz) {
                    return gainProc(hz) * multiplier;
                }
            }

        },

        go: function() {
            this.processorNode.connect(this.context.destination);
        },

        stop: function() {
            // XXX: schedule null clang and disconnect
            this.processorNode.disconnect();
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
                    relay.publish('clang_onset', [0, this.duration]);
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
                    //this.params, buffer.length, stereoBuffer, 0, false
                );
            } else {
                //console.log(this.params); 
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
                    //this.params, blockLength, stereoBuffer, 0, true
                );

                relay.publish('clang_end', [tailDuration, this.duration]);

                this.readNext();
                //console.log(this);

                // Publish clang_onset event if next clang isn't silent.
                if (this.duration) {
                    relay.publish('clang_onset', [tailDuration, this.duration]);
                }

                var offset = blockLength;
                blockLength = buffer.length - offset;

                this.populateBuffers(
                    stereoBuffer, this.params, offset, blockLength, false 
                    //this.params, blockLength, stereoBuffer, offset, false
                );

            }
            
            this.elapsed += buffer.duration;
            
        }

    };

    // Initialization
    clang.processorNode.onaudioprocess = clang.bufferHandler.bind(clang); 
    //clangForms.sampleRate = clang.sampleRate;
    //clangForms.baseGain = clang.baseGain;
    clang.forms = ClangForms(clang.sampleRate);
    clang.setForm(clangForm);
    
    return clang;
}
