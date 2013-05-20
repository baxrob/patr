## Patr - a step sequencer

This is early stage, pre-alpha version software.  It's not recommended for use, in any case.  See below.

### Live

<http://proto.blandhand.net/patr/>

[Audio sample](http://proto.blandhand.net/static/js/patr/media/aucap.html)

<!--
<audio controls>
    <source src="http://proto.blandhand.net/static/js/patr/media/aucap.wav">
    <source src="http://proto.blandhand.net/static/js/patr/media/aucap.ogg">
    <source src="http://proto.blandhand.net/static/js/patr/media/aucap.mp3">
</audio>
-->

Screenshot:

![screenshot](http://proto.blandhand.net/static/js/patr.2/media/screencap.png)

#### How

The controls should be self-evident, but:

* go/paus &equiv; play/pause (press the spacebar).
* pace, or bpm (P key); len, or note/step count (L key): up to 1000 bpm plays reasonably well; lengths above ~300 cause some audio glitches
* shuff (S key); clear (C key); and regen (R key): randomly re-order existing notes; set all notes to zero; generate a new random set of notes
* note sliders: select and drag or press up/down to change; tab / shift+tab to move left to right between sliders
* browser back/fwd buttons (Alt+left/right) cycle through history of changes

### Compatability
My focus has been with the [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html).  I've added a wrapper for Mozilla's Audio Data API, and a Flash fallback, but, while these render the audio well enough, it is utterly out-of-sync with the UI display (I'm working on this.)

* WebKit broswers: 
    * Google Chrome, version 16 and above
    * Chromium, and probably some of [these other WebKit browsers](http://en.wikipedia.org/wiki/List_of_web_browsers#WebKit-based)
    * Safari 6
* Firefox: With version 4 and above, you should get audio playback, via mozFlashAudioContext.js which wraps the [Audio Data API](https://wiki.mozilla.org/Audio_Data_API), but audio synchronizes with UI state /very/ poorly. 
* Other: The mozFlashAudioContext.js wrapper falls back to a flash audio engine, based on [dynamicaudio.js] - audio/UI sync is even worse than Firefox.


### Roadmap
* How-to: An automated walk-through.
* Improve Mozilla / Flash fallbacks (timing is currently borken - see above).
* Meta-sequences: Arrangement add/delete buttons top left, in control bar.
* Simple mathematical synth alternatives: [soundtoy], etc
* Render and download PCM data - per sequence, maybe (later) per session.
* Shuffle and sort pattern by sub-sequence.
* Sequence generation alternatives: eg: "true" random; silence density; random "walk", etc.

### License
Released under [GPL v.3](http://www.gnu.org/licenses/gpl-3.0.txt).
Other licenses may be available in future.

<!--
### Attribs
1. [dynamicaudio.js]
2. [soundtoy]
3. [chipmusix]
-->

[dynamicaudio.js]: https://github.com/bfirsh/dynamicaudio.js/
[soundtoy]: http://www.iquilezles.org/apps/soundtoy/index.html
