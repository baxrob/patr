
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

