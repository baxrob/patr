(function() {

    alert_compat();

    var uri = new URI(':', ';', ['rate', 'length', 'seq']);

    var audioContext = new (window.AudioContext || webkitAudioContext)(),
        audioProcessBlockSize = 2048,
        toneRow = new ToneRow(audioContext, audioProcessBlockSize);

    var patt = window.patt = new Patter({
        minNote: 0,
        maxNote: 46,
        baseFreq: 55,
        octaveDivisions: 12 
    }, uri, toneRow);
    
    $(document).ready(function() {
        var face = window.face = new Face($('body'), patt);
    });

})();
