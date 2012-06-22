
var Face = Class.extend({
    init: function($parentElem, pattern) {
        this.$root = $parentElem;
        this.patt = pattern;

        $controls = this.$controls = this.buildControls();
        this.$root.append(this.$controls)

        this.$frame = this.buildFrame(this.elemHeight(this.$controls));
        this.$root.append(this.$frame);

        this.$root.css({
            margin: 0,
            padding: 0,
            overflow: 'hidden'
        });
        
        // todo: this.keyHandlers
        this.$root.keydown(function(evt) {
            switch (evt.keyCode) {
                case 32:
                    evt.preventDefault();
                    this.$playButton.triggerHandler('click');
                    break;
                default:
                    break; 
            }
        }.bind(this));

        $(window).on('resize', this.resizeHandler.bind(this));
        $(document).on('beat', this.beatHandler.bind(this));

    }, // init

    resizeHandler: function() {
        // fixme: appears to be 3px off.  why?
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

        $('.blinker').css('background-color', 'transparent');
        
        // fixme: cleanup, to func end
        var $blinker = $('#blinker_' + step),
            blinker_height = this.elemHeight($blinker),
            frame_height = this.elemHeight(this.$frame),
            fdr_widget_height = this.elemHeight($('.fdr').parent());// + blinker_height;

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
            // todo: blink scrollbar
            // Re-position off-screen row to page top
            this.$frame.scrollTop(
                this.$frame.scrollTop() + rows_per_screen * fdr_widget_height
            );
        }
        $blinker.css('background-color', '#f99');
    },
    updateRate: function(evt) {
        // fixme: pauseText param
        var playing = this.$playButton.text() === 'paus';

        // fixme: patt.stageUpdate - or just change patt.update 
        this.patt.stop();
        this.patt.update({ bpm: evt.target.value });
        if (playing) {
            // todo: use callback to pause, or defer pause
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

    clear: function() {
        // fixme: update this.patt.sequence
        //        this.updateSequenceDisplay
        $('.fdr').each(function(idx, el) {
            $(el).val(0); 
            $(el).triggerHandler('mouseup');
        });
    },
    regenerate: function() {
        // fixme: 
        var newSeq = this.patt.generateStepSeq();
        this.patt.update({
            seq: newSeq 
        });
        // todo: Face.updateSequenceDisplay
        // fixme: calling triggerHandler is kludgy
        $('.fdr').each(function(idx, el) {
            $(el).val(newSeq[idx]); 
            $(el).triggerHandler('mouseup');
        });
    },
    shuffle: function() {
        this.patt.shuffle();
        var newSeq = this.patt.stepSeq;
        $('.fdr').each(function(idx, el) {
            $(el).val(newSeq[idx]); 
            $(el).triggerHandler('mouseup');
        });
    },

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
                id: 'play_btn'
            },
            css: {
                'z-indez': '1000',
                'font-family': 'verdana',
                'font-size': '12px',
                'padding-left': '5px',
                'padding-right': '5px',
                'margin-top': '0px',
                'background-color': '#ddd',
                height: '18px',
                border: '1px solid silver',
                'border-radius': '4px',
                float: 'left'
            },
            text: 'go',
            on: {
                // todo: shift+click or enter key: stop/restart
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
        });

        $controls
        .append(this.$playButton)
        .append(
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
                    width: '3em',
                    border: '1px solid silver',
                    'border-radius': '4px',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    margin: 0,
                    'margin-left': '10px',
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
                tag: 'input',
                attr: {
                    type: 'text',
                    id: 'step_count',
                    title: 'step_count',
                    value: this.patt.options.stepCount
                },
                css: {
                    'text-align': 'right',
                    float: 'left',
                    width: '3em',
                    border: '1px solid silver',
                    'border-radius': '4px',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    margin: 0,
                    'margin-left': '10px',
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
                    // fixme: read from url
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
                    'border-radius': '4px',
                    'padding-left': '3px',
                    'padding-right': '3px',
                    margin: 0,
                    'margin-left': '10px',
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
                    id: 'shuff'
                },
                css: {
                    float: 'left',
                    'font-family': 'verdana',
                    'font-size': '12px',
                    'padding-left': '5px',
                    'padding-right': '5px',
                    'padding-top': '1px',
                    'margin-top': '0px',
                    'margin-left': '10px',
                    'background-color': '#ddd',
                    height: '17px',
                    'border-radius': '4px',
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
                    id: 'clear'
                },
                css: {
                    float: 'left',
                    'font-family': 'verdana',
                    'font-size': '12px',
                    'padding-left': '5px',
                    'padding-right': '5px',
                    'padding-top': '1px',
                    'margin-top': '0px',
                    'margin-left': '10px',
                    'background-color': '#ddd',
                    height: '17px',
                    'border-radius': '4px',
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
                    id: 'regen'
                },
                css: {
                    float: 'left',
                    'font-family': 'verdana',
                    'font-size': '12px',
                    'padding-left': '5px',
                    'padding-right': '5px',
                    'padding-top': '1px',
                    'margin-top': '0px',
                    'margin-left': '10px',
                    'background-color': '#ddd',
                    height: '17px',
                    'border-radius': '4px',
                    border: '1px solid silver'
                },
                text: 'regen',
                on: {
                    'click': self.regenerate.bind(self)
                }

            })
        )
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
                // todo: width should be viewport based
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
        //console.log(this.patt.options);
        return this.elem({
            tag: 'div',
            css: {
                float: 'left'
            }
        }).append(
            this.elem({
                tag: 'input',
                attr: {
                    type: 'range',
                    id: 'fdr_' + stepIdx,
                    'class': 'fdr',
                    min: this.patt.options.minNote,
                    max: this.patt.options.maxNote,
                    value: note,
                    title: note,
                    step: 1
                },
                css: {
                    '-webkit-appearance': 'slider-vertical',
                    width: '40px',
                    height: '100px'
                },
                on: {
                    //mouseup: self.updateFader.bind(this)
                    mouseup: function() {
                        var note;
                        var idx = this.id.split('_')[1];
                        var $blinker = $('#blinker_'+stepIdx);
                        if (this.value == 0) {
                            note = this.title = 0;
                            $blinker.css('border-color', 'transparent');
                        } else {
                            $blinker.css('border-color', '#d37');
                            note = this.title = this.value;
                        }
                        self.patt.stepSeq[idx] = note;
                        self.patt.updateSequence();
                    }
                }
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
    // todo: merge attr/css args - and reflect above
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
         
        //console.log($el, options);
        return $el;
    }

});

