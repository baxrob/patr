
// *** WARNING ***
//
// The code below is incredibly bad. It was hacked on quickly and code
// only for the specific use-cases I wanted to play around with. I may
// clean it up eventually so it's helpful for other people.

var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

var numParticles = 25;
var ctx;
var canvas;
var audioCtx = null;
var soundBuffer = null;
var particles = [];
var particleImg;
var effect;

function playSound(x, y, quick) {
    if(soundBuffer) {
        var sound = audioCtx.createBufferSource();
        var gain = audioCtx.createGainNode();
        sound.buffer = soundBuffer;
        sound.playbackRate.value = x/canvas.width*2;
        sound.connect(gain);
        gain.connect(audioCtx.destination);

        var volume = y/canvas.height/4;
        gain.gain.value = volume;

        if(quick) {
            sound.noteGrainOn(0., .2, .4);
        }
        else {
            sound.noteOn(0);
        }
    }
}

function Note() {
    if(audioCtx) {
        this.node = audioCtx.createJavaScriptNode(1024, 1, 1);
        this.incr = 0;

        this.gain = audioCtx.createGainNode();
        this.node.connect(this.gain);
    }
}

Note.prototype.setFrequency = function(x, y) {
    if(audioCtx) {
        var freq = x / canvas.width * 2000 + 100;
        this.incr = 2 * Math.PI * freq/audioCtx.sampleRate;

        var volume = y / canvas.height / 4;
        this.gain.gain.value = volume;
    }
};

Note.prototype.playNote = function() {
    if(this.playing) {
        this.stopNote();
    }

    if(audioCtx) {
        var x = 0;

        var _this = this;
        this.node.onaudioprocess = function(e) {
            var data = e.outputBuffer.getChannelData(0);
            for(var i=0; i<data.length; i++) {
                data[i] = Math.sin(x);
                x += _this.incr;
            }
        };

        this.gain.connect(audioCtx.destination);
        this.playing = true;
    }
};

Note.prototype.stopNote = function() {
    if(audioCtx) {
        this.node.disconnect();
        this.gain.disconnect();
        this.playing = false;
    }
};

var lastX = 0;
var lastY = 0;
var lastTime = 0;
function sparkler(x, y) {
    addParticle((Math.floor(Math.random()*40)+20) * y/(canvas.height/2),
                x, y,
                lastX - x + Math.random()*80-40,
                lastY - y + Math.random()*80-40);

    var now = Date.now();
    if(now - lastTime > 100) {
        playSound(x, y, true);
        lastTime = now;
    }

    lastX = x;
    lastY = y;
}

function addParticle(d, x, y, dx, dy, square) {
    particles.push(new Particle(d, x, y,
                                dx || 0,
                                dy || 0,
                                square));
}


function Particle(d, x, y, dx, dy, square) {
    this.d = d;
    this.x = x;
    this.y = y;
    this.started = Date.now();
    this.square = square;

    if(effect == 'circle') {
        var size = y/canvas.height;
        var angle = Math.random()*360;
        this.targetX = Math.floor(this.x + Math.cos(angle)*300*size);
        this.targetY = Math.floor(this.y + Math.sin(angle)*300*size);
    }
    else if(effect == 'sparkler') {
        this.targetX = this.x + dx * 2;
        this.targetY = this.y + dy * 2;
    }
}

Particle.prototype.render = function(current) {
    var dt = (current - this.started) / 300;

    if(this.square) {
        var f = 1 - dt;
        var r = Math.floor(100*f);
        var g = Math.floor(200*f);
        var b = Math.floor(255*f);

        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        this.lastX = this.x - this.d/2;
        this.lastY = this.y - this.d/2;
        ctx.fillRect(this.lastX,
                     this.lastY,
                     this.d,
                     this.d);
    }
    else {
        this.lastX = this.x + (this.targetX - this.x) * dt;
        this.lastY = this.y + (this.targetY - this.y) * dt;
        ctx.drawImage(particleImg, this.lastX, this.lastY,
                      this.d,
                      this.d);
    }
};

Particle.prototype.clear = function() {
    ctx.fillStyle = '#000000';

    if(!this.square) {
        ctx.fillRect(this.lastX, this.lastY, this.d, this.d);
    }
};

Particle.prototype.remove = function() {
    if(this.square) {
        ctx.fillRect(this.lastX, this.lastY, this.d, this.d);
    }
}

function init() {
    canvas = document.getElementById('content');
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    ctx = canvas.getContext('2d');

    function heartbeat() {
        var current = Date.now();
        var arr = [];

        for(var i=0; i<particles.length; i++) {
            particles[i].clear();
        }

        for(var i=0; i<particles.length; i++) {
            if((current - particles[i].started) < 300) {
                particles[i].render(current);
                arr.push(particles[i]);
            }
            else {
                particles[i].clear();
                particles[i].remove();
            }
        }

        particles = arr;
	    requestAnimFrame(heartbeat);
    }

    var touchstart = 'mousedown';
    var touchmove = 'mousemove';
    var touchend = 'mouseup';

    if('ontouchstart' in window) {
        touchstart = 'touchstart';
        touchmove = 'touchmove';
        touchend = 'touchend';
    }

    var mouseNote = null;
    var mouseDown = false;

    canvas.addEventListener(touchstart, function(e) {
        function handle(x, y, touch) {
            if(effect == 'circle') {
                playSound(x, y);

                for(var j=0; j<numParticles; j++) {
                    var d = (Math.floor(Math.random()*40)+20);
                    addParticle(d, x, y);
                }
            }
            else if(effect == 'notes') {
                var note = new Note();
                note.setFrequency(x, y);
                note.playNote();

                if(touch) {
                    touch.note = note;
                }
                else {
                    mouseNote = note;
                }

                addParticle(100, x, y, 0, 0, true);
            }
        }

        if(e.changedTouches) {
            for(var i=0; i<e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];
                handle(touch.pageX, touch.pageY, touch);
            }
        }
        else {
            mouseDown = true;
            handle(e.pageX, e.pageY);
        }
    });

    document.body.addEventListener(touchmove, function(e) {
        e.preventDefault();

        if(effect == 'sparkler') {
            if(e.targetTouches) {
                var touch = e.targetTouches[0];
                sparkler(touch.pageX, touch.pageY);
            }
            else if(mouseDown) {
                sparkler(e.pageX, e.pageY);
            }
        }
        else if(effect == 'notes') {
            function handle(x, y, touch) {
                var note;
                if(touch) {
                    note = touch.note;
                }
                else {
                    note = mouseNote;
                }

                note.setFrequency(x, y);
                addParticle(100, x, y, 0, 0, true);
            }

            if(e.changedTouches) {
                for(var i=0; i<e.changedTouches.length; i++) {
                    var touch = e.changedTouches[i];
                    handle(touch.pageX, touch.pageY, touch);
                }
            }
            else if(mouseDown) {
                handle(e.pageX, e.pageY);
            }
        }
    }, true);

    document.body.addEventListener(touchend, function(e) {
        if(effect == 'notes') {
            if(e.changedTouches) {
                for(var i=0; i<e.changedTouches.length; i++) {
                    var touch = e.changedTouches[i];
                    touch.note.stopNote();
                }
            }
            else if(mouseDown) {
                mouseNote.stopNote();
            }
        }

        mouseDown = false;
    });

    particleImg = new Image();
    particleImg.onload = function() {
        heartbeat();
    };
    particleImg.src = 'particle.png';

    if('webkitAudioContext' in window) {
        audioCtx = new webkitAudioContext();

        function bufferSound(event) {
            var request = event.target;
            soundBuffer = audioCtx.createBuffer(request.response, false);
        }

        var request = new XMLHttpRequest();
        request.open('GET', 'sound.mp3', true);
        request.responseType = 'arraybuffer';
        request.addEventListener('load', bufferSound, false);
        request.send();
    }

    window.onresize = function() {
        canvas.width = document.body.clientWidth;
        canvas.height = document.body.clientHeight;
    };

    window.onhashchange = function() {
        effect = window.location.hash.slice(1);
    };

    if(window.location.hash) {
        effect = window.location.hash.slice(1);
    }
    else {
        effect = 'sparkler';
        window.location.hash = '#' + effect;
    }

    var els = document.getElementsByTagName('a');
    for(var i=0; i<els.length; i++) {
        els[i].addEventListener('click', function() {
            for(var i=0; i<els.length; i++) {
                els[i].className = '';
            }

            this.className = 'selected';
        });

        if(window.location.hash &&
           els[i].href.indexOf(window.location.hash) != -1) {
            els[i].className = 'selected';
        }
    }
}

window.addEventListener('load', init);
