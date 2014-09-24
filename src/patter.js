/*
 * GPL v3 [insert]
 */
"use strict";

//window.debugMode = 1024;

include([
    //'src/lib/jquery-1.7.2.min', 
    //'src/lib/simple_class',

    //'src/lib/rlb_dbg',

    //'src/lib/jquery-ui-1.8.21.slider.min',
    'src/lib/swfobject',

    //'src/mozFlashAudioContext',
    
    'src/lib/soundtoyTones',

    'src/lib/rlb_observer',
    'src/lib/rlb_util',

    //'src/synth', 
    //'src/seq', 

    //'src/data',
    //'src/lib/rlb_data',

    //'src/ix',

    'src/clang',
    'src/patt'

], function() {



    var contextClass;
    if (
        contextClass = (window.AudioContext || window.webkitAudioContext)
    ) {
        console.log('webkit adio api');
        var audioContext = new contextClass();
        audioContext.backend = 'webkit';
    } else {
        var audioContext = new mozFlashAudioContext();
    }     

    var audioProcessBlockSize = 2048;//1024;//512;//1024;//2048;

    window.relay = {
        publish: function(evtKey, data) {
            console.log(evtKey, data);
        },
        subscribe: function() {}
    };
    window.relay = Publisher();

    window.clang = Clang(
        audioContext, 
        audioProcessBlockSize, 
        0.8, 
        'sine', 
        function() {
            this.reader = function() { return null; };
            return [4.0, [440]];
        },
        relay
    );

    window.row = Row(clang, {
        steps: [2,45,32,29,14,0,5,0,9,27,0,0,29],
        len: 14,
        //pace: 257,
        pace: 300,
        tone: 'sine',
        loop: true,
        'goto': 0
    });
    //row.buildSeq()
    relay.subscribe('clang_edge', function(data) {
        //console.log('clang_edge', data);
    });
    
    /*
    window.ctx = audioContext;

    // Init data model
    var uri = new URI(':', ';', ['rate', 'len', 'reshuf', 'tone', 'seq']);

    // Init audio engine
    var audioProcessBlockSize = 2048,
        toneRow = new ToneRow(audioContext, audioProcessBlockSize);

    // FIXME: ? face.dataControlMap here ?
    // FIXME: ? include uri/synth param defaults here ?
    var patt = window.patt = new Patter({
        minNote: 0,
        
        //maxNote: 200,//46,
        maxNote: 46,
        //maxNote: 26,
        //maxNote: 16,

        baseFreq: 55,

        //octaveDivisions: 42//512//96//48//9//7//12 
        octaveDivisions: 12 
        //octaveDivisions: 7//12 
        //octaveDivisions: 5//12 
        //octaveDivisions: 3//12 
    
    }, uri, toneRow);
    */
    
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
