
//console.log('ee', include);
//include('src/clangForms', function() {
//console.log('ff', this);

//}); 

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
            // XXX: coupling
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

        // XXX:
        connect: function() {
            this.processorNode.onaudioprocess = this.bufferWriter.bind(this);
            //this.processorNode.onaudioprocess = null;
            this.processorNode.connect(this.destination); 
        },
        disconnect: function() {
            this.processorNode.onaudioprocess = null;
            this.processorNode.disconnect();
        },
        
        // XXX: 
        silence: function() {
            var count = 1;
            var nullifyProcess = function() {
                // XXX: kludge ? for bufferWrite to audio render async ? 
                if (count == 3) {
                    this.processorNode.onaudioprocess = null;
                    this.relay.unsubscribe(nullifyProcess);
                }
                count++;
            }.bind(this);
            this.relay.subscribe('clang_edge', nullifyProcess);
        },

        go: function() {
            if (this.reader == this.nullReader) {
                this.starting = true;
                this.reader = this.haltedReader;
                this.haltedReader = null;
                //this.processorNode.onaudioprocess = this.bufferWriter.bind(this);
            }
        },
        halt: function() {
            if (this.reader != this.nullReader) {
                this.haltedReader = this.reader;
                this.reader = this.nullReader;

                //this.silence();

                /*
                var processorNode = this.processorNode;
                var relay = this.relay;
                function silence() {
                    console.log(processorNode, relay);
                    processorNode.onaudioprocess = null;
                    relay.unsubscribe('clang_edge', silence);
                }
                var silence = function() {
                    console.log('sil', this);
                    this.processorNode.onaudioprocess = null;
                    this.relay.unsubscribe('clang_edge', silence);
                }.bind(this);
                this.relay.subscribe('clang_edge', silence);
                */
            }
        },

        // XXX: cull
        /*
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
        */

        nullReader: function() {
            return null;
        },

        // XXX: ? broken?
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

            // XXX: should broadcast final note-end, or call it clang_step
            //      and/or use clang.silent property
            this.length && 1;
            this.broadcastEdge([
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
        //
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

        // XXX: cull
        /*
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
        */

        // XXX: ? here
        buffer: null,
        bufferWriter: function(evt) {
 
            // Read initial parameters.
            if (this.starting) {
                this.readNext(evt.playbackTime);
                this.starting = false;
            }
            /*
            if (this.starting || this.preempt) {
                this.preempt && this.setupPreempt();
                this.readNext(evt.playbackTime);
                this.preempt && this.closePreempt();
                this.starting = false;
            }
            */

            //delete this.buffer;
            this.buffer = evt.outputBuffer;

            /*
            if (! this.duration) {
                return;
            }
            if (this.duration == 0) {
                //this.readNext(evt.playBackTime); //
                console.log('null note', this.buffer.getChannelData(0), this.buffer.length);
                this.fillBuffers(0, this.buffer.length, true); 
                console.log('null note', this.buffer.getChannelData(0));
                setTimeout(function() {
                this.processorNode.onaudioprocess = null;
                }.bind(this), 100);
                return; // Early return.
            }
            */

            var bufferTail = this.buffer.length;
            //var clangTail = this.length - this.written;
            var clangTail = this.length ? this.length - this.written : 0;
            //var clangEnding = clangTail <= bufferTail;
            //var clangEnding = clangTail > 0 && clangTail <= bufferTail;
            var clangEnding = clangTail && clangTail <= bufferTail;

            while (clangEnding) {
                this.fillBuffers(this.buffer.length - bufferTail, clangTail);
                bufferTail -= clangTail;
                this.readNext(evt.playbackTime);
                //this.written = 0;
                // XXX: catch null length / halted
                clangTail = this.length;
                clangEnding = clangTail && clangTail <= bufferTail;
            }
            this.fillBuffers(
                this.buffer.length - bufferTail, bufferTail, ! this.length
            );
            /*
            if (this.duration == 0) {
            this.length && this.broadcastEdge([
                0, this.duration, this.context.currentTime, playbackTime 
            ]);

            }
            */

            this.written += bufferTail;
        },

        
        //fillBuffers: function(buffer, offset, fill) {
        fillBuffers: function(offset, fill, silence) {
        //fillBuffers: function(offset, fill) {
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
                var sampleVal = silence ? 0
                    : this.synthProc(sampleIdx, this.params, this.sampleRate);
                //var sampleVal = this.synthProc(
                //    sampleIdx, this.params, this.sampleRate
                //);
                sampleVal *= this.gainProc(this.params) * this.baseGain;
                sampleVal *= this.envelope[sampleIdx];
                */
                var sampleVal = silence ? 0 : 
                    this.synthProc(sampleIdx, this.params, this.sampleRate)
                    * this.gainProc(this.params)
                    * this.baseGain 
                    * this.envelope[sampleIdx];
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

//}); // include

