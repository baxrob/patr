:// Sample functions from [google "soundtoy", or see github.com/baxrob for ref - FIXME]
//
var soundToyTones = {

    _getSampleProc: function(name) {
        // Renamings.
        name == 'spring' && (name = 'bell');
        name == 'organ' && (name = 'piano1');
        return function(hz, idx, phase) {
            (phase === undefined) && (phase = 0);
            var idx2PI_SR = idx * (2 * Math.PI) / 44100;
            var sampleVal = this[name](hz, idx2PI_SR);
            return sampleVal + phase;  
        }.bind(this);
    },
    //  Temp hack
    spring: '',
    organ: '',

    _tri: function(a, x) {
        x = x / (2.0 * Math.PI);
        x = x % 1.0;
        if (x < 0.0) x = 1.0 + x;
        if (x < a) {
            x = x / a; 
        } else {
            x = 1.0 - (x - a) / (1.0 - a);
        }
        return -1.0 + 2.0 * x;
    },
    _saw: function(x, a) {
        var f = x % 1.0;
        if (f < a) {
            f = f / a;
        } else {
            f = 1.0 - (f - a) / (1.0 - a);
        }
        return f;
    },
    _sqr: function(a,x) {
        if (Math.sin(x) > a) {
            x=1.0; 
        } else {
            x = -1.0;
        }
        return x;
    },
    _noise: function(x) {
        var i = Math.floor(x);
        var f = x - i;
        var w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        var a = this._grad(i+0, f+0.0);
        var b = this._grad(i+1, f-1.0);
        return a + (b-a) * w;
    },
    _fmod: function(x,y) {
        return x % y;
    },
    _sign: function(x) {
        if (x > 0.0) {
            x = 1.0; 
        } else {
            x = -1.0;
        }
        return x;
    },
    _grad: function(n, x) {
        n = (n << 13) ^ n;
        n = (n * (n * n * 15731 + 789221) + 1376312589);
        var res = x;
        if( n & 0x20000000 ) res = -x;
        return res;
    },

    //
    bell: function(hz, sampIdx) {
        y = 0.100 * Math.exp(-sampIdx / 1.000) * Math.sin(0.56 * hz * sampIdx);
        y += 0.067 * Math.exp(-sampIdx / 0.900) * Math.sin(0.56 * hz * sampIdx);
        y += 0.100 * Math.exp(-sampIdx / 0.650) * Math.sin(0.92 * hz * sampIdx);
        y += 0.180 * Math.exp(-sampIdx / 0.550) * Math.sin(0.92 * hz * sampIdx);
        y += 0.267 * Math.exp(-sampIdx / 0.325) * Math.sin(1.19 * hz * sampIdx);
        y += 0.167 * Math.exp(-sampIdx / 0.350) * Math.sin(1.70 * hz * sampIdx);
        y += 0.146 * Math.exp(-sampIdx / 0.250) * Math.sin(2.00 * hz * sampIdx);
        y += 0.133 * Math.exp(-sampIdx / 0.200) * Math.sin(2.74 * hz * sampIdx);
        y += 0.133 * Math.exp(-sampIdx / 0.150) * Math.sin(3.00 * hz * sampIdx);
        y += 0.100 * Math.exp(-sampIdx / 0.100) * Math.sin(3.76 * hz * sampIdx);
        y += 0.133 * Math.exp(-sampIdx / 0.075) * Math.sin(4.07 * hz * sampIdx);
        return y;
    },

    drum1: function(hz, sampIdx) {
        y = Math.max(-1.0, Math.min(1.0, 8.0 * Math.sin(3000 * sampIdx * Math.exp(-6 * sampIdx))));
        return y;
    },

    drum2: function(hz, sampIdx) {
        y = 0.5 * this._noise(32000 * sampIdx) * Math.exp(-32 * sampIdx);
        y += 2.0 * this._noise(3200 * sampIdx) * Math.exp(-32 * sampIdx);
        y += 3.0 * Math.cos(400 * (1-sampIdx) * sampIdx) * Math.exp(-4 * sampIdx);
        return y;
    },

    drum3: function(hz, sampIdx) {
        f = 1000-2500 * sampIdx;
        y = Math.sin(f * sampIdx);
        y += .2 * Math.random();
        y *= Math.exp(-12 * sampIdx);
        y *= 8;
        return y;
    },

    flute1: function(hz, sampIdx) {
        y = 6.0 * sampIdx * Math.exp(-2 * sampIdx) * Math.sin(hz * sampIdx);
        y *= .8 + .2 * Math.cos(16 * sampIdx);
        return y;
    },

    guitar: function(hz, sampIdx) {
        f = Math.cos(0.251 * hz * sampIdx);
        y = 0.5 * Math.cos(1.0 * hz * sampIdx + 3.14 * f) * Math.exp(-0.0007 * hz * sampIdx);
        y += 0.2 * Math.cos(2.0 * hz * sampIdx + 3.14 * f) * Math.exp(-0.0009 * hz * sampIdx);
        y += 0.2 * Math.cos(4.0 * hz * sampIdx + 3.14 * f) * Math.exp(-0.0016 * hz * sampIdx);
        y += 0.1 * Math.cos(8.0 * hz * sampIdx + 3.14 * f) * Math.exp(-0.0020 * hz * sampIdx);
        y *= 0.9 + 0.1 * Math.cos(70.0 * sampIdx);
        y = 2.0 * y * Math.exp(-22.0 * sampIdx) + y;
        return y;
    },

    organ1: function(hz, sampIdx) {
        y = .6 * Math.cos(hz * sampIdx) * Math.exp(-4 * sampIdx);
        y += .4 * Math.cos(2 * hz * sampIdx) * Math.exp(-3 * sampIdx);
        y += .01 * Math.cos(4 * hz * sampIdx) * Math.exp(-1 * sampIdx);
        y = y * y * y + y * y * y * y * y + y * y;
        a = .5 + .5 * Math.cos(8 * sampIdx); y = Math.sin(y * a * 3.14);
        y *= 30 * sampIdx * Math.exp(-.1 * sampIdx);
        return y;
    },

    organ2: function(hz, sampIdx) {
        f = this._fmod(sampIdx, 6.2831 / hz) * hz / 6.2831;
        a = .7 + .3 * Math.cos(6.2831 * sampIdx);
        y = -1.0 + 2 * this._saw(f, a);
        y = y * y * y;
        y = 15 * y * sampIdx * Math.exp(-5 * sampIdx);
        return y;
    },

    organ3: function(hz, sampIdx) {
        a1 = .5 + .5 * Math.cos(0 + sampIdx * 12);
        a2 = .5 + .5 * Math.cos(1 + sampIdx * 8);
        a3 = .5 + .5 * Math.cos(2 + sampIdx * 4);
        y = this._saw(.2500 * hz * sampIdx, a1) * Math.exp(-2 * sampIdx);
        y += this._saw(.1250 * hz * sampIdx, a2) * Math.exp(-3 * sampIdx);
        y += this._saw(.0625 * hz * sampIdx, a3) * Math.exp(-4 * sampIdx);
        y *= .8 + .2 * Math.cos(64 * sampIdx);
        return y;
    },

    organ4: function(hz, sampIdx) {
        var f = 0.001 * (Math.cos(5 * sampIdx));
        y = 1.0 * (this._saw((1.00 + f) * 0.1 * hz * sampIdx, 1)-0.5);
        y += 0.7 * (this._saw((2.01 + f) * 0.1 * hz * sampIdx, 1)-0.5);
        y += 0.5 * (this._saw((4.02 + f) * 0.1 * hz * sampIdx, 1)-0.5);
        y += 0.2 * (this._saw((8.02 + f) * 0.1 * hz * sampIdx, 1)-0.5);
        y *= 20 * sampIdx * Math.exp(-4 * sampIdx);
        y *= 0.9 + 0.1 * Math.cos(40 * sampIdx);
        return y;
    },

    piano1: function(hz, sampIdx) {
        w = hz * (2 * Math.PI);
        y = 0.6 * Math.sin(1.0 * hz * sampIdx) * Math.exp(-0.0008 * hz * sampIdx);
        y += 0.3 * Math.sin(2.0 * hz * sampIdx) * Math.exp(-0.0010 * hz * sampIdx);
        y += 0.1 * Math.sin(4.0 * hz * sampIdx) * Math.exp(-0.0015 * hz * sampIdx);
        y += 0.2 * y * y * y;
        y *= 0.9 + 0.1 * Math.cos(70.0 * sampIdx);
        y = 2.0 * y * Math.exp(-22.0 * sampIdx) + y;
        return y;
    },

    piano2: function(hz, sampIdx) {
        sampIdx = sampIdx + .00015 * this._noise(12 * sampIdx);
        rt = sampIdx;
        r = sampIdx * hz * .2;
        r = this._fmod(r, 1);
        a = 0.15 + 0.6 * (rt);
        b = 0.65 - 0.5 * (rt);
        y = 50 * r * (r-1) * (r-.2) * (r-a) * (r-b);
        r = sampIdx * hz * .401;
        r = this._fmod(r, 1);
        a = 0.12 + 0.65 * (rt);
        b = 0.67 - 0.55 * (rt);
        y2 = 50 * r * (r-1) * (r-.4) * (r-a) * (r-b);
        r = sampIdx * hz * .399;
        r = this._fmod(r, 1);
        a = 0.14 + 0.55 * (rt);
        b = 0.66 - 0.65 * (rt);
        y3 = 50 * r * (r-1) * (r-.8) * (r-a) * (r-b);
        y += .02 * this._noise(1000 * sampIdx);
        y  /= (sampIdx * hz * .0015 + .1);
        y2 /= (sampIdx * hz * .0020 + .1);
        y3 /= (sampIdx * hz * .0025 + .1);
        y = (y + y2 + y3) / 3;
        return y;
    },

    rhyeg: function(hz, sampIdx) {
        h = this._fmod(sampIdx, .5);
        y = 0.2 * this._noise(32000 * h) * Math.exp(-32 * h);
        y += 1.0 * this._noise(3200 * h) * Math.exp(-32 * h);
        y += 7.0 * Math.cos(320-100 * Math.exp(-10 * h)) * Math.exp(-4 * h);
        //---------
        h = this._fmod(sampIdx + .15, 1.0);
        y += 0.5 * this._noise(32000 * h) * Math.exp(-64 * h);
        //------------
        h = this._fmod(sampIdx + .25, 1.0);
        y += 1.0 * this._noise(32000 * h) * Math.exp(-32 * h);
        //------------
        sampIdx += .25;
        s = this._sign(Math.sin(.5 * 6.2831 * sampIdx));
        h = this._fmod(sampIdx, .5);
        y += 2.0 * Math.cos(6.2831 * (105 + 11 * s) * sampIdx) * Math.exp(-6 * h);
        //---------
        h = this._fmod(sampIdx, .125) / .125;
        y += 1.4 * this._noise(320 * h) * Math.exp(-32 * h);
        //---------
        g = .018;
        t2 = sampIdx+ .05 * Math.cos(sampIdx * 6.2831);
        f = this._fmod(t2, g) / g;
        a = .5 + .4 * Math.cos(6.2831 * t2);
        f = this._saw(f, a);
        f = -1.0 + 2 * f;
        f = f * f * f;
        y += f * 1.5;
        //---------
        y *= .6;
        return y;
    },

    spacePiano: function(hz, sampIdx) {
        tt = 1-sampIdx;
        a = Math.sin(sampIdx * hz * .5) * Math.log(sampIdx + 0.3) * tt;
        b = Math.sin(sampIdx * hz) * sampIdx * .4;
        c = this._fmod(tt, .075) * Math.cos(Math.pow(tt, 3) * hz) * sampIdx * 2;
        y = (a + b + c) * tt;
        return y;
    }

};
