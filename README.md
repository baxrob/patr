<style>body {font-family: verdana, arial, sans-serif; font-size: 76%;}</style>
## Patr - a step sequencer

This is early stage, pre-alpha version software.  It's not recommended for use, in any case.  See below.

### Demo

<http://proto.blandhand.net/patr/>

Audio sample:

<audio controls>
    <source src="media/aucap.wav">
    <source src="media/aucap.ogg">
    <source src="media/aucap.mp3">
</audio>

Screenshot:

![screenshot](http://proto.blandhand.net/static/js/patr/media/screencap.png)

#### How

The controls should be self-evident, but, JIC:

* go/paus &equiv; play/pause - just press the spacebar.
* pace, or bpm; len, or note count - these are normal text inputs; press enter or click outside the input box to render any edit.
* shuff, clear and regen - buttons: randomly re-order existing notes; set all notes to zero; generate a new random set of notes.

### Compatability
My focus has been with the [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html).  I've added a wrapper for Mozilla's Audio Data API, and a Flash fallback, but, while these render the audio well enough, it is utterly out-of-sync with the UI display (I'm working on this, see the Firefox and Roadmap sections, below.)

* WebKit broswers: 
    * Google Chrome, version 16 and above (This is my main development and testing platform, though the latest Chrome [version 20.0.1132.47, on Ubuntu 12.04, at least] completely breaks audio output - see Chromium...)
    * Chromium, and probably some of [these other WebKit browsers](http://en.wikipedia.org/wiki/List_of_web_browsers#WebKit-based)
    * Safari - Web Audio API is only available in nightly builds, AFAIK.
* Firefox: With version 4 and above, you should get audio playback, via mozFlashAudioContext.js which wraps the [Audio Data API](https://wiki.mozilla.org/Audio_Data_API) 
* Other: The mozFlashAudioContext.js wrapper falls back to a flash audio engine, based on [dynamicaudio.js]


### Roadmap
* How-To: An automated walk-through.
* Improve Mozilla / Flash fallbacks (timing is currently borken - see above).
* Meta-sequences: Arrangement add/delete buttons top left, in control bar.
* Sound Alternatives: [soundtoy] [and chipmusic, maybe?].
* Render and download PCM data - per sequence, maybe (later) per session.
* Shuffle and sort pattern by sub-sequence.
* Sequence Generation Alternatives: eg: "true" random; silence density; random "walk", etc.

### Attribs
1. [dynamicaudio.js]
2. [soundtoy]
3. [chipmusix]

[dynamicaudio.js]: https://github.com/bfirsh/dynamicaudio.js/
[soundtoy]: http://....
[chipmusix]: http://....
