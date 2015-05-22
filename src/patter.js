/*
 * GPL v3 [insert]
 */
"use strict";

//window.debugMode = 1024;

include([

    'src/lib/swfobject',

    //'src/mozFlashAudioContext',
    
    'src/lib/soundtoyTones',

    //'src/lib/coffee-script.js',

    'src/lib/rlb_observer',
    'src/lib/rlb_util',

    //'src/lib/rlb_data',

    'src/clang',
    'src/patt',

    'src/tests.js'

], function() {

    //var cfs = require('coffescript');
    //console.log(cfs);

    var contextClass;
    if (
        contextClass = (window.AudioContext || window.webkitAudioContext)
    ) {
        //console.log('adio api');
        var audioContext = new contextClass();
        audioContext.backend = 'webkit';
    } else {
        var audioContext = new mozFlashAudioContext();
    }     

    var audioProcessBlockSize = 2048;//1024;//512;//1024;//2048;

    window.relay = Publisher(null, {
        mode: 0, 
        proc: function() {
            console.log(arguments);
        }
    });
    
    window.log = [];
    relay.subscribe('clang_edge', function(data) {
        log.push([Date.now(), data]);
    });
    window.kSamps = 0;

    // XXX: this is some funny cross-typing, but will work
    //relay.dbg = null;

    window.clang = Clang(
        audioContext, 
        audioProcessBlockSize, 
        0.8, 
        'sine', 
        // XXX:
        function() {
            this.reader = function() { return null; };
            return [4.0, [440]];
        },
        relay
    );

    window.row = Row(clang, {
        //steps: [2,45,32,29,14,0,5,0,9,27,0,0,29],
        //steps: [0,0,0,34,0,38,27,6],
        //steps: [22,23,24,25,26,27,28,29,30,23,25,27,29,22,24,26,28],
        steps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
        // XXX: shouldn't be required for steps with length
        len: 46,
        //pace: 257,
        pace: 300,
        tone: 'sine',
        loop: true,
        'goto': 0
    }, relay);

    row.update({steps: [15,5,33,33,42,1,0,35,1,0,42,19,0,37,27,15,0,0], len: 18, pace: 600});
    
    console.log('Row Initialized:', row);


    //
    function test(options) {
        // XXX: 
        function inasec(proc, args, n) {
            n = n || 1;
            return setTimeout(function() {
                if (util.type(proc) == 'Array') {
                    proc.forEach(function(p, idx) {
                        p.apply(null, args[idx]);
                    });
                } else {
                    proc.apply(null, args);
                }
            }, n * 1000);
        }
        function everysec(proc, args, n) {
            n = n || 1;
            return setInterval(function() {
                if (util.type(proc) == 'Array') {
                    proc.forEach(function(p, idx) {
                        p.apply(null, args[idx]);
                    });
                } else {
                    proc.apply(null, args);
                }
            }, n * 1000);
        }
        function cancel(op, id) {
            ({
                'in': function() {
                    clearTimeout(id);
                },
                every: function() {
                    clearInterval(id);
                }
            })[op]();
        }
        function sequence(steps) {
            // step: [command, args]
            steps.forEach(function(step, idx) {
                var command = step.unshift();
                this[command].apply(step);
            });
        }

        //row.go();

        //inasec([row.update], [{
            
    }

    //include('tests.js', function() { console.log(arguments); });
    
    //$(document).ready(function() {

        /*
        var face = window.face = new Face($('body'), patt);
        //console.log('fc', face.$playButton.data('events').click[0].handler);

        face.welcomeDialog();
        
        //console.log($(window).height(), $('body').height(), $(document).height(), $(parent).height(), $(parent).children(), $(this).parent(), this, $(parent.document).find('body iframe'), parent);

        // FIXME: ? html { height: 100%; } ?
        $(parent.document).find('body iframe').height($(parent).height() - 50);
        
        $(window).blur();
        */
        
        //console.log(patt);
        //console.log(pn.onaudioprocess);
    //});
});
