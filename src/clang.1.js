
include(['src/clangForms'], function() {
//console.log('ff');

}); 

function Clang(config, options) {

    var clang = {
        
        sampleIdx: 0,
        elapsed: 0,
        duration: 0,
        length: 0,
        written: 0,
        buffer: null,
        haltedReader: null,
        // XXX: interruptedReader: null,

        // XXX: init w/ starting=true, or params=null
        params: [],
        //params: null,
        //starting: false,
        starting: true,
        
        //init: function(forms, config, options) {
        init: function(config, options) {

            this.context = config.context || this.initContext();
            this.destination = config.destination || this.context.destination;
            this.sampleRate = this.context.sampleRate;
            this.bufferLength = config.bufferLength || 1024;
            this.relay = config.relay || window.relay;

            this.reader = this.nullReader;
            this.haltedReader = options.reader || this.nullReader;
            
            this.rampLen = options.rampLen || 240;
            this.baseGain = options.baseGain || 0.8;

            this.forms = ClangForms(this.sampleRate);
            this.setForm(options.clangForm || 'sine');

            this.processorNode = this.context.createScriptProcessor(
                this.bufferLength, 0, 2
            );
            this.connect();

            return this;
        },
        
        initContext: function() {
            var contextClass;
            if (
                contextClass = (window.AudioContext || window.webkitAudioContext)
            ) {
                var audioContext = new contextClass();
                audioContext.backend = 'webaudio';
            } else {
                var audioContext = new mozFlashAudioContext();
            }
            return audioContext; 
        },
        connect: function() {
            this.processorNode.onaudioprocess = this.bufferWriter.bind(this);
            this.processorNode.connect(this.destination); 
        },
        disconnect: function() {
            this.processorNode.onaudioprocess = null;
            this.processorNode.disconnect();
        },
        
        go: function() {
            if (this.reader == this.nullReader) {
                this.starting = true;
                this.reader = this.haltedReader;
                this.haltedReader = null;
            }
        },
        halt: function() {
            if (this.reader != this.nullReader) {
                this.haltedReader = this.reader;
                this.reader = this.nullReader;
            }
        },

        ring: function(dur, hz, form, tuning) {
            //this.interruptedReader = this.haltedReader || this.reader;
            this.preempt = true;
            this.haltedReader == this.nullReader 
                || (this.haltedReader = this.reader);
            var step = 0;
            this.reader = function() {
                console.log('ringer', step, dur, hz);
                if (step == 0) {
                    step = 1;
                    if (form) {
                    }
                    if (tuning) {
                    }
                    //return [dur, {hz: hz, idx: 0, ratio: 0, time: dur}];
                    return [dur, {hz: hz, idx: 0, ratio: 0, time: dur, value: hz}];
                } else {
                    console.log(this.reader, this.haltedReader);
                    this.reader = this.nullReader;
                    return null;
                }
            };
        },

        nullReader: function() {
            return null;
        },

        updateReader: function(reader) {
            // Swap active reader if playing, otherwise set to read on play.
            if (this.length) {
                this.reader = reader;
            } else {
                this.reader = this.nullReader;
                this.haltedReader = reader;
            }
        },

        readNext: function(playbackTime) {
            var spec = this.reader();
            //console.log('rnext', spec);
            this.duration = spec ? spec[0] : 0;
            this.params = spec ? spec[1] : {};
            this.sampleIdx = this.noReset ? this.sampleIdx : 0; 

            this.length = Math.round(this.duration * this.sampleRate);
            this.length && this.broadcastEdge([
                0, this.duration, this.context.currentTime, playbackTime 
            ]);

            // XXX:
            this.envelope = this.buildEnvelope();
            this.written = 0;
        },

        // XXX: optimizations 
        //      - memoize and fetchEnvelope each readNext
        //      - parcel out extremely long, eg, 20-minute notes
        //      -- 20min = 1200sec = 52,920,000samps
        //      -- so an async wrt buffers approach would solve
        //      - inline math in fillBuffer
        buildEnvelope: function() {

            var points = this.params.env || [[0, 1], [0.95, 1]];
            points[points.length - 1][0] == 1 || points.push([1, 0]);
            var envelope = [];

            var pastPoint = [0,0];

            var clangLen = this.length;
            
            points.forEach(function(point) {
                var len = (point[0] - pastPoint[0]) * clangLen;
                var height = point[1] - pastPoint[1];
                var slope = height / len;
                var offset = pastPoint[1];
                for (var x = 0; x < len; x++) {
                    envelope.push(slope * x + offset);
                }
                pastPoint = point;
            });
            return envelope;
        },
        buildEnvEdge: function(len, height, offset) {
            var edge = [];
            var slope = height / len;
            for (var x = 0; x < len; x++) {
                edge.push(slope * x + offset);
            }
            return edge;
        },

        broadcastEdge: function(data) {
            this.relay && this.relay.publish('clang_edge', {
                onsetSecs: data[0],
                duration: data[1],
                contextTime: data[2],
                playbackTime: data[3] 
            });
        },

        // XXX: To Testing
        mockProcessingEvent: {
            outputBuffer: {
                length: 1024,
                buffer: [
                    [], //new Int32Array(1024), 
                    new Int32Array(1024), 
                ],
                getChannelData: function(channel) {
                    return this.buffer[channel];
                }
            }
        },
        // XXX: sender/receiver idiom
        log: [],
        test: function(reset) {
            reset && (this.starting = true);
            this.processorNode.disconnect();
            this.reader = this.haltedReader;
            this.log = [];
            this.bufferWriter(this.mockProcessingEvent);
            return this.mockProcessingEvent.outputBuffer.buffer[0];
        },

        setupPreempt: function() {
            // pre: buffer is at 0
            //      this.written represents samples written of clang/this.length
            //
            // XXX: dur/len and env are changing

            // Rewrite tail of envelope to duck out.
            var tailLen = 256; //this.length * 0.05; // XXX: uh, long notes ?
            for (var idx in (new Int8Array(tailLen))) {
                this.envelope[idx + this.written] = (tailLen - idx) / tailLen;
            }
            this.fillBuffers(tailLen, 0);
        },
        closePreempt: function() {
            this.preempt = false;
        },

        buffer: null,
        bufferWriter: function(evt) {
 
            // Read initial parameters.
            /*
            if (this.starting) {
                this.readNext(evt.playbackTime);
                //this.length && this.broadcastEdge([
                //    0, this.duration, this.context.currentTime, evt.playbackTime 
                //]);
                this.starting = false;
            }
            */
            if (this.starting || this.preempt) {
                this.preempt && this.setupPreempt();
                this.readNext(evt.playbackTime);
                this.preempt && this.closePreempt();
                this.starting = false;
            }

            //delete this.buffer;
            this.buffer = evt.outputBuffer;
            /*
            if (this.duration == 0) {
                this.fillBuffers(0, this.buffer.length, true); 
                return; // Early return.
            }
            */

            var bufferTail = this.buffer.length;
            var clangTail = this.length - this.written;
            //var clangEnding = clangTail <= bufferTail;
            var clangEnding = clangTail > 0 && clangTail <= bufferTail;

            while (clangEnding) {
                this.fillBuffers(this.buffer.length - bufferTail, clangTail);
                bufferTail -= clangTail;
                this.readNext(evt.playbackTime);
                //this.length && this.broadcastEdge([
                //    0, this.duration, this.context.currentTime, evt.playbackTime 
                //]);
                //this.written = 0;
                // XXX: catch null length / halted
                clangTail = this.length;
                clangEnding = clangTail && clangTail <= bufferTail;
            }
            this.fillBuffers(
                this.buffer.length - bufferTail, bufferTail, ! this.length
            );

            this.written += bufferTail;
        },

        
        //fillBuffers: function(buffer, offset, fill) {
        fillBuffers: function(offset, fill, silence) {
            // Populate current buffer from @offset, through @fill
            // with the result of combining 
            //     the output of form.clangProc
            //     with the aplitude factors from form.envelope
            //     and form.gainFactor
            // or with zeroes if @silence

            //this.log.push(['fB', offset, fill, silence]);

            var buffers = [
                this.buffer.getChannelData(0),
                this.buffer.getChannelData(1)
            ];
            //for (var chIdx = 0; chIdx < buffer.numberOfChannels; chIdx++) {
            //    buffers[chIdx] = this.buffer.getChannelData(chIdx);
            //}
            
            for (var idx = offset; idx < offset + fill; idx++) {
                var sampleIdx = this.written + idx - offset;
                /*
                this.log.push(sampleIdx,
                    this.synthProc(sampleIdx, this.params, this.sampleRate),
                    this.params, ['filling', offset, offset + fill, idx]);
                */
                var sampleVal = silence ? 0
                    : this.synthProc(sampleIdx, this.params, this.sampleRate);
                sampleVal *= this.gainProc(this.params) * this.baseGain;
                sampleVal *= this.envelope[sampleIdx];
                buffers[0][idx] = buffers[1][idx] = sampleVal;
                //for (var chIdx = 0; chIdx < buffer.numberOfChannels; chIdx++) {
                //    buffers[chIdx][idx] = sampleVal;
                //}
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
                var clangFactors = this.forms.tone[hook];//.slice();
                
                if (clangFactors.synthProc) {
                    // Pass sampleRate
                    this.synthProc = function(idx, params) {
                        return clangFactors.synthProc(idx, params, this.sampleRate);
                    };
                }
                if (clangFactors.gainProc) {
                    // Compose with multiplier.
                    this.gainProc = function(params) {
                        return clangFactors.gainProc(params) 
                            * (clangFactors.multiplier || 1);
                    }
                }

                // XXX: fix rampLen/in/out/proc design
                if (clangFactors.rampLen) {
                    if (util.type(clangFactors.rampLen) == 'Function') {
                        this.fadeLenProc = clangFactors.rampLen;
                    } else if (util.type(clangFacors.rampLen) == 'Number') {
                        // XXX: ugh: this may or may not change with f()
                        //      should be 'base' - ms for min hz ? per hz ? ratio ?
                        this.rampLen = clangFactors.rampLen;
                    }
                }
                // XXX: duckIn, holdOut, noReset, rampInLen, rampOutLen
                ['duckIn', 'holdOut', 'noReset'].forEach(function(prop) {
                    //console.log(prop, clangFactors[prop]);
                    this[prop] = clangFactors[prop] || this[prop];
                }.bind(this));

            }

        }, // setForm: function(hook)
    };

    return Object.create(clang).init(config, options); 
}


// XXX:
function ClangForms(sampleRate) {

    // Factors.

    // XXX: Unary parmeter, eg hz.
    var sampleGen = {
        // XXX: ? idx += params.phase || 0; ?
        //      ? vs +popBufrs: sval+=phase ? or +sampidx+=phase ?
        noise: function() {
            return 1 - (Math.random() * 2);
        },
        sine: function(idx, params, sampleRate) {
            var sampleVal = Math.sin(
                params.hz * (2 * Math.PI) * idx / sampleRate 
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
            var sampleVal = sine(params.hz, idx, sampleRate);
            // for (var part = 1; partHz > sampleRate / 2; part++) {
            for (var part = 1; part <= partials; part++) {
                var partGain = 1 / (2 * part - 1);
                var partHz = (2 * part - 1) * params.hz;
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

/*
*/
    // Families.

    // forms = { 
    //     tone: {..}, 
    //     bity: {..}, 
    //     mod: {am, rm, fm, etc: two-parmers} 
    // }
    var tone = {
        sine: {
            duckIn: false,
            // XXX: sampleProc: sampleGen.sine, 
            synthProc: sampleGen.sine, 
            // XXX: blockFactor: nGain.bleatHz
            gainProc: nGain.bleatHz
        },
        square: {
            synthProc: sampleGen.square, 
            gainProc: nGain.bleatHz
        },
        //
        // XXX: dress with phase - in stoytones.js
        spring: {
            // XXX: wrap with params.phase
            synthProc: soundtoyTones._getSampleProc('bell', sampleRate),
            gainProc: nGain.crinkleHz,
            multiplier: 0.65
        },
        organ: {
            synthProc: soundtoyTones._getSampleProc('piano1', sampleRate),
            gainProc: nGain.crinkleHz,
            multiplier: 0.65
        },
        wind: {
            synthProc: soundtoyTones._getSampleProc('flute1', sampleRate),
            gainProc: nGain.crinkleHz,
            multiplier: 0.6//0.8125
        },
        
        // XXX: var bity: { zed, oh, to, fre, fur, fiv, sek, seb, eig, nin, zed-oh, ... }
        blip: {
            // XXX: ? always duck in first played step ?
            // Fade in gain when step begins. 
            duckIn: true,
            // Continue without ducking out on step edges.
            // XXX: ? will this click when 'hz'/param.hz changes ?
            //holdOut: true,
            // Continuously elapse start-index/position across steps.
            noReset: true,
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
    return {
        tone: tone,
        bity: tone.blip,
        sampleGen: sampleGen,
        nGain: nGain
    };

}

//}); // include

