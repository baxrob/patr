"use strict";

// Flash timing debugging
var startTime = (new Date()).getTime();
var lastTime = 0;
var logElapsed = function() {
    var now = (new Date()).getTime();
    console.log(now - lastTime, now - startTime);
    lastTime = now;
};
var traceStart = function() {
    $('#play_btn').triggerHandler('click');
    logElapsed();
};


var mozFlashAudioContext = function(flashPath, disableMoz) {
    var properties = {
        init: function() {
            this.sampleRate = 48000;
            //if (false && typeof Audio !== 'undefined') {
            if (typeof Audio !== 'undefined' && disableMoz !== true) {
                this.destination = new Audio();
                if (this.destination.mozSetup) {
                    this.mozSetup();
                } else {
                    this.flashSetup();
                }
            } else {
                // Flash fallback
                this.flashSetup();
            }
        },
        mozSetup: function() {
            console.log('mozilla audio api');
            this.backend = 'moz';
            this.destination.mozSetup(2, this.sampleRate);
            this.destination.writeAudio = this.destination.mozWriteAudio;
        },
        flashSetup: function() {
            console.log('flash fallback');
            this.backend = 'flash';
            this.sampleRate = 44100;
            // From dynamicaudio.js
            this.flashWrapper = document.createElement('div');
            this.flashWrapper.id = 'dynamicaudio-flashwrapper-'+this.id;
            // Credit to SoundManager2 for this:
            var s = this.flashWrapper.style;
            s['position'] = 'fixed';
            s['width'] = s['height'] = '8px'; // must be at least 6px for flash to run fast
            s['bottom'] = s['left'] = '0px';
            s['overflow'] = 'hidden';
            this.flashElement = document.createElement('div');
            this.flashElement.id = 'dynamicaudio-flashelement-'+this.id;
            this.flashWrapper.appendChild(this.flashElement);

            document.body.appendChild(this.flashWrapper);

            //
            //var appRoot = window.appRoot || './';
            //var swfPath = appRoot + 'lib/flashEngine.swf';
            var swfPath = flashPath;

            swfobject.embedSWF(
                swfPath,
                this.flashElement.id,
                "8",
                "8",
                "9.0.0",
                null,
                null,
                {'allowScriptAccess': 'always'},
                null,
                function(e) {
                    console.log('flash ready', e, typeof e);
                    // TODO:
                    //       if e.sucess && e.ref
                    //       else error out
                    this.flashElement = e.ref;
                    this.destination = this.flashElement;

                    this.destination.writeAudio = function(samples) {
                        var out = new Array(samples.length);
                        for (var i = 0; i < samples.length; i++) {
                            out[i] = samples[i];
                        }

                        this.write(out.join(' '));
                    };
                }.bind(this)
            );

        },
        createJavaScriptNode: function(bufferSize, inputChannels, outputChannels) {
            if (this.backend == 'flash') bufferSize *= 1;
            var node = new mozFlashJavaScriptNode(
                bufferSize, 
                inputChannels, 
                outputChannels
            );
            node.backend = this.backend;
            node.sampleRate = this.sampleRate;
            node.context = this;
            return node;
        }
    };
    for (var p in properties) {
        this[p] = properties[p]; 
    }
    this.init();
}; // mozFlashAudioContext

var mozFlashJavaScriptNode = function(bufferSize, inputChannels, outputChannels) {
    var properties = {
        init: function(bufferSize, inputChannels, outputChannels) {
            this.bufferSize = bufferSize;
            this.inputChannels = inputChannels;
            this.outputChannels = outputChannels; 
        },
        connect: function(target) {
            // FIXME: moz loses setup audio obj on quick connect/disconnect?
            this.target = target;
            this.outputBuffer = new mozFlashJavaScriptBuffer(
                this.bufferSize, 
                this.sampleRate
            );
            var dummyEvt = {
                outputBuffer: this.outputBuffer
            };
            console.log(dummyEvt);
            this.run(dummyEvt);
        },
        disconnect: function() {
            this.interval && clearInterval(this.interval);
        },
        run: function(evt) {
            var intervalMilliseconds = this.bufferSize / this.sampleRate * 1000;

            this.interval = setInterval(function() {
                this.onaudioprocess && this.onaudioprocess(evt);
                
                var interleavedBuffer = this.interleaveStereoBuffers(
                    this.outputBuffer.channelBuffers
                );
                
                var written = 0;
                while (written < this.bufferSize * this.outputChannels) {
                    written += this.target.writeAudio(
                        //outputBuffer.subarray(written)
                        interleavedBuffer.slice(written)
                    ); 
                }
            }.bind(this), intervalMilliseconds);
        },
        interleaveStereoBuffers: function(buffers) {
            // Note: IE < 10 doesn't have typed arrays
            // TODO: use polyfill
            //var interleavedBuffer = new Float32Array(buffers[0].length * 2);
            var interleavedBuffer = new Array(buffers[0].length * 2);
            var targetIdx = 0;
            for (var readIdx in buffers[0]) {
                interleavedBuffer[targetIdx] = buffers[0][readIdx];
                targetIdx++;
                interleavedBuffer[targetIdx] = buffers[1][readIdx];
                targetIdx++;
            }
            return interleavedBuffer;
        }
    };
    for (var p in properties) {
        this[p] = properties[p]; 
    }
    this.init(bufferSize, inputChannels, outputChannels);
}; // mozFlashJavaScriptNode

var mozFlashJavaScriptBuffer = function(bufferLength, sampleRate) {
    var properties = {
        init: function(bufferLength, sampleRate) {
            this.length = bufferLength;
            this.sampleRate = sampleRate;
            this.duration = this.length / this.sampleRate; 
            this.channelBuffers = [];
        },
        getChannelData: function(channel) {
            //this.channelBuffers[channel] = new Float32Array(this.length);
            this.channelBuffers[channel] = new Array(this.length);
            return this.channelBuffers[channel];
        }
    };
    for (var p in properties) {
        this[p] = properties[p]; 
    }
    this.init(bufferLength, sampleRate);
};
