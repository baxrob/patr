
//include(['clangForms'], function() {
//console.log('ff');
// 
function Clang(config, options) {

    var clang = {
        sampleIdx: 0,
        elapsed: 0,
        durationWritten: 0,
        duration: 0,
        params: [],
        haltedReader: null,
        starting: true,
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
            //this.processorNode.onaudioprocess = this.bufferHandler.bind(this);
            this.processorNode.onaudioprocess = this.bufferWriter.bind(this);
            this.processorNode.connect(this.destination); 
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

        ring: function(dur, params) {
            //this.interruptedReader = this.haltedReader || this.reader;
        },

        nullReader: function() {
            return null;
        },

        updateReader: function(reader) {
            // Swap active reader if playing, otherwise set to read on play.
            if (this.duration) {
                this.reader = reader;
            } else {
                this.reader = this.nullReader;
                this.haltedReader = reader;
            }
        },

        readNext: function() {
            var spec = this.reader();
            //console.log(spec);
            this.duration = spec ? spec[0] : 0;
            this.sampleLen = this.duration * this.sampleRate;
            this.params = spec ? spec[1] : {};
            this.sampleIdx = this.noReset ? this.sampleIdx : 0; 

            this.envelope = this.buildEnvelope();
            this.written = 0;
            this.length = this.duration * this.sampleRate;
        },
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
                //console.log(len, height, slope, offset, point, pastPoint);
                for (var x = 0; x < len; x++) {
                    envelope.push(slope * x + offset);
                }
                pastPoint = point;
            });
            //console.log(envelope);
            return envelope;
        },

        _buildEnvelope: function() {
            
            console.log(this.duration, this.sampleRate);
            
            var points = this.params.env || [[0, 1], [0.95, 1]];
            points[points.length - 1][0] == 1 || points.push([1, 0]);
            var envelope = [];

            var pastPoint = [0,0];
            
            points.forEach(function(point) {

                var dx = point[0] - pastPoint[0];
                var dy = point[1] - pastPoint[1];
                var scale = dy ? dx / dy : 1;
                var sampleIdx = 0;
                var endSample = dx * this.length; //this.duration * this.sampleRate;
                console.log('pt', point[0], point[1], dx, dy, dx/dy, scale, endSample);
                while (sampleIdx < endSample) {
                    envelope.push(sampleIdx * scale);
                    sampleIdx += 1;
                }
                pastPoint = point;

            }.bind(this));
            console.log('env', envelope);
            return envelope;

        },
        _buildEnvelope: function() {
            
            var sampleLen = this.duration * this.sampleRate;
            console.log(this.duration, this.sampleRate);
            
            var sampleIdx = 0;

            var previousSample = 0;
            var previousAmp = 0;
            
            var points = this.params.env || [[0, 1], [0.95, 1]];
            points[points.length - 1][0] == 1 || points.push([1, 0]);
            var envelope = [];

            var pastPoint = [0,0];
            
            points.forEach(function(point) {
                var targetSample = point[0] * sampleLen;
                var targetAmp = point[1];

                var dx = point[0] - pastPoint[0];
                var dy = point[1] - pastPoint[1];
                var scale = dy / dx;
                var sampleIdx = 0;
                var targetSample = dx * this.sampleRate;
                console.log('pt', point[0], point[1], dx, dy, targetSample);
                while (sampleIdx < targetSample) {
                    var edgeLen = targetSample - previousSample;
                    var rampPosition = (edgeLen - sampleIdx) / edgeLen;
                    var factor = targetAmp - previousAmp;
                    //envelope[sampleIdx] = targetAmp * rampFactor;
                    //envelope.push(rampPosition * factor);

                    //dx
                    envelope.push(sampleIdx * scale);

                    sampleIdx += 1;
                }
                pastPoint = point;

                previousSample = targetSample;
                previousAmp = targetAmp;
            }.bind(this));
            console.log('env', envelope, sampleLen, sampleIdx, envelope.length, this.duration);
            return envelope;
        },

        broadcastEdge: function(data) {
            this.relay && this.relay.publish('clang_edge', {
                onsetSecs: data[0],
                duration: data[1],
                contextTime: data[2],
                playbackTime: data[3] 
            });
        },
        //
        bufferHandler: function(evt) {

            // Read initial parameters.
            if (this.starting) {
                this.readNext();
                this.duration && this.broadcastEdge([
                    0, this.duration, this.context.currentTime, evt.playbackTime 
                ]);
                this.starting = false;
            }

            var buffer = evt.outputBuffer;
            var stereoBuffer = [
                buffer.getChannelData(0),
                buffer.getChannelData(1)
            ];

            // Silence buffer and bail out.
            if (! this.duration) { 
                for (var idx=0; idx < buffer.length; idx++) {
                    stereoBuffer[0][idx] = stereoBuffer[1][idx] = 0;
                }
                return; // Note: Early return.
            }

            var rampOnset = this.duration - (this.rampLen / this.sampleRate);
            var bufferEndTime = this.elapsed + buffer.duration;
            var clangEnding = rampOnset <= bufferEndTime;

            if (! clangEnding) {
                // Fill buffer and continue.
                this.populateBuffers(
                    stereoBuffer, this.params, 0, buffer.length, false, false
                );
                this.elapsed += buffer.duration;
            } else {
                var tailDuration = this.duration - this.elapsed;

                // If ramp-out won't fit in this buffer shorten it, leaving
                // (n < rampLen) samples of inserted silence at/for the start of
                // next buffer.
                var rampCrossesBuffer = bufferEndTime < this.duration; 
                if (rampCrossesBuffer) {
                    var blockLength = buffer.length;
                } else { 
                    var blockLength = parseInt(tailDuration * this.sampleRate);
                }

                var duckOut = this.holdOut || true;
                this.populateBuffers(
                    stereoBuffer, this.params, 0, blockLength, false, duckOut 
                );

                // XXX: handle multiple end/onsets in buffer
                this.readNext();

                this.duration && this.broadcastEdge([
                    tailDuration, this.duration, 
                    this.context.currentTime, evt.playbackTime 
                ]);

                var offset = blockLength;
                blockLength = buffer.length - offset;

                var duckIn = this.duckIn || false;
                //var duckIn = false;// this.duckIn || false;
                this.populateBuffers(
                    stereoBuffer, this.params, offset, blockLength, duckIn, false
                );

                //console.log(this.elapsed, buffer.duration, tailDuration, this.duration);
                this.elapsed = buffer.duration - tailDuration;

            }
            
        }, // bufferHandler: function(evt) {

        __bufferWriter: function bufferWriter(evt) {
            // Read initial parameters.
            if (this.starting) {
                this.readNext();
                this.duration && this.broadcastEdge([
                    0, this.duration, this.context.currentTime, evt.playbackTime 
                ]);
                this.starting = false;
            }

            var buffer = evt.outputBuffer;
            var stereoBuffer = [
                buffer.getChannelData(0),
                buffer.getChannelData(1)
            ];

            // Silence buffer and bail out.
            if (! this.duration) { 
                for (var idx=0; idx < buffer.length; idx++) {
                    stereoBuffer[0][idx] = stereoBuffer[1][idx] = 0;
                }
                return; // Note: Early return.
            }
            
            // var clangTailOnset = this.duration - this.durationWritten
            //     - (this.rampLen / this.sampleRate);
            if (this.duration - this.durationWritten > buffer.duration) {
                // Fill buffer and continue.
                this.populateBuffers(
                    stereoBuffer, this.params, 0, buffer.length, false, false
                );
                this.durationWritten += buffer.duration;
            } else {
                
            }

        }, // __bufferWriter

        buffer: null,
        written: 0,
        bufferWriter: function(evt) {
            //console.log(this.starting, this.duration, this.length);
            // Read initial parameters.
            if (this.starting) {
                this.readNext();
                this.duration && this.broadcastEdge([
                    0, this.duration, this.context.currentTime, evt.playbackTime 
                ]);
                this.starting = false;
            }
            //delete this.buffer;
            this.buffer = evt.outputBuffer;
            if (this.duration == 0) {
                this.fillBuffers(0, this.buffer.length, true); 
                return; // Early return.
            }
            var bufferTail = this.buffer.length;
            var clangTail = this.length - this.written;
            var clangEnding = clangTail <= bufferTail;
            //console.log(clangTail, bufferTail, clangEnding);
            while (clangEnding) {
                this.fillBuffers(this.buffer.length - bufferTail, clangTail);
                bufferTail -= clangTail;
                this.readNext();
                this.written = 0;
                clangTail = this.length;
                clangEnding = clangTail <= bufferTail;
            }
            this.fillBuffers(this.buffer.length - bufferTail, bufferTail);
            this.written += this.buffer.length;//bufferTail;
            //console.log('b', clangTail, bufferTail, clangEnding, this.written);
        },

        //fillBuffers: function(buffer, offset, fill) {
        fillBuffers: function(offset, fill, silence) {
            // Populate current buffer
            // from @offset, through @fill
            //     in sample terms
            // with the result of combining 
            //     the output of form.clangProc
            //     the aplitude factor from form.envelope
            //     and form.gainFactor

            var buffers = [
                this.buffer.getChannelData(0),
                this.buffer.getChannelData(1)
            ];
            //for (var chIdx = 0; chIdx < buffer.numberOfChannels; chIdx++) {
            //    buffers[chIdx] = this.buffer.getChannelData(chIdx);
            //}
            
            for (var idx = offset; idx < fill; idx++) {
                var sampleVal = silence ? 0
                    : this.synthProc(idx, this.params, this.sampleRate);
                sampleVal *= this.gainProc(this.params) * this.baseGain;
                //sampleVal *= this.envelope[this.written + idx];
                buffers[0][idx] = buffers[1][idx] = sampleVal;
                //for (var chIdx = 0; chIdx < buffer.numberOfChannels; chIdx++) {
                //    buffers[chIdx][idx] = sampleVal;
                //}
            }
        },

        _bufferWriter: function(evt) {

            // Read initial parameters.
            if (this.starting) {
                this.readNext();
                this.duration && this.broadcastEdge([
                    0, this.duration, this.context.currentTime, evt.playbackTime 
                ]);
                this.starting = false;
            }

            var buffer = evt.outputBuffer;
            var stereoBuffer = [
                buffer.getChannelData(0),
                buffer.getChannelData(1)
            ];

            // Silence buffer and bail out.
            if (! this.duration) { 
                for (var idx=0; idx < buffer.length; idx++) {
                    stereoBuffer[0][idx] = stereoBuffer[1][idx] = 0;
                }
                return; // Note: Early return.
            }

            var rampOnset = this.duration - (this.rampLen / this.sampleRate);
            // Seconds from clang onset to end of this buffer.
            var bufferEndTime = this.durationWritten + buffer.duration;
            var clangEnding = rampOnset <= bufferEndTime;

            if (! clangEnding) {
                // Fill buffer and continue.
                this.populateBuffers(
                    stereoBuffer, this.params, 0, buffer.length, false, false
                );
                this.durationWritten += buffer.duration;
            } else {
                //return;
                var tailDuration = this.duration - this.durationWritten;
                console.log('close', tailDuration, bufferEndTime);
                //while (tailDuration < buffer.duration) {
                //while (clangEndTime < bufferEndTime) {
                while (clangEnding) {
                    console.log('iter', tailDuration, bufferEndTime);
                    var rampCrossesBuffer = bufferEndTime < this.duration; 
                    if (rampCrossesBuffer) {
                        var blockLength = buffer.length;
                    } else { 
                        var blockLength = parseInt(tailDuration * this.sampleRate);
                    }
                    var duckOut = this.holdOut || true;
                    this.populateBuffers(
                        stereoBuffer, this.params, 0, blockLength, false, duckOut 
                    );
                    this.readNext();
                    this.duration && this.broadcastEdge([
                        tailDuration, this.duration, 
                        this.context.currentTime, evt.playbackTime 
                    ]);
                    var offset = blockLength;
                    blockLength = buffer.length - offset;
                    var duckIn = this.duckIn || false;
                    this.populateBuffers(
                        stereoBuffer, this.params, offset, blockLength, duckIn, false
                    );

                    this.durationWritten = buffer.duration - tailDuration;
                    var tailDuration = this.duration - this.durationWritten;

                    var rampOnset = this.duration - (this.rampLen / this.sampleRate);
                    // Seconds from clang onset to end of this buffer.
                    var bufferEndTime = this.durationWritten + buffer.duration;
                    var clangEnding = rampOnset <= bufferEndTime;
                }
            }
        },

        // XXX: future interface 
        //  buffers, synthParams, offsetSamps, fillSamps, phase, duckIn, duckOut
        populateBuffers: function(
            buffers, synthParams, offsetSamps, fillSamps, duckIn, duckOut, phase
        ) {
            phase = phase || 0;
            var gain = this.gainProc(synthParams) * this.baseGain;
            var bufferIdx = offsetSamps;
            var bufferEndIdx = offsetSamps + fillSamps;
            var fadeOutStart = bufferEndIdx - (duckOut ? this.rampLen : 0);
            var sampleVal;
            
            // XXX: logging
            kSamps += fillSamps;
            //log && log.push('k,s,o' + kSamps + ' ' + fillSamps + ' ' + offsetSamps);

            if (false && duckIn) {
                var fadePos = 0;
                while (bufferIdx < offsetSamps + this.rampLen) {
                    sampleVal = (fadePos++ / this.rampLen)
                        * this.synthProc(
                            this.sampleIdx + phase, synthParams, this.sampleRate
                        ) * gain; 
                    buffers[0][bufferIdx] = buffers[1][bufferIdx] = sampleVal;
                    bufferIdx++;
                    this.sampleIdx++;
                }
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
        }, // populateBuffers: function(

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
        /* */
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
