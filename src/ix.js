
var Face = Class.extend({
    init: function($parentElem, pattern) {
        this.$root = $parentElem;
        this.patt = pattern;

        this.patt.updateDisplayHook = function(data) {
            this.updateControlDisplay(data.controls);
            this.updateSequenceDisplay(data.sequence);
        }.bind(this);

        // FIXME: check this is accurate
        // Mapping of URI params to el id/labels 
        this.dataControlMap = {
            bpm: {
                id: 'bpm',
                label: 'pace'
            },
            stepCount: {
                id: 'step_count',
                label: 'len'
            }
        };

        $controls = this.$controls = this.buildControls();
        this.$root.append(this.$controls)

        // FIXME: why is $controls.height() 2px greater here?
        this.$frame = this.buildFrame(
            this.elemHeight(this.$controls) - 2 // KLUDGE 
        );
        this.$root.append(this.$frame);

        this.$root.css({
            'font-family': 'verdana',
            margin: 0,
            padding: 0,
            overflow: 'hidden'
        });

        $(window).on('resize', this.resizeHandler.bind(this));
        //$(document).on('beat', this.beatHandler.bind(this));
        $(document).on('beat', function(evt) {
            var blinkDelay = {
                webkit: 0,
                moz: 100,
                flash: 500
            }[this.patt.toneRow.context.backend];

            // TODO: use requestAnimationFrame 
            setTimeout(function() {
                this.beatHandler(evt);
            }.bind(this), blinkDelay);
        }.bind(this));
        
        
        this.initStyles();

        // TODO: this.keyHandlers
        this.$root.on('keydown', function(evt) {
            if (evt.ctrlKey) {
                return true;
            }
            switch (evt.keyCode) {
                case 32: // Spacebar
                    // TODO: shift+click or enter key: stop/restart
                    evt.preventDefault();
                    this.$playButton.trigger('click');
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
                
                case 9: // tab
                    var handleSelector = '.fdr .ui-slider-handle';
                    var focusedFader = $(handleSelector + ':focus');
                    if (! focusedFader.length) {
                        $(handleSelector)[0].focus();
                        evt.preventDefault();
                    } else {
                        var lastFdrIdx = $('.fdr').length - 1;
                        var thisFdrIdx = focusedFader.parent()
                            .attr('id').split('_')[1];
                        if (thisFdrIdx == 0 && evt.shiftKey) {
                            // Moving back from first fdr
                            $(handleSelector)[lastFdrIdx].focus();
                            evt.preventDefault();
                        } else if (
                            thisFdrIdx == lastFdrIdx && ! evt.shiftKey
                        ) {
                            $(handleSelector)[0].focus();
                            evt.preventDefault()
                        }
                    }
                    break; 
                default:
                    break; 
            }
        }.bind(this));

    }, // init


    initStyles: function() {
        this.$style = this.elem({
            tag: 'style',
            attr: { type: 'text/css' }
        });

        this.styleRules = {
            '#ctl_bar div.ctl': {
                'background-color': '#555',
                color: '#ddd',
                border: '1px solid #999',
                'border-radius': '2px',
                cursor: 'pointer'
            },
            '#ctl_bar div.ctl#play_btn': {
                'margin-right': '29px'
            },
            '#ctl_bar div.ctl#play_btn.active': {
                'margin-right': '15px'
            },
            '#ctl_bar div.ctl:hover': {
                'background-color': '#ddd',
                color: '#333',
                'border-color': '#333',
                'box-shadow': '0 0 1px 1px #999'
            },
            '#ctl_bar div.ctl:active, #ctl_bar div.ctl.active': {
                'background-color': '#fff',
                color: '#222',
                'box-shadow': '0 0 1px 1px #999'
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

    // TODO: fb meta tags, SEO - belongs in .html
    /*
<meta property="og:title" content="" />
<meta property="og:type" content="app" />
<meta property="og:url" content="" />
<meta property="og:image" content="seq_prev.png" />
<meta property="og:site_name" content="" />
<meta property="og:description" content="" />
     */


    welcomeDialog: function() {
        // TODO: welome dialog: automation/hwto, compat note, fadeout, thrice
    },
    tooltip: function(el, action) {
        // TODO: shared info blurb on hover, expand option
    },

    // Event handlers
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


    // Control actions
    updateRate: function(evt) {
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
        // TODO: prevent clicking with large sequence shuffle
        this.patt.shuffle();
        var newSeq = this.patt.stepSeq;
        this.updateSequenceDisplay(newSeq);
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
        this.updateSequenceDisplay(newSeq);
    },


    // Display updates
    updateControlDisplay: function(data) {
        for (var key in data) {
            $('#' + this.dataControlMap[key]['id']).val(data[key]);
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


    // Construction
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
                'background-color': '#fcfeef',
                'border-bottom': '1px solid silver',
                'box-shadow': '0 1px 10px -4px #444'
            }
        });
        var $innerControls = this.elem({
            tag: 'div',
            css: {
                width: '480px',
                margin: 'auto',
                'padding-top': '9px'
            }
        });
        $controls.append($innerControls);

        this.$playButton = this.elem({
            tag: 'div',
            attr: {
                id: 'play_btn',
                'class': 'ctl',
                title: 'play/pause\n(spacebar)'
            },
            css: {
                'z-indez': '1000',
                'font-family': 'verdana',
                'font-size': '12px',
                'padding-left': '5px',
                'padding-right': '5px',
                'margin-top': '0px',
                // Section end, extra margin
                height: '18px',
                float: 'left'
            },
            text: 'go',
            on: {
                click: function(evt) {
                    if (this.patt.isRunning()) {
                        this.patt.pause();
                        $(evt.target).removeClass('active');
                        $(evt.target).text('go');
                    } else {
                        this.patt.unpause();
                        $(evt.target).addClass('active');
                        $(evt.target).text('paus');
                    }
                }.bind(this),
                mouseover: function(evt) {
                    $(this).addClass('hover');
                },
                mouseout: function(evt) {
                    $(this).removeClass('hover');
                }
            }
        }); // $playButton

        $innerControls
        .append(this.$playButton)
        .append(
            this.elem({
                tag: 'label',
                css: {
                    'font-size': '12px',
                    float: 'left',
                    'padding-top': '2px',
                    margin: 0,
                    'margin-right': '4px'
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
                    value: this.patt.options.bpm
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '2.2em',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    margin: 0,
                    'margin-right': '10px',
                    'margin-bottom': '10px'
                },
                on: {
                    focusout: self.updateRate.bind(self), 
                    keydown: function(evt) {
                        if (evt.keyCode == 13) {
                            $(this).trigger('focusout');
                        }
                        if (
                            (evt.keyCode < 47 || evt.keyCode > 57)
                            && (evt.keyCode !== 8) // backspace 
                            && (evt.keyCode !== 46) // delete
                        ) {
                            return false;
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
                    float: 'left',
                    'padding-top': '2px',
                    margin: 0,
                    'margin-right': '4px'
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
                    value: this.patt.options.stepCount
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '2.2em',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    margin: 0,
                    // Section end, extra margin
                    'margin-right': '18px',
                    'margin-bottom': '10px'
                },
                on: {
                    focusout: self.updateLength.bind(self),
                    keydown: function(evt) {
                        if (evt.keyCode == 13) {
                            $(this).trigger('focusout');
                        }
                        if (
                            (evt.keyCode < 47 || evt.keyCode > 57)
                            && (evt.keyCode !== 8) // backspace 
                            && (evt.keyCode !== 46) // delete
                        ) {
                            return false;
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
        )/*.append(
            this.elem({
                tag: 'input',
                attr: {
                    type: 'checkbox',
                    id: 'reshuf',
                    'class': 'ctl',
                    title: 'reshuf',
                    // FIXME: read from url
                    value: 'off'
                },
                css: {
                    float: 'left',
                    margin: '3px 0 3px 12px'
                },
                on: {
                    click: function(evt) {
                    }
                }
            })
        ).append(
            this.elem({
                tag: 'input',
                attr: {
                    type: 'text',
                    id: 'repeats',
                    'class': 'ctl',
                    title: 'reshuf each',
                    value: 1 //this.patt.toneRow.repeats
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '1.5em',
                    border: '1px solid #999',
                    'border-radius': '2px',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    margin: 0,
                    'margin-right': '10px',
                    'margin-bottom': '10px'
                },
                on: {
                    focusout: function() {
                        self.patt.toneRow.repeats = this.value;
                    },
                    keydown: function(evt) {
                        if (evt.keyCode == 13) {
                            $(this).trigger('focusout');
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
        )*/.append(
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
                    'padding-left': '5px',
                    'padding-right': '5px',
                    'padding-top': '1px',
                    'margin-top': '0px',
                    'margin-right': '10px',
                    height: '17px'
                },
                text: 'shuff',
                on: {
                    'click': self.shuffle.bind(self) 
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
                    'margin-right': '10px',
                    height: '17px'
                },
                text: 'clear',
                on: {
                    'click': self.clear.bind(self) 
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
                    'margin-right': '10px',
                    height: '17px'
                },
                text: 'regen',
                on: {
                    'click': self.regenerate.bind(self)
                }

            })
        ) // $controls

        // TODO: this is a separate deal - $controls must be in DOM before
        //        we can find its height -- else rethink css
        // NOTE: a favorite thing about this questoinable css-generated-in-js
        //       strategy: it's quite fluid to mind fixmes, which get way out
        //       of hand in css
        var $controlsHint = this.elem({
            tag: 'div',
            attr: {
                id: 'ctl_bar_hint'
            },
            css: {
                'font-size': '0.7em',
                position: 'absolute',
                'margin-top': '31px',//$controls.height(),
                'margin-left': '-9px', // ???
                height: '20px',
                width: 'auto', // sum(controls.children.widths)
                border: '1px solid #999'
            }
        }).text('[explanatory, as hover-text per control above: fade out after 10, 5, 3 secs, per user\'s visit count; then don\'t show, (but also add help button at control edge-right.)]');
        //$controls.append($controlsHint);

        return $controls;
    }, // buildControls

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
                    this.patt.dirty = true;
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

    intValFromCSS: function($el, property) {
        if (! $el.css(property)) return;
        return + $el.css(property).slice(0, -2);
    },
    elemHeight: function($el) { // Returns int
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
        var strOpts = ['tag', 'text'];
        var objOpts = ['attr', 'css', 'on'];
        for (i in strOpts) {
            if (! options[strOpts[i]]) {
                options[strOpts[i]] = '';
            }
        }
        for (i in objOpts) {
            if (! options[objOpts[i]]) {
                options[objOpts[i]] = {};
            }
        }

        var $el = $('<' + options.tag + '/>')
            .attr(options.attr)
            .css(options.css)
            .text(options.text);

        for (evt in options.on) {
            $el.on(evt, options.on[evt]);
        }
         
        return $el;
    }

});

