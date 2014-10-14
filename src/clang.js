"use strict";

var util = {
    type: function(obj) {
        return Object.prototype.toString.call(obj).match(/(\w+)\]/)[1];
    },
    trace: function(proc) {
        try {
            proc();
        } catch(e) {
            console.log(e.stack);
        }
    }
}
function ClangForms(sampleRate) {

    // XXX: Unary parmeter, eg hz.
    var sampleGen = {
        // XXX: ? idx += params.phase || 0; ?
        //      ? vs +popBufrs: sval+=phase ? or +sampidx+=phase ?
        noise: function() {
            return 1 - (Math.random() * 2);
        },
        sine: function(idx, params, sampleRate) {
            var sampleVal = Math.sin(
                params.value * (2 * Math.PI) * idx / sampleRate 
            );
            return sampleVal;
        },
        square: function(idx, params, sampleRate) {
            function sine(idx, hz, sampleRate) {
                var sampleVal = Math.sin(
                    hz * (2 * Math.PI) * idx / sampleRate 
                );
                return sampleVal;
            };
            // XXX: add all partials  < nyquist
            var partials = 20;
            var sampleVal = sine(params.value, idx, sampleRate);
            // for )var part = 1; partHz > sampleRate / 2; part++) {
            for (var part = 1; part <= partials; part++) {
                var partGain = 1 / (2 * part - 1);
                var partHz = (2 * part - 1) * params.value;
                sampleVal += partGain * sine(partHz, idx, sampleRate);
            }
            return 0.14 * sampleVal;
        }

    };
    // XXX: s/nGain/x2y
    var nGain = {
        bleat: function(params) {
            var divisor = params.divisor || 220;      // "cutoff"
            var multiplier = params.divisor || 2.4;   // "max gain"
            var cosh = function(n) {
                return (Math.exp(n) + Math.exp(-n)) / 2;
            };
            var gainVal = 1 / cosh(params.value / divisor) * multiplier;
            
            return gainVal;
        },
        crinkle: function(params) {
            var gainVal = 5 / Math.sqrt(2*Math.PI)
                * Math.pow(
                    Math.E, (-1 / 200000 * Math.pow(params.value, 2))
                );
            return gainVal;
        },

        bleatHz: function(params) {
            params.value = params.hz;
            return nGain.bleat(params);
        },
        crinkleHz: function(params) {
            params.value = params.hz;
            return nGain.crinkle(params);
        },
        unity: function(params) {
            return params.factor || 0.65;
        }

    };

    var tone = {
        sine: {
            duckIn: true,
            synthProc: sampleGen.sine, 
            gainProc: nGain.bleat
        },
        square: {
            synthProc: sampleGen.square, 
            gainProc: nGain.bleat
        },
        /* */
        // XXX: dress with phase - in stoytones.js
        spring: {
            // XXX: wrap with params.phase
            synthProc: soundtoyTones._getSampleProc('bell', sampleRate),
            gainProc: nGain.crinkle,
            //0.2
            multiplier: 0.65
        },
        organ: {
            synthProc: soundtoyTones._getSampleProc('piano1', sampleRate),
            gainProc: nGain.crinkle,
            multiplier: 0.65
        },
        wind: {
            synthProc: soundtoyTones._getSampleProc('flute1', sampleRate),
            gainProc: nGain.crinkle,
            multiplier: 0.6//0.8125
        },
        /* */
        
        // XXX: var bity: { zed, oh, to, fre, fiv, sek, seb, eig, nin, zed-oh, ... }
        blip: {
            // XXX: ? always duck in first played step ?
            // Fade in gain when step begins. 
            //duckIn: true,
            // Continue without ducking out on step edges.
            // XXX: ? will this click when 'hz'/param.hz changes ?
            holdOut: true,
            // Continuously elapse start-index/position across steps.
            //noReset: true,
            synthProc: function(idx, params, sampleRate) {
                window.cache = window.cache || {};
                var f = function(t) {
                    //return (t * (t >> 9) & 46 & t >> 8) ^ (t & t >> 13 | t >> 6)
                    //return (t * (t >> 7) & 49 & t >> 2) ^ (t & t >> 14 | t >> 6)
                    //return (t * (t >> 77) & 4 & t >> 52) ^ (t & t >> 14 | t >> 6)
                    return ((t*(t>>19)&47&t>>8))^(t&t>>13|t>>6)
                };
                //var scale = (params.value - 55) / 685 * 3; // Hack
                var step = Math.round(
                    Math.log(params.ratio/55) / Math.log(Math.pow(2, 1/12))
                ); 
                // XXX: this is neat, no clicks, even without duckIn
                //var scale = step;
                // XXX: this is very bland
                //var scale = step / 100;
                var scale = step / 46; 
                var scale = 0.1 + step / 45;
                var scale = 0.1 + step / 4.5;
                //console.log(hz, scale);
                var scale = params.ratio * 10 + 0.01;
                window.cache[params.idx] || (window.cache[params.idx] = [params.ratio, scale]);
                var sampleVal = (f(idx * scale) & 0xff) * 512 / 65535 - 1;
                return sampleVal; 

            },
            gainProc: nGain.unity
        }
    };
    //var bits = {
    var bity = {
    };
    return {
        tone: tone,
        bity: tone.blip,
        sampleGen: sampleGen,
        nGain: nGain
    };
}


// XXX: ? use options arg - for buflen, gain, clangform/tone, inputs, outputs, etc .. implying defaults ?
// context, reader, relay, config/options 
// [XXX: config for base settings, options for reconfigurables? - but, overlap]
//function Clang(context, reader, relay, config) {
function Clang(
    context,        // swappable? 
    bufferLength,   // not swappable 
    baseGain,       // s
    clangForm,      // s 
    reader,         // s
    relay,          // not?
    destination
) {

    // Prototype
    var clang = {

        // XXX: hmm, context and maybe bufferLength should be referenced directly,
        //      not linked to `this` - as relay currently is [ would this mean 
        //      problems for possible extensions of this obj-instantiation form? ]
        context: context,

        destination: destination,

        sampleRate: context.sampleRate,
        //bufferLength: bufferLength,
        baseGain: baseGain,
        reader: reader || function() { return null; },

        // XXX: ? cleaner go/halt/reset mechanism ? 
        haltedReader: null,
        running: false,

        //rampLen: options.rampLen || 240,
        rampLen: 480,//300,//240,
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
            buffers, synthParams, offsetSamps, fillSamps, duckIn, duckOut, phase
        ) {
            //console.log(synthParams);
            phase = phase || 0;
            var gain = this.gainProc(synthParams) * this.baseGain;
            var bufferIdx = offsetSamps;
            var bufferEndIdx = offsetSamps + fillSamps;
            var fadeOutStart = bufferEndIdx - (duckOut ? this.rampLen : 0);
            var sampleVal;

            if (duckIn) {
                //console.log('DUCKIN', bufferIdx, this.sampleIdx, offsetSamps + this.rampLen);
                var fadePos = 0;
                while (bufferIdx < offsetSamps + this.rampLen) {
                    //console.log(bufferIdx);
                    //console.log(fadePos / this.rampLen);
                    sampleVal = (fadePos++ / this.rampLen)
                        * this.synthProc(
                            this.sampleIdx + phase, synthParams, this.sampleRate
                        ) * gain; 
                    buffers[0][bufferIdx] = buffers[1][bufferIdx] = sampleVal;
                    bufferIdx++;
                    this.sampleIdx++;
                }
                //console.log('DUCKINx', bufferIdx, this.sampleIdx);
            }

            while (bufferIdx < fadeOutStart) {
                sampleVal = this.synthProc(
                    this.sampleIdx + phase, synthParams, this.sampleRate
                ) * gain;
                buffers[0][bufferIdx] = buffers[1][bufferIdx] = sampleVal;
                bufferIdx++;
                this.sampleIdx++;
            }

            if (duckOut) {
                var fadePos = this.rampLen;
                while (bufferIdx < bufferEndIdx) {
                    sampleVal = (fadePos-- / this.rampLen)
                        * this.synthProc(
                            this.sampleIdx + phase, synthParams, this.sampleRate
                        ) * gain; 
                    buffers[0][bufferIdx] = buffers[1][bufferIdx] = sampleVal;
                    bufferIdx++;
                    this.sampleIdx++;
                }
            }
        },
        
        setForm: function(hook) {
            var hookType = util.type(hook);
            if (hookType == 'Function') {
                // Raw synthesis procedure.
                this.synthProc = hook;
            } else if (hookType == 'Object') {
                // XXX: Manual clangForm spec.
            } else if (hookType == 'String') {
                // Later synthProc call will throw error if no such method.
                //console.log(hook, this.forms, this.forms.tone[hook]);
                var clangFactors = this.forms.tone[hook];//.slice();
                
                /*
                var synthProc = clangFactors.shift();
                var gainProc = clangFactors.shift() || function() { return 1; };
                var multiplier = 1;
                // XXX: next is bool then duck-in and done,
                //      next is num then multiplier and if next is bool ibid
                while (clangFactors.length) {
                    multiplier *= clangFactors.shift();
                }
                */

                if (clangFactors.synthProc) {
                    this.synthProc = function(idx, hz) {
                        return clangFactors.synthProc(idx, hz, this.sampleRate);
                    };
                }
                if (clangFactors.gainProc) {
                    this.gainProc = function(hz) {
                        return clangFactors.gainProc(hz) 
                            * (clangFactors.multiplier || 1);
                    }
                }
                // duckIn, holdOut, noReset
                ['duckIn', 'holdOut', 'noReset'].forEach(function(prop) {
                    console.log(prop, clangFactors[prop]);
                    this[prop] = clangFactors[prop] || false;
                }.bind(this));

            }

        },

        connect: function() {
            this.processorNode.connect(
                this.destination || this.context.destination
            );
        },

        go: function() {
            // XXX: add iOS start kludge

            if (this.haltedReader) {
                this.reader = this.haltedReader.bind(this);
                this.bump();
            } else {
                // Initial case: halt has not yet been called
                this.processorNode.onaudioprocess = this.bufferHandler.bind(this);
            }

        },

        halt: function() {
            this.haltedReader = this.reader;
            this.reader = function() {
                return null;
            };
        },        

        readNext: function() {
            var spec = this.reader();
            this.duration = spec ? spec[0] : 0;
            this.params = spec ? spec[1] : [];
            this.elapsed = 0; // Reset step-length elapsed counter.
            //console.log(this.sampleIdx, this.params.noReset);
            this.sampleIdx = this.noReset ? this.sampleIdx : 0;
            //console.log(this.sampleIdx);
            //console.log(spec, this);
        },

        bump: function() {
            this.running = false;
        },

        bufferHandler: function(evt) {

            if (! this.running) {
                this.readNext();
                if (this.duration) {
                    // XXX: ? called sync, before any buffer manipulation ?
                    var msg = {
                        onsetSecs: 0,
                        duration: this.duration,
                        contextTime: this.context.currentTime,
                        playbackTime: evt.playbackTime 
                    };
                    relay && relay.publish('clang_edge', msg);
                    relay && relay.publish('clang_onset', msg);
                }
            }

            this.running || (this.running = true);

            var buffer = evt.outputBuffer;
            var stereoBuffer = [
                buffer.getChannelData(0),
                buffer.getChannelData(1)
            ];

            // Silence buffer.
            if (! this.duration) { 
                for (var idx=0; idx < buffer.length; idx++) {
                    stereoBuffer[0][idx] = stereoBuffer[1][idx] = 0;
                }
                // Note: Early return.
                return;
            }

            var rampOnset = this.duration - (this.rampLen / this.sampleRate);
            var bufferEndTime = this.elapsed + buffer.duration;
            var clangEnding = rampOnset <= bufferEndTime;

            if (! clangEnding) {
                // Fill buffer and continue.
                this.populateBuffers(
                    stereoBuffer, this.params, 0, buffer.length, false, false
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

                var duckOut = this.holdOut || true;
                this.populateBuffers(
                    stereoBuffer, this.params, 0, blockLength, false, duckOut 
                );

                relay && relay.publish('clang_end', {
                    onsetSecs: tailDuration,
                    duration: this.duration,
                    contextTime: this.context.currentTime,
                    playbackTime: evt.playbackTime
                });

                this.readNext();

                // XXX: this won't fire if we're 'silent'
                relay && relay.publish('clang_edge', {
                    onsetSecs: tailDuration, 
                    duration: this.duration,
                    contextTime: this.context.currentTime,
                    playbackTime: evt.playbackTime
                });

                // Publish clang_onset event if next clang isn't silent.
                //console.log('isgoin', Boolean(this.duration), Boolean(relay));
                if (this.duration) {
                    relay && relay.publish('clang_onset', {
                        onsetSecs: tailDuration, 
                        duration: this.duration,
                        contextTime: this.context.currentTime,
                        playbackTime: evt.playbackTime
                    });
                }

                var offset = blockLength;
                blockLength = buffer.length - offset;

                var duckIn = this.duckIn || false;
                this.populateBuffers(
                    stereoBuffer, this.params, offset, blockLength, duckIn, false
                );

            }
            
            this.elapsed += buffer.duration;
            
        }

    };

    // Initialization.
    clang.forms = ClangForms(clang.sampleRate);
    clang.setForm(clangForm);
    //clang.processorNode.onaudioprocess = clang.bufferHandler.bind(clang); 
    //clang.processorNode.connect(clang.context.destination);
    clang.connect.bind(clang)();
    
    return clang;
}
