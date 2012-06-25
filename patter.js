$script('lib/jquery-1.7.1.min', function() {
    $script([
        'lib/simple_class',
        'lib/swfobject',
        'lib/mozFlashAudioContext',
        '../resources/jQuery-Knob/js/jquery.knob',
        'synth', 
        'seq', 
        'data',
        'ix'
    ], 
    function() {

        var uri = new URI(':', ';', ['rate', 'length', 'seq']);

        if ((window.AudioContext || window.webkitAudioContext)) {
            console.log('webkit adio api');
            var audioContext = new (window.AudioContext || webkitAudioContext)();
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
            face.welcomeModal();
        });
    })
});
