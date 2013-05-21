/*
 * GPL v3 [insert]
 */
"use strict";

$script(['lib/jquery-1.7.2.min', 'lib/simple_class'], function() {
    $script([
        'lib/jquery-ui-1.8.21.slider.min',
        'lib/swfobject',

        'mozFlashAudioContext',
        
        'lib/soundtoyTones',

        'synth', 
        'seq', 
        'data',
        'ix'
    ], 
    function() {

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
        
        $(document).ready(function() {

            var face = window.face = new Face($('body'), patt);

            face.welcomeDialog();
            
            //console.log($(window).height(), $('body').height(), $(document).height(), $(parent).height(), $(parent).children(), $(this).parent(), this, $(parent.document).find('body iframe'), parent);

            // FIXME: ???
            $(parent.document).find('body iframe').height($(parent).height() - 50);
            
            $(window).blur();
        });
    })
});
