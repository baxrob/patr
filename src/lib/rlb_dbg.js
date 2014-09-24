var
    JS_DEBUG = 4096,            // Force js (no flash)
    MEDIA_DEBUG_EXTRA = 2048,   // Verbose media data (progress, etc)
    IPAD_DEBUG = 1024,          // Fake console for ipad
    FLASH_DEBUG = 512,          // Activate flash Console statements,
                                //   swf screen debug output

    DEBUG_CONTROLS = 256,       // Show screen back, n, fwd controls

    INIT_DEBUG = 128,           //
    DEBUG_DEBUG = 64,           //
    KEY_DEBUG = 32,             // Some keyboard event output
    CC_DEBUG = 16,              // Caption changes
    // TODO: LESSON_PREVIEW     without console statements, metadata, etc
    LESSON_DEBUG = 8,           // Preview mode - no scoring
    MEDIA_DEBUG = 4,            // js/iPad media events - see media/media.js
                                //   for more granularity
    TRANSITION_DEBUG = 2,       // Screen transitions
    SCORE_DEBUG = 1;            // Scoring related

var ALL_DEBUG = SCORE_DEBUG + TRANSITION_DEBUG + MEDIA_DEBUG + LESSON_DEBUG + CC_DEBUG + KEY_DEBUG + DEBUG_DEBUG + INIT_DEBUG + DEBUG_CONTROLS + FLASH_DEBUG + IPAD_DEBUG + MEDIA_DEBUG_EXTRA + JS_DEBUG;
var debugMode = 0;

var screen_console = navigator.userAgent.match(/iPad/) !== null
                     || navigator.userAgent.match(/MSIE/) !== null;
var screen_console = navigator.userAgent.match(/iPad/) !== null
                     || (debugMode && typeof console == 'undefined'); 
var screen_console = navigator.userAgent.match(/iPad/) !== null
                     || debugMode && typeof console == 'undefined'
                     || debugMode & JS_DEBUG;
screen_console = true;

if (! window.JSON) {
    window.JSON = {};
    window.JSON.stringify = function(obj) {
        console.log(obj);
    }
}
    
debug = function(target) {
    var caller_line = '';
    function format_caller_line(caller, error_stack) {
        if (caller) {
            caller_line = error_stack.match(
                '.*'+caller+'.*'
            )[0].replace(
                /.*\/(.*:\d+):.*/, "$1"
            );
            caller_line = caller + ': ' + caller_line + ":\n";
        } else { // Assume second in error stack - Chrome dependent?
            caller_line = error_stack.split("\n")[2].replace(
                /.*\/(.*:\d+):.*/, "$1"
            );
            caller_line = caller_line + ": ";
        }
        return caller_line;
    }
    
    e = new Error();
    //var caller = arguments.callee.caller.prototype.constructor.name;
    //fl = e.stack;

    if (screen_console) {
        $msg_txt.prepend(
            Array.prototype.slice.call(arguments).join(' ') 
            + '<br>'
        );
    } else {
        caller_line = format_caller_line(caller, e.stack);
        window._console.log(
            caller_line,  
            Array.prototype.slice.call(arguments)[0]//.join(' ')
        );
    }
}

var $msg_txt = $('<div id="screen_console"></div>');
//console.log('user agent:' + navigator.userAgent + ' ' +  screen_console + debugMode);
if (screen_console) {
    $(document).ready(function() {
        $('body').append(
            $msg_txt.css({
                position: 'absolute',
                bottom: 0,

                width: '90%',
                'margin-top': '22px',
                'min-height': '200px',
                'max-height': '30%',
                'overflow-y': 'scroll'      
            })
        );
        /*
        $('body').append(
            $('<input/>').attr({
                type: 'text'
            }).css({
                width: '33%',
                padding: 0,
                margin: 0,
                position: 'fixed',
                top: 0,
                right: 0
            }).on('change', function(evt) {
                var result = eval(evt.target.value);
                $msg_text.prepend(result + '<br>');
            }).val('$("#page").controller().$contentScreen.controller()')
        );
        */
    });
    window._console = window.console;
    window.console = function() {
    };
    window.console.log = debug;
    window.console.error = debug;
}
if (navigator.userAgent.match(/MSIE/) !== null) {
    /*
    window.console = {
        log: function() {},
        error: function() {}
    };
    */
}

