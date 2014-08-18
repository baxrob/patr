## Patr - a step sequencer

Simple monophonic note sequencer, built on the [Web Audio API]. With some experimental js approaches that are probably not recommended.

This is considered alpha version 0.02. The code isn't likely to be something you'd want to fork or adapt in it's present state. The application can be a bit fun to play with, though.

<!--
This is alpha iteration 0.02.
-->

### Live

<http://proto.blandhand.net/patr/>

<!--
[Audio sample](http://proto.blandhand.net/static/js/patr/media/aucap.html)

<audio controls>
    <source src="http://proto.blandhand.net/static/js/patr/media/aucap.wav">
    <source src="http://proto.blandhand.net/static/js/patr/media/aucap.ogg">
    <source src="http://proto.blandhand.net/static/js/patr/media/aucap.mp3">
</audio>

Screenshot:

![screenshot](http://proto.blandhand.net/static/js/patr.2/media/screencap.png)
-->

#### How To

The controls should be self-evident. All controls besides re-start are keyboard-accessible.

* re-start: refresh to a new randomized pattern (no control key, to avoid "unexpected" results)
* play/pause (press the spacebar)
* pace (P key): beats per minute 
* len (L key): note/step count 
* shuff (S key): shuffle - randomly re-order existing notes
* ea (E key): re-shuffle each n cycles
* clear (C key): set all notes to zero (ie. off)
* regen (R key): generate a new random set of notes (weighted to produce a "significant" ratio of zero/off notes)
* tone (T key, then 0-5 keys): select synth tone - 'spring', 'organ' and 'wind' tones are from [soundtoy] (Note: the dropdown remains open until you click 'tone' or press 'T' by design)
* note sliders: select and drag or press up/down to change; tab / shift+tab to move left to right between sliders
* browser back/fwd buttons (Alt/AppleKey + left or right): cycle through history of changes

### Compatability
My focus has been with the [Web Audio API].  I've added a wrapper for Mozilla's Audio Data API (now abandonded), and a Flash fallback, but, while these render the audio well enough, it is utterly out-of-sync with the UI display [I'm working on this].

* WebKit broswers: 
    * Google Chrome, version 16 and above
    * Chromium, and probably some of [these other WebKit browsers](http://en.wikipedia.org/wiki/List_of_web_browsers#WebKit-based)
    * Safari, version 6 and above
* Firefox, version 25 and above
* [Barely, brokenly] iOS Safari and Chrome
* Other: The mozFlashAudioContext.js wrapper falls back to a flash audio engine, based on [dynamicaudio.js] - though the audio and UI do not sync.

<!--
* Firefox / Gecko: Firefox nightly builds now support AudioContext.  With version 4 and above, you should get audio playback via mozFlashAudioContext.js which wraps the deprecated [Audio Data API](https://wiki.mozilla.org/Audio_Data_API), but audio synchronizes with UI state /very/ poorly.
-->


### Issues
( This codebase is on hold, pending the resolution of [this long-standing webaudio scriptProcessorNode issue](https://github.com/WebAudio/web-audio-api/issues/113) )
* Use of 'ea' (re-shuffle each n iterations) control can interfere with some UI functions.
* The 'tone' control has some questionable, janky hover-interaction.
* Three of the four main code modules are due for heavy refactoring. So there is significant unnecessary complexity, and a handful of ugly/crufty spots. 

<!--
### Roadmap
* 
* How-to: An automated walk-through.
* Improve Mozilla / Flash fallbacks (timing is currently borken - see above).
* Meta-sequences: Arrangement add/delete buttons top left, in control bar.
* Render and download PCM data - per sequence, maybe (later) per session.
* Shuffle and sort pattern by sub-sequence.
* Sequence generation alternatives: eg: "true" random; silence density; random "walk", etc.

### License
Released under [GPL v.3](http://www.gnu.org/licenses/gpl-3.0.txt).
Other licenses may be available in future.

### Attribs
1. [dynamicaudio.js]
2. [soundtoy]
3. [chipmusix]
-->

[Web Audio API]: https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html
[dynamicaudio.js]: https://github.com/bfirsh/dynamicaudio.js/
[soundtoy]: http://www.iquilezles.org/apps/soundtoy/index.html
