$script(['lib/jquery-1.7.2.min', 'lib/simple_class'], function() {
    $script([
        'lib/jquery-ui-1.8.21.slider.min',
        'lib/swfobject',
        'mozFlashAudioContext',

        'synth', 
        'seq', 
        'data',
        'ix'
    ], 
    function() {

        var uri = new URI(':', ';', ['rate', 'length', 'seq']);

        // TODO: url 'engine' param: webkit, moz, flash
        //       also: never publish / bookmark this param ? (how?)
        if ((window.AudioContext || window.webkitAudioContext)) {
            console.log('webkit adio api');
            var audioContext = new (window.AudioContext || webkitAudioContext)();
            audioContext.backend = 'webkit';
        } else {
            var audioContext = new mozFlashAudioContext();
        }     

        var audioProcessBlockSize = 2048,
            toneRow = new ToneRow(audioContext, audioProcessBlockSize);

        var patt = window.patt = new Patter({
            minNote: 0,
            maxNote: 46,
            baseFreq: 55,
            octaveDivisions: 12 
        }, uri, toneRow);
        
        $(document).ready(function() {
            var face = window.face = new Face($('body'), patt);
            face.welcomeDialog();
        });
    })
});
