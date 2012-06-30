## Patr - a step sequencer

### Basics
* This is pre-alpha software

#### How To
>
>
>

### Compatability
My focus has been with the [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html).  I've added a wrapper for Mozilla's Audio Data API, and a Flash fallback, but, while these render the audio well enough, it is utterly out-of-sync with the UI display (I'm working on this, see the Firefox and Roadmap sections, below.)

* WebKit broswers: 
    * Google Chrome, version 16 and above (This is my main development and testing platform, though the latest, version 20.0.1132.47, on Ubuntu 12.04 completely breaks audio output - see Chromium...)
    * Chromium, and probably some of [these WebKit browsers](http://en.wikipedia.org/wiki/List_of_web_browsers#WebKit-based)
    * Safari - Web Audio API is only available in nightly builds, AFAIK.
* Firefox: With version 4 and above, you should get audio playback, via mozFlashAudioContext.js which wraps the [Audio Data API](https://wiki.mozilla.org/Audio_Data_API) 
* Other: The mozFlashAudioContext.js wrapper falls back to a flash audio engine, based on [dynamicaudio.js](...)

### Roadmap

### Attribs
1. dynamicaudio.js



#### Dedicated to

### Browser-based step-sequencer with real-time audio engine.  
Focused on Web Audio API.
'This is ALPHA software, if that.'

![screenshot](seq_prev.png)
<!-- github doesn't render this, use link to renered audio -- just use a screenshot for now -->
<audio controls></audio>

Backend / Audio-Engin Versions:
Web Audio API:  Webkit browsers.  Chrome 16+ (some versions, OSes), Chromium, Safari (nightly builds - reportedly), other Webkit-based browsers.
Audio Data API wrapper:  Firefox 4+.  [Audio playback out of sync with UI.]
Flash fallback:  Many other browsers.  [Audio playback out of sync with UI, horribly.]


Brief HowTo:
Control Area (top):
* go: play / pause (spacebar)
* pace: beats per minute 
* length: sequence steps 
* shuffle: randomly reorder steps
* clear: set all steps to zero
* regen: generate new random sequence
Faders / Sliders Area:
* ...
* select + up/down keys


Tested Systems:


