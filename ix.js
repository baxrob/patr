
var Face = Class.extend({
    init: function($parentElem, pattern) {
        this.$root = $parentElem;
        this.patt = pattern;

        this.patt.updateDisplayHook = function(data) {
            this.updateControlDisplay(data.controls);
            this.updateSequenceDisplay(data.sequence);
        }.bind(this);

        this.dataControlMap = {
            bpm: 'bpm',
            stepCount: 'step_count'
        };

        $controls = this.$controls = this.buildControls();
        this.$root.append(this.$controls)

        this.$frame = this.buildFrame(this.elemHeight(this.$controls));
        this.$root.append(this.$frame);

        this.$root.css({
            'font-family': 'verdana',
            margin: 0,
            padding: 0,
            overflow: 'hidden'
        });
        
        //
        // TODO: this.keyHandlers
        this.$root.keydown(function(evt) {
            // FIXME: please grok!!! :
            //        window.onkeypress - s evt.keycode is 115
            //        window.onkeydown - s evt.keycode is 83
            //        $(window).on('key...', ... - ?
            //        chrome vs ffox vs ...
            switch (evt.keyCode) {
                case 32: // Spacebar
                    evt.preventDefault();
                    this.$playButton.triggerHandler('click');
                    break;
                case 83: // 's'
                    this.shuffle();
                    break;
                // c.lear, r.egen
                // ? - p.ace +nnn, l.en +nnn
                default:
                    break; 
            }
        }.bind(this));


        $(window).on('resize', this.resizeHandler.bind(this));
        $(document).on('beat', this.beatHandler.bind(this));

        // TODO: move this somewhere sensible - css loader / parser class
        $('head').append(
            this.elem({
                tag: 'link',
                attr: {
                    type: 'text/css',
                    rel: 'stylesheet',
                    media: 'all',
                    href: (window.appRoot || '') 
                        //+ 'lib/css/custom-theme/jquery-ui-1.8.21.custom.css'
                        + 'lib/ui-slider-custom.css'
                }
            })
        );

    }, // init


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

        // TODO: move this to generated css file / .classes
        $('.blinker').css({
            'background-color': 'transparent',
            'box-shadow': 'none'
        });
        
        $('.ui-slider-handle').css({
            'background': '#555',
            'border-color': '#999',
            'border-width': '1px',
            'box-shadow': 'none'
        });
        $('.fdr').css({
            'border-color': '#999',
            'box-shadow': 'none'
        });
        
        // FIXME: cleanup this clusterf* - here to func end
        var $blinker = $('#blinker_' + step),
            blinker_height = this.elemHeight($blinker),
            frame_height = this.elemHeight(this.$frame),
            fdr_widget_height = this.elemHeight($('.fdr').parent()),// + blinker_height;

            frame_height = this.$frame.height() + 
                parseInt(this.$frame.css('padding-top'));

        var rows_per_screen = Math.floor(
            frame_height / (fdr_widget_height - 10)
        );
        
        if ($blinker.attr('id').split('_')[1] == 0) { 
            // Return to top row
            this.$frame.scrollTop(0);
        } else if (
            $blinker.position().top >
            this.$frame.height() + blinker_height
        ) {
            // TODO: blink scrollbar
            // Re-position off-screen row to page top
            this.$frame.scrollTop(
                this.$frame.scrollTop() + rows_per_screen * fdr_widget_height
            );
        }
        $blinker.css({
            'background-color': '#b03',
            'box-shadow': '0 0 1px 1px #999'
        });
        $('#fdr_' + step + ' .ui-slider-handle').css({
            'background': '#a03',
            'border-color': '#d37',
            'border-width': '1px',
            'box-shadow': '0 0 1px 1px #999'
        });
        $('#fdr_' + step).css({
            //'border-color': '#b15',
            'box-shadow': '0 0 1px 1px #999'
        });
    },


    // Control actions
    updateRate: function(evt) {
        // FIXME: pause and reset to seq[0] without doubly-triggering
        //        patt.tr.setUpdateHook

        // TODO: init/use pauseText param
        //       dataDisplayMap ? or, eg dataControlMap['run']=['go','paus']
        var playing = this.$playButton.text() === 'paus';

        // FIXME: patt.stageUpdate - or just change patt.update 
        //this.patt.stop();
        this.patt.update({ bpm: evt.target.value });
        if (playing) {
            // TODO: use callback to pause, or defer pause
            setTimeout(function() {
                this.patt.playSequence();
            }.bind(this), 100);
        }

        $(evt.target).blur();
    },
    updateLength: function(evt) {
        var playing = this.$playButton.text() === 'paus';
        var newSeq = this.patt.stepSeq.slice();
        var diff = evt.target.value - this.patt.stepSeq.length;
        // If increasing length, pad with silent notes
        //    otherwise resize, leaving previous tail
        //    intact in uri
        //FIXME: fails to cycle after seq expansion 
        while (diff > 0) {
            newSeq.push(0)
            diff--;
        }
        this.patt.update({
            seq: newSeq,
            stepCount: evt.target.value
        });
        $(evt.target).blur();
        $('#frame').remove();
        this.$frame = this.buildFrame(this.elemHeight(this.$controls));
        this.$root.append(this.$frame);
        $(window).triggerHandler('resize');
    },

    shuffle: function() {
        // FIXME: (in synth?) clicks during large sequence change (~300)
        //        same with regenerate.  update in local +- len/x steps
        //        first then the rest?
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
            $('#' + this.dataControlMap[key]).val(data[key]);
        }
    },
    updateSequenceDisplay: function(sequence) {
        $('.fdr').each(function(idx, el) {
            $(el).slider('value', sequence[idx]);
            $(el).find('a').text(sequence[idx]); 
            this.updateBlinkerState(idx);
        }.bind(this));
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
                'padding-top': '9px',
                'padding-left': '9px',
                'background-color': '#fcfeef',
                'border-bottom': '1px solid silver'
            }
        });

        this.$playButton = this.elem({
            tag: 'div',
            attr: {
                id: 'play_btn',
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
                'margin-right': '15px',
                'background-color': '#ddd',
                height: '18px',
                border: '1px solid silver',
                'border-radius': '2px',
                float: 'left'
            },
            text: 'go',
            on: {
                // TODO: shift+click or enter key: stop/restart
                click: function() {
                    if ($(this).text() == 'go') {
                        //self.patt.playSequence();
                        self.patt.unpause();
                        $(this).text('paus');
                    } else {
                        //self.patt.stop();
                        self.patt.pause();
                        $(this).text('go');
                    }
                }
            }
        }); // $playButton

        $controls
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
            }).text('rate:')
        ).append(
            this.elem({
                tag: 'input',
                attr: {
                    type: 'text',
                    id: 'bpm',
                    title: 'bpm',
                    value: this.patt.options.bpm
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '2.2em',
                    border: '1px solid silver',
                    'border-radius': '2px',
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
                    title: 'steps',
                    value: this.patt.options.stepCount
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '2.2em',
                    border: '1px solid silver',
                    'border-radius': '2px',
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
                    title: 'reshuf each',
                    value: 1 //this.patt.toneRow.repeats
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '1.5em',
                    border: '1px solid silver',
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
                    title: 'shuffle notes\n("S" key)'
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
                    'background-color': '#ddd',
                    height: '17px',
                    'border-radius': '2px',
                    border: '1px solid silver'
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
                    title: 'zero all'
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
                    'background-color': '#ddd',
                    height: '17px',
                    'border-radius': '2px',
                    border: '1px solid silver'
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
                    title: 'new random sequence'
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
                    'background-color': '#ddd',
                    height: '17px',
                    'border-radius': '2px',
                    border: '1px solid silver'
                },
                text: 'regen',
                on: {
                    'click': self.regenerate.bind(self)
                }

            })
        ) // $controls

        // FIXME: this is a separate deal - $controls must be in DOM before
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
                border: '1px solid silver'
            }
        }).text('[explanatory, as hover-text per control above: fade out after 10, 5, 3 secs, per user\'s visit count; then don\'t show, (but also add help button at control edge-right.)]');
        //$controls.append($controlsHint);

        return $controls;
    }, // buildControls

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
                height: $(window).height() - topMargin - 5 + 'px'//'100%'
            }
        });
        var $innerFrame = this.elem({
            tag: 'div',
            css: {
                // TODO: width should be viewport based
                //       fix for scroll-down behavior
                width: '540px', // should be 12x fader width
                margin: 'auto'
            }
        });
        for (var i = 0; i < this.patt.options.stepCount; i++) {
            //console.log(idx, this.buildFader(idx));
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
                    // FIXME: step-val edits after seq-len extension - if 
                    //        in new portion of extended range - don't 
                    //        register with tr
                    //        eh .. sometimes?

                    console.log(this);
                    var note = el.value;
                    this.patt.stepSeq[stepIdx] = note;
                    this.patt.updateSequence();
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
        return + $el.css(property).slice(0, -2);
    },
    elemHeight: function($el) { // Returns int
        var self = this;
        var cssInt = function(property) {
            return self.intValFromCSS($el, property);
        };
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

