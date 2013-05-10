//"use strict";

// TODO: move to seq.js
window.setTone = function(toneRow, tone) {
    if (tone in soundtoyTones) { 
        toneRow.sampleProc = soundtoyTones._getSampleProc(tone);
        // FIXME: do this in synth
        //toneRow.hzGain = toneRow.unity;
        if (tone == 'spring') {
            toneRow.hzGain = function(hz) {
                return toneRow.baseGain * 0.75 * toneRow.crinkle(hz);
            };
        } else if (tone == 'organ') {
            toneRow.hzGain = function(hz) {
                return toneRow.baseGain * 0.65;
            };
        }
    } else {
        toneRow.sampleProc = toneRow[tone];
        toneRow.hzGain = toneRow.bleat;
    }
    toneRow.setUpdateHook(function() {
        this.currentTone = tone;
    });
    var busyWait = setInterval(function() {
        if ($('#tone_menu_button').length) {
            $('#tone_menu_button').html(tone + ' &#x25be;');
            clearInterval(busyWait);
        }
    }, 1);
};

var Face = Class.extend({

    // Init //
    init: function($parentElem, pattern) {
        this.$root = $parentElem;
        this.patt = pattern;

        //
        this.patt.updateDisplayHook = function(data) {
            this.updateControlDisplay(data.controls);
            this.updateSequenceDisplay(data.sequence);
        }.bind(this);

        // FIXME: belongs in seq / synth ?
        // Mapping of URI params to el id/labels 
        this.dataControlMap = {
            bpm: {
                id: 'bpm',
                label: 'pace'
            },
            stepCount: {
                id: 'step_count',
                label: 'len'
            },
            tone: {
                id: 'tone_menu',
                label: 'tone',
                setter: function(tone) {
                    $('#tone_menu_button').html(tone + ' &#x25be;');
                }
            },
            reshuf: {
                id: 'reshuf',
                label: 'reshuf'
            }
        };

        var $controls = this.$controls = this.buildControls();
        this.$root.append(this.$controls)

        this.$frame = this.buildFrame(
            // FIXME: this gives an incorrect value (currently 81 rather
            //        than 37).  a 1000ms timeout gives the right value.
            //this.elemHeight(this.$controls) - 2 // KLUDGE - why?
            37
        );

        // FIXME: 
        // KLUDGE: to render scrollbar style 
        this.$frame.hide();
        setTimeout(function() {
            this.rebuildFrame();
            this.$frame.show();
        }.bind(this), 30);

        this.$root.append(this.$frame);

        // TODO: move to css section
        this.$root.css({
            'font-family': 'verdana',
            margin: 0,
            padding: 0,
            overflow: 'hidden'
        });


        this.$root.disableSelection();
        $(window).on('resize', this.resizeHandler.bind(this));

        //$(document).on('beat', this.beatHandler.bind(this));
        // FIXME: handle flash timing /in flash/
        //        kill? moz - ?works in live / old version?
        // KLUDGE: adjust for backend timing discrepancies
        $(document).on('beat', function(evt) {
            var blinkDelay = {
                webkit: 0,
                moz: 100,
                flash: 500
            }[this.patt.toneRow.context.backend];

            setTimeout(function() {
                this.beatHandler(evt);
            }.bind(this), blinkDelay);
        }.bind(this));
        
        this.initStyles();

        // TODO: this.keyHandlers
        this.$root.on('keydown', function(evt) {
            if (evt.ctrlKey || evt.metaKey) {
                return true;
            }

            // TODO: replace with keyCode: callback object
            // TODO: vim hjkl, mmrpg/game layouts
            switch (evt.keyCode) {
                case 32: // Spacebar
                    // TODO: shift+click or enter key: stop/restart
                    evt.preventDefault();
                    this.$playButton.triggerHandler('click');
                    break;
                
                case 80: // 'p'
                    var $el = $('#bpm');
                    $el.focus();
                    $el.select();
                    evt.preventDefault();
                    break;
                case 76: // 'l'
                    $el = $('#step_count');
                    $el.focus();
                    $el.select();
                    evt.preventDefault();
                    break;

                case 83: // 's'
                    var $el = $('#shuff');
                    $el.triggerHandler('click');
                    $el.addClass('active');
                    setTimeout(function() {
                        $el.removeClass('active');
                    }, 150);
                    break;
                case 69: // 'e'
                    var $el = $('#reshuf');
                    $el.focus();
                    $el.select();
                    evt.preventDefault();
                    break;
                    
                case 67: // 'c'
                    var $el = $('#clear');
                    $el.triggerHandler('click');
                    $el.addClass('active');
                    setTimeout(function() {
                        $el.removeClass('active');
                    }, 150);
                    break;
                case 82: // 'r'
                    var $el = $('#regen');
                    $el.triggerHandler('click');
                    $el.addClass('active');
                    setTimeout(function() {
                        $el.removeClass('active');
                    }, 150);
                    break;

                case 84: // 't'
                    evt.preventDefault();
                    evt.stopPropagation();
                    var $el = $('#tone_menu_button');
                    $el.triggerHandler('click');
                    break;
                
                case 9: // tab
                    var faderSelector = '.fdr .ui-slider-handle',
                        $focusedFader = $(faderSelector + ':focus');
                    // If no fader is focused, start at 0 
                    if (! $focusedFader.length) { 
                        // FIXME: if (evt.shiftKey) {
                        $(faderSelector)[0].focus();
                        evt.preventDefault();
                    } else {
                        // FIXME: use this whitespace for multi-line var declarations
                        var lastFdrIdx = $('.fdr').length - 1,
                            thisFdrIdx = $focusedFader.parent()
                                .attr('id').split('_')[1];
                        if (thisFdrIdx == 0 && evt.shiftKey) {
                            // Moving back from first fdr
                            $(faderSelector)[lastFdrIdx].focus();
                            evt.preventDefault();
                        } else if (
                            thisFdrIdx == lastFdrIdx && ! evt.shiftKey
                        ) {
                            $(faderSelector)[0].focus();
                            evt.preventDefault()
                        }
                    }
                    // Otherwise, don't preventDefault - let jqui-slider handle tab
                    break; 
                default:
                    var $toneListContainer = $('#tone_menu_list');

                    focused = $('body *:focus');
                    //console.log('f', focused.length);
                    if (
                        $toneListContainer.is(':visible')
                        && ! focused.length
                    ) {
                        //console.log('focused', focused, typeof focused, focused.length);
                        //evt.stopPropagation();
                        var $items = $toneListContainer.find('.ctl'),
                            lastItemIdx = $items.length - 1;
                        //console.log($items); 
                        if (evt.keyCode == 13) { 
                            $toneListContainer.slideUp(120, 'linear');
                        //        this.$root.off('keydown', this.selectTone);
                            return false;
                        } else if (
                            evt.keyCode > 48 && evt.keyCode < (50 + lastItemIdx)
                        ) {
                            $items[parseInt(evt.keyCode - 49)].click();    
                            return false;
                        } else {
                            return true;
                        }
                    }
                    break; 
                }
        }.bind(this));

    }, // init


    // CSS //
    initStyles: function() {
        this.$style = this.elem({
            tag: 'style',
            attr: { type: 'text/css' }
        });

        // TODO: @font-face here
        this.styleRules = {
            '#ctl_bar div.ctl': {
                'background-color': '#555',
                color: '#eee',
                padding: '2px',
                'border-radius': '2px',
                'line-height': '1.5em',
                cursor: 'pointer'
            },
            '#ctl_bar a.ctl': {
                'text-decoration': 'none'
            },
            '#ctl_bar div.ctl:hover, #ctl_bar div.ctl.hover': {
                'background-color': '#ddd',
                color: '#333',
                'border-color': '#333',
                'box-shadow': '0 0 1px 1px #999'
            },
            '#ctl_bar div.ctl:active, #ctl_bar div.ctl.active': {
                'background-color': '#fff',
                color: '#555',
                'box-shadow': '0 0 1px 1px #999'
            },
            '#ctl_bar .ctl.blocked': {
                'background-color': '#f89'
            },
            '#ctl_bar #tone_menu div.ctl.active': {
                'padding-right': '3px'
            },
            '#ctl_bar input[type="text"]': {
                'background-color': '#f9f9f9',
                color: '#222',
                border: '1px solid #999',
                'border-radius': '2px'
            },
            '#ctl_bar input[type="text"]:hover': {
                'background-color': '#fff',
                color: '#222'
            },
            '#ctl_bar input[type="text"]:focus': {
                'background-color': '#fff',
                color: '#222',
                'box-shadow': '0 0 1px 1px #999'
            },
            '#frame::-webkit-scrollbar': {
                width: '16px',
                height: '16px'
            },
            '#frame::-webkit-scrollbar-thumb': {
                background: '#aaa'
            },
            '#frame.blinking::-webkit-scrollbar-thumb': {
                background: '#ccc'
            },
            '#frame::-webkit-scrollbar-track': {
                background: '#eee'
            },
            '.fdr.blinking': {
                'box-shadow': '0 0 1px 1px #999'
            },
            '.fdr .ui-slider-handle.blinking': {
                'background': '#a03',
                'border-color': '#d37',
                'border-width': '1px',
                'box-shadow': '0 0 1px 1px #999'
            },
            '.blinker.blinking': {
                'background-color': '#b03',
                'box-shadow': '0 0 1px 1px #999'
            }
        };

        for (var selector in this.styleRules) {
            this.$style.append(
                selector + '{'
            );
            var rules = this.styleRules[selector];
            for (var rule in rules) {
                this.$style.append(
                    rule + ':' + rules[rule] + ';'
                );
            }
            this.$style.append('}');
        }

        // External .css files
        // TODO: font-face, meta tags, etc - like this?
        var externalStyles = ['lib/ui-slider-custom.css'];

        externalStyles.map(function(filePath) {
            $('head').append(
                this.elem({
                    tag: 'link',
                    attr: {
                        type: 'text/css',
                        rel: 'stylesheet',
                        media: 'all',
                        href: (window.appRoot || '') + filePath
                    }
                })
            );
        }.bind(this));

        // After externals, possibly override declarations
        $('head').append(this.$style);

    }, // initStyles

    // TODO: fb meta tags, SEO (belongs in .html? - ix.widget?)
    /*
    <meta property="og:title" content="" />
    <meta property="og:type" content="app" />
    <meta property="og:url" content="" />
    <meta property="og:image" content="seq_prev.png" />
    <meta property="og:site_name" content="" />
    <meta property="og:description" content="" />
    <meta name="medium" content="audio" />
     */


    // STUB:
    welcomeDialog: function() {
        // TODO: welome dialog: automation/hwto, compat note, fadeout, thrice
    },
    // STUB:
    tooltip: function(el, action) {
        // TODO: shared info blurb on hover, expand option
    },

    
    // Event handlers //
    resizeHandler: function() {
        // FIXME: appears to be 3px off.  why?
        this.$frame.css(
            'height', 
            $(window).height() - this.elemHeight(this.$controls) 
                //- 5 + 'px' // padding-top
        );
        //console.log(this.$frame.height());
    },
    beatHandler: function(evt) {
        // Handle beat: step UI: indicate and scroll
        var step = evt.originalEvent.beat % this.patt.stepSeq.length;

        // FIXME: ? $('.fdr .ui-slider ...').removeClass(...) ?
        ['fdr', 'ui-slider-handle', 'blinker'].map(function(className) {
            $('.' + className).removeClass('blinking');
        });
        
        var $blinker = $('#blinker_' + step);
        if (! $blinker.length) return;

        var blinker_height = this.elemHeight($blinker),
            frame_height = this.elemHeight(this.$frame),
            fdr_widget_height = this.elemHeight($('.fdr').parent()),
            frame_height = this.$frame.height() + 
                parseInt(this.$frame.css('padding-top'));

        var rows_per_screen = Math.floor(
            frame_height / (fdr_widget_height - 10)
        );
        

        var blinkScrollbar = function() {
            $('#frame').addClass('blinking');
            setTimeout(function() {
                $('#frame').removeClass('blinking');
            }, 55);
        };
        if ($blinker.attr('id').split('_')[1] == 0) { 
            // Return to top row
            blinkScrollbar();
            this.$frame.scrollTop(0);
            //this.$frame.animate({ scrollTop: 0 }, 55);
        } else if (
            $blinker.position().top >
            this.$frame.height() + blinker_height
        ) {
            // Re-position off-screen row to page top
            blinkScrollbar();
            var newScrollTop = this.$frame.scrollTop()
                + rows_per_screen * fdr_widget_height;
            this.$frame.scrollTop(newScrollTop);
            //this.$frame.animate({ scrollTop: newScrollTop }, 75);
        }

        [
            $('#fdr_' + step), 
            $('#fdr_' + step + ' .ui-slider-handle'), 
            $blinker
        ].map(function(el) {
            $(el).addClass('blinking');
        });

    },

    // Control actions //
    updatePace: function(evt) {
        this.patt.update({
            bpm: evt.target.value
        });
        $(evt.target).blur();
    },
    updateLength: function(evt) {
        this.patt.update({
            stepCount: evt.target.value
        });
        $(evt.target).blur();
        this.rebuildFrame();
    },
    shuffle: function() {
        // TODO: prevent clicks with large sequence shuffle
        this.patt.shuffle();
        var newSeq = this.patt.stepSeq;
        //this.updateSequenceDisplay(newSeq);
    },
    clear: function() {
        this.patt.clear();
        var newSeq = this.patt.stepSeq;
        this.updateSequenceDisplay(newSeq);
    },
    regenerate: function() {
        var newSeq = this.patt.generateStepSeq();
        this.patt.update({
            seq: newSeq 
        });
        //this.updateSequenceDisplay(newSeq);
    },
    updateTone: function(evt) {
        // STUB
    },


    // Display updates //
    updateControlDisplay: function(data) {
        for (var key in data) {
            var controlSpec = this.dataControlMap[key];
            var value = data[key];
            if (controlSpec.setter && (typeof controlSpec.setter) == 'function') { //!= undefined) { 
                controlSpec.setter(value);
            } else {
                $('#' + controlSpec['id']).val(value);
            }
        }
    },
    updateSequenceDisplay: function(sequence) {
        if (sequence.length !== $('.fdr').length) {
            this.rebuildFrame();
        } else {
    $('.fdr').each(function(idx, el) {
                $(el).slider('value', sequence[idx]);
                $(el).find('a').text(sequence[idx]); 
                this.updateBlinkerState(idx);
            }.bind(this));
        }
    },
    updateBlinkerState: function(idx) {
        $('#blinker_' + idx).css(
            'border-color',
            $('#fdr_' + idx).slider('value') == 0 ? 'transparent' : '#d37'
        );
    },


    // Construction //
    
    // Controls
    buildControls: function() {
        var self = this;
        var $controls = this.elem({
            tag: 'div',
            attr: {
                id: 'ctl_bar'
            },
            css: {
                position: 'fixed',
                'z-index': '10',
                width: '100%',
                top: '0px',
                //'background-color': '#fcfeef',
                //'background-color': '#bcb',
                'background-color': 'transparent',
                'border-bottom': '1px solid silver',
                'box-shadow': '0 1px 10px -4px #444'
            }
        });

        var $innerControls = this.elem({
            tag: 'div',
            css: {
                width: '480px', // FIXME: should be calculated
                margin: 'auto',
                'padding-top': '9px'
            }
        });

        this.$playButton = this.elem({
            tag: 'div',
            attr: {
                id: 'play_btn',
                'class': 'ctl',
                title: 'play/pause\n(spacebar)'
            },
            css: {
                'z-indez': '1000',
                float: 'left',
                width: '1em',
                height: '18px',
                'text-align': 'center',
                'font-family': 'fontello',
                'line-height': '1.5em',
                'font-size': '12px',
                'letter-spacing': '0.1em',
                'padding-left': '5px',
                'padding-right': '5px',
                margin: '0 28px 0 8px'
            },
            html: '&#x27f3;',
            on: {
                click: function(evt) {
                    if (this.patt.isRunning()) {
                        this.patt.pause();
                        $(evt.target).removeClass('active');
                        $(evt.target).html('&#xe760');
                    } else {
                        this.patt.unpause();
                        $(evt.target).addClass('active');
                        $(evt.target).html('&#xe800;');
                    }
                }.bind(this),
                // FIXME: necessary?
                mouseover: function(evt) {
                    $(this).addClass('hover');
                },
                mouseout: function(evt) {
                    $(this).removeClass('hover');
                }
            }
        }); // $playButton

        //
        $innerControls
        .append(
            this.$playButton
        ).append(
            this.elem({
                tag: 'label',
                css: {
                    'font-size': '12px',
                    'letter-spacing': '0.1em',
                    float: 'left',
                    margin: '-8px 1px 0 0'
                }
            }).text('pace:')
        ).append(
            this.elem({
                tag: 'input',
                attr: {
                    type: 'text',
                    id: 'bpm',
                    'class': 'ctl',
                    title: 'bpm\n(P key)',
                    maxlength: 3,
                    value: this.patt.options.bpm
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '1.95em',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    //margin: '7px 6px 4px -37px'
                    margin: '7px 0 4px -34px'
                },
                on: {
                    focusout: self.updatePace.bind(self), 
                    keydown: function(evt) {
                        if (evt.ctrlKey || evt.metaKey) {
                            return true;
                        }
                        if (evt.keyCode == 13) {
                            $(this).triggerHandler('focusout');
                            return false;
                        } else if (
                            (evt.keyCode < 47 || evt.keyCode > 57)
                            && (evt.keyCode !== 8) // backspace 
                            && (evt.keyCode !== 46) // delete
                        ) {
                            return true;
                        }
                    },
                    click: function() {
                        $(this).select();
                    },
                    blur: function(evt) {
                        evt.stopPropagation();
                    }
                }
            })
        ).append(
            this.elem({
                tag: 'label',
                css: {
                    'font-size': '12px',
                    'letter-spacing': '0.1em',
                    float: 'left',
                    margin: '-8px 1px 0 13px'
                }
            }).text('len:')
        ).append(
            this.elem({
                tag: 'input',
                attr: {
                    type: 'text',
                    id: 'step_count',
                    'class': 'ctl',
                    title: 'steps\n(L key)',
                    maxlength: 2,
                    value: this.patt.options.stepCount
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '1.3em',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    //margin: '7px 28px 4px -30px'
                    margin: '7px 28px 4px -25px'
                },
                on: {
                    focusout: self.updateLength.bind(self),
                    keydown: function(evt) {
                        if (evt.ctrlKey || evt.metaKey) {
                            return true;
                        }
                        if (evt.keyCode == 13) {
                            $(this).triggerHandler('focusout');
                            return false;
                        } else if ( // Ignore most non-digits
                            (evt.keyCode < 47 || evt.keyCode > 57)
                            && (evt.keyCode !== 8) // backspace 
                            && (evt.keyCode !== 46) // delete
                        ) {
                            return true;
                        }
                    },
                    click: function(evt) {
                        $(this).select();
                    },
                    blur: function(evt) {
                        evt.stopPropagation();
                    }
                }
            })
        ).append(
            this.elem({
                tag: 'div',
                attr: {
                    id: 'shuff',
                    'class': 'ctl',
                    title: 'shuffle notes\n(S key)'
                },
                css: {
                    float: 'left',
                    'font-family': 'verdana',
                    'font-size': '12px',
                    'letter-spacing': '0.1em',
                    'padding-left': '5px',
                    'padding-right': '5px',
                    'padding-top': '1px',
                    'margin-top': '0px',
                    'margin-right': '0px',
                    height: '17px'
                },
                text: 'shuff',
                on: {
                    'click': self.shuffle.bind(self) 
                }
            })
        ).append(
            this.elem({
                tag: 'label',
                css: {
                    'font-size': '12px',
                    float: 'left',
                    //margin: '-4px 4px 0 2px'
                    margin: '-7px 0px 0px 13px'
                }
            }).text('ea:')
        ).append(
            this.elem({
                tag: 'input',
                attr: {
                    type: 'text',
                    id: 'reshuf',
                    'class': 'ctl',
                    title: 'reshuffle each\nn cycles\n(E key)',
                    maxlength: 2,
                    value: this.patt.options.reshuf
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '1.3em',
                    border: '1px solid #999',
                    'border-radius': '2px',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    margin: '7px 28px 0 -23px'
                },
                on: {
                    focusout: function(evt) {
                        this.patt.update({
                            reshuf: evt.target.value
                        });
                        $(evt.target).blur();
                    }.bind(this),
                    keydown: function(evt) {
                        if (
                            evt.ctrlKey || evt.metaKey
                            
                        ) {
                            return true;
                        }
                        // TODO: handle delete+enter - empty input
                        if (evt.keyCode == 13) {
                            $(this).triggerHandler('focusout');
                            return false;
                        } else if ( // Ignore most non-digits
                            (evt.keyCode < 47 || evt.keyCode > 57)
                            && (evt.keyCode !== 8) // backspace 
                            && (evt.keyCode !== 46) // delete
                        ) {
                            return true;
                        }
                    },
                    click: function(evt) {
                        $(this).select();
                        $(this).focus();
                    },
                    blur: function(evt) {
                        evt.stopPropagation();
                    }
                }
            })
        ).append(
            this.elem({
                tag: 'div',
                attr: {
                    id: 'clear',
                    'class': 'ctl',
                    title: 'zero all\n(C key)'
                },
                css: {
                    float: 'left',
                    'font-family': 'verdana',
                    'font-size': '12px',
                    'padding-left': '5px',
                    'padding-right': '5px',
                    'padding-top': '1px',
                    'margin-top': '0px',
                    'margin-right': '17px',
                    height: '17px'
                },
                text: 'clear',
                on: {
                    click: self.clear.bind(self) 
                }
            })
        ).append(
            this.elem({
                tag: 'div',
                attr: {
                    id: 'regen',
                    'class': 'ctl',
                    title: 'new random sequence\n(R key)'
                },
                css: {
                    float: 'left',
                    'font-family': 'verdana',
                    'font-size': '12px',
                    'padding-left': '5px',
                    'padding-right': '5px',
                    'padding-top': '1px',
                    'margin-top': '0px',
                    'margin-right': '28px',
                    height: '17px'
                },
                text: 'regen',
                on: {
                    click: self.regenerate.bind(self)
                }

            })
        ); // $innerControls

        $controls.append(
            $('<div>&#x27f2;</div>').attr({
                id: 'start_over',
                'class': 'meta ctl',
                title: 're-start (randomize all)'
            }).css({
                float: 'left',
                height: '18px',
                'text-align': 'center',
                'font-family': 'fontello',
                'line-height': '1.5em',
                'font-size': '12px',
                'padding-left': '5px',
                'padding-right': '5px',
                margin: '9px 0 0 9px'
            }).on({
                click: function() {
                    // FIXME: refresh clobbers history - generate 
                    //        in seq.js on blank hash
                    //document.location.href = '#'
                    document.location.href = ''
                }
            })
        );

        $controls.append($innerControls);

        var currentTone = this.patt.toneRow.currentTone;
        var $toneMenu = this.elem({
            tag: 'div',
            attr: {
                id: 'tone_menu',
                title: 'select tone\n(T key)'
            },
            css: {
                position: 'relative',
                float: 'left',
                'margin-left': '0px'
            },
            on: {
                mouseover: function(evt) {
                    //console.log('over');
                    $('#tone_menu_button').html(
                        'tone &#x25be;'
                    ); 
                },
                mouseout: function(evt) {
                    //console.log('out');
                    $('#tone_menu_button').html(
                        this.patt.toneRow.currentTone + ' &#x25be;'
                    );
                }.bind(this)
            }
        }).append(
            this.elem({
                tag: 'div',
                attr: {
                    id: 'tone_menu_button',
                    'class': 'ctl'
                },
                css: {
                    'z-index': 10,
                    'font-family': 'verdana',
                    'font-size': '12px',
                    'padding-left': '5px',
                    'padding-right': '5px',
                    'padding-top': '1px',
                    'margin-top': '0px',
                    'margin-right': '4px',
                    height: '17px'
                },
                html: '....' + ' &#x25be;',
                on: {
                    click: function(evt) {
                        $('#tone_menu_list').slideToggle(120, 'linear');
                    }.bind(this)
                }
            })
        ); // $toneMenu

        var $toneMenuList = this.elem({
            tag: 'div',
            attr: {
                id: 'tone_menu_list'
            },
            css: {
                display: 'none',
                position: 'absolute',
                width: '7em',
                'font-family': 'verdana',
                'font-size': '12px',
                'background-color': '#555',
                color: '#eee',
                padding: '2px',
                'padding-left': '5px',
                'padding-right': '5px',
                'padding-top': '5px',
                padding: '5px',
                'margin-top': '-1px',
                'border-radius': '0 0 2px 2px',
                'line-height': '1.5em',
                cursor: 'pointer',
                opacity: '0.92'
            },
            on: {
            }
        });
        
        // Max of nine tones are handled by the widget key commands
        //var toneList = ['sine', 'square', 'sawtooth', 'triangle', 'bell', 'piano1'];
        //var toneList = ['sine', 'square', 'bell', 'piano1'];
        var toneList = ['sine', 'square', 'spring', 'organ', 'flute1'];
        /*
        var toneList = [
            'sine', 'square', 'spring', 'organ',
            'drum1', 'drum2', 'drum3', 'flute1', 'guitar', 'organ1', 'organ2',
            'organ3', 'organ4', 'piano1', 'piano2', 'rhyeg', 'spacePiano' 
        ];
        */

        for (var key in toneList) {
            var active = (toneList[key] == currentTone) ? 'active' : '';
            $toneMenuList.append(
                this.elem({
                    tag: 'div'
                }).append(
                    this.elem({
                        tag: 'div',
                        css: {
                            float: 'left',
                            'font-size': '0.8em',
                            'margin-left': '1px'
                        },
                        text: parseInt(key) + 1
                    })
                ).append(
                    this.elem({
                        tag: 'div',
                        attr: {
                            'class': 'ctl ' + active,
                            'data-key': key
                        },
                        css: {
                            'text-align': 'right',
                            margin: '2px 2px 2px 14px',
                            'letter-spacing': '0.1em'
                        },
                        text: toneList[key],
                        on: {
                            click: function(evt) {
                                var tone = $(evt.target).text();
                                
                                window.setTone(this.patt.toneRow, tone);
                                this.patt.update({
                                    tone: tone
                                })
                                // FIXME: integrate
                                $('#tone_menu_button').html(
                                   tone + ' &#x25be;'
                                );
                                $('#tone_menu_list div').removeClass('active');
                                $(evt.target).addClass('active');
                            }.bind(this)
                        }
                    })
                )
            );
        }

        $toneMenu.append($toneMenuList);

        $controls.append($toneMenu);

        // STUB:
        var $numEg = this.elem({
            tag: 'div',
            attr: {
            },
            css: {
            }
        });
        $controls.append($numEg);

        return $controls;
    }, // buildControls


    //
    // Fader / Slider Frame
    //
    rebuildFrame: function() {
        this.$frame.remove();
        this.$frame = this.buildFrame(this.elemHeight(this.$controls));
        this.$root.append(this.$frame);
        $(window).triggerHandler('resize');
    },
    buildFrame: function(topMargin) {
        var $frame = this.elem({
            tag: 'div',
            attr: {
                id: 'frame'
            },
            css: {
                'margin-top': topMargin + 'px',
                'padding-top': '5px',
                'overflow-y': 'scroll',
                // FIXME:
                height: $(window).height() - topMargin //- 5 + 'px'//'100%'
            }
        });
        var $innerFrame = this.elem({
            tag: 'div',
            css: {
                // TODO: width should be viewport based
                width: '480px', // should be 12x fader width
                margin: 'auto'
            }
        });
        for (var i = 0; i < this.patt.options.stepCount; i++) {
            $innerFrame.append(
                this.buildFader(i)
            );
        }
        $frame.append($innerFrame);
        return $frame;
    }, // buildFrame

    // Fader
    buildFader: function(stepIdx) {
        var self = this;
        var note = this.patt.stepSeq[stepIdx];

        // TODO: title/hover/tooltip indicating note % patt.octaveDivisions 
        // TODO: select + key in number + enter sets fader value
        // TODO: select + right / left key moves selected-state
        return this.elem({
            tag: 'div',
            css: {
                float: 'left',
                width: '40px',
                'padding-left': 0,
                'font-size': '.6em'
            }
        }).append(
            this.elem({
                tag: 'div',
                attr: {
                    id: 'fdr_' + stepIdx,
                    'class': 'fdr'
                },
            }).slider({
                orientation: "vertical",
                range: "min",
                min: this.patt.options.minNote,
                max: this.patt.options.maxNote,
                value: note,
                create: function(evt, ui) {
                    $(evt.target).find('a').text(note);
                },
                slide: function(evt, ui) {
                    $(ui.handle).text(ui.value);
                },
                stop: function(evt, el) {
                    var note = el.value;
                    this.patt.stepSeq[stepIdx] = note;
                    this.patt.changed = true;
                    this.patt.buildSequence();
                    this.updateBlinkerState(stepIdx);
                }.bind(this)

            })
        ).append(
            this.elem({
                tag: 'div',
                attr: {
                    id: 'blinker_' + stepIdx,
                    'class': 'blinker'
                },
                css: {
                    margin: '12px',
                    width: '12px',
                    height: '12px',
                    border: '1px solid ' + 
                        (this.patt.stepSeq[stepIdx] == 0 ? 'transparent' : '#d37'),
                    'border-radius': '4px'
                },
                on: {
                    beat: function() {
                    }
                }
            })
        );

    },


    // **** //
    // Util //
    intValFromCSS: function($el, property) {
        if (! $el.css(property)) return;
        return + $el.css(property).slice(0, -2);
    },
    elemHeight: function($el) { // Returns int
        // FIXME: inconsistent results - should wait for pending reflows
        //        should likely use Deferred, or just a waitloop
        var cssInt = function(property) {
            return this.intValFromCSS($el, property);
        }.bind(this);
        /*
        console.log( $el.height() 
            , cssInt('padding-top') , cssInt('padding-bottom')
            , cssInt('margin-top') , cssInt('margin-bottom')
            , cssInt('border-top-width') , cssInt('border-bottom-width')
            , $el.height() 
            + cssInt('padding-top') + cssInt('padding-bottom')
            + cssInt('margin-top') + cssInt('margin-bottom')
            + cssInt('border-top-width') + cssInt('border-bottom-width')
        );
        */
        return $el.height() 
            + cssInt('padding-top') + cssInt('padding-bottom')
            + cssInt('margin-top') + cssInt('margin-bottom')
            + cssInt('border-top-width') + cssInt('border-bottom-width');
    },

    // TODO: merge attr/css args - and reflect above
    elem: function(options) {
        var strOpts = ['tag', 'text', 'html'];
        var objOpts = ['attr', 'css', 'on'];
        for (var idx in strOpts) {
            if (! options[strOpts[idx]]) {
                options[strOpts[idx]] = '';
            }
        }
        for (var idx in objOpts) {
            if (! options[objOpts[idx]]) {
                options[objOpts[idx]] = {};
            }
        }

        var $el = $('<' + options.tag + '/>')
            .attr(options.attr)
            .css(options.css);

        if (options.text !== '') {
            $el.text(options.text);
        }
        // NOTE: html overrides text
        if (options.html != '') {
            $el.html(options.html);
        }

        for (var evt in options.on) {
            $el.on(evt, options.on[evt]);
        }
         
        return $el;
    }

});

