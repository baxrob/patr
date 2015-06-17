//"use strict";


/*
row.update({
    steps: row.seq.map(function(val, idx, arr) {
    })
})

row.update({
    steps: row.seq.map(function(val, idx, arr) {
    })
})

row.update({
    steps: row.seq.map(function(val, idx, arr) {
    })
})

row.update({
    steps: row.seq.map(function(val, idx, arr) {
    })
})

var u0 = row.update({steps: [22,23,24,25,26,27,28,29,30,23,25,27,29,22,24,26,28]});
var a0 = row.at('loop', 1, 'reorder');
var e1 = row.every('loop', 2, null , 'reorder');
var e2 = row.every('beat', 12, null, function() { row.update({tone: 'sine'}) });
var e3 = row.every('beat', 9, null, function() { row.update({tone: 'organ'}) });
var e4 = row.every('beat', 18, null, function() { row.update({tone: 'square'}) });

var e5 = row.every('beat', 34, null, function() { row.update({vals: [[0,0], [2,0], [5,0], [9,0], [15,0], [17,0]]}) });

var end = setTimeout(row.halt, 80000);
row.go();
*/

var baseSeed = [22,23,24,25,26,27,28,29,30,23,25,27,29,22,24,26,28];

var seeds = [
    [22,23,24,25,26,27,28,29,30,31,32,33],
    [22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],
    [22,23,24,25,26,27,28,29,30,23,25,27,29,22,24,26],
    [32,0,0,39,17,36,15,0,22,11,31,0,24,8,24,8],
    [0,26,0,0,19,0,0,22,0,24,0,34,0,29,0,0],
    [0,26,0,0,19,0,0,22,0,24,0,34,0,29,0,20,0,26,0,0,19,0,0,22,0,0,0,34,0,29,22,0],
    [0,26,0,0,19,0,19,0,0,24,0,34,0,29,0,0,0,26,0,0,17,0,0,22,0,20,0,34,0,29,22,0],
    [15,0,31,6,0,38,35,0,39,11,0,2,27,0,0,22],
    [35,0,0,0,0,38,0,0,2,0,0,0,0,15,6,0,0,31,27,39,0,0,0,22,0,0,0,0,11,0,0,0]
];

var examples = {

    active: {},

    // 2x each: prime, inv, retro, invret
    a: function(seed, repeat) {
        // Serial ops.

        console.log('eg a');

        seed && row.update('steps', seed);
        var stages = ['invert', 'reverse', 'invert', 'reverse'];
        var stages = ['reverse', 'invert', 'reverse', 'invert'];
        var counter = 0;
        // XXX: un/repeatable
        function nextStage() {
            var stage = stages[counter++ % stages.length];;
            console.log(stage, counter - 1);
            row[stage]();
        }
        // XXX: row.every('beat', parseInt(row.seq.length * 1.5), null, nextStage);
        this.active.a = row.every(
            'loop', 
            2, 
            ! repeat ? stages.length : null, 
            nextStage,
            function() {
                repeat || this.cancel('a');
            }.bind(this)
        );
        //
        row.go();
    },
    a_1: function(seed, repeat) {
        repeat === false || (repeat = true);
        row.update('pace', 380);
        var reordCount = 0;
        var eoid = row.every('loop', 13, null, function() { 
            console.log('REORDER', ++reordCount); 
            row.reorder(); 
        }, function() {
            repeat || row.cancel(eoid);
        });
        var retoneCount = 0;
        var etid = row.every('loop', 6, null, function() { 
            var t=['sine','spring','organ','wind', 'square'];
            //var tt=t[parseInt(Math.random()*5)];
            var tt=t[parseInt(Math.random()*5)];
            console.log('RETONE',tt, ++retoneCount); 
            row.update('tone', tt); 
        }, function() {
            repeat || row.cancel(etid);
        });
        examples.a(seed, repeat);
        //row.regen();
        row.go();
    },
    b: function(seed, repeat) {
        // Re-orderings.

        console.log('eg b');

        seed && row.update('steps', seed);
        this.cancel('b', true);
        function reOrderStage() {
            this.active.b = row.every('beat', 26, 3, 'reorder', function() {
                console.log('done 26 3');
                this.cancel('b', true);
                this.active.b = row.every('beat', 16, 4, 'reorder', function() {
                    console.log('done 16 4');
                    this.cancel('b', true);
                    this.active.b = row.every(
                        'beat', 5, 11, 'reorder', function() {
                            console.log('done 5 11');
                            this.cancel('b');
                            //row.halt();
                            //console.log('repeat', repeat);
                            //once && row.halt();
                            ! repeat || reOrderStage.bind(this)();
                        }.bind(this)
                    );
                }.bind(this))
            }.bind(this));
        }
        reOrderStage.bind(this)();
        row.go();
    },
    c: function(seed, repeat) {
        // Re-tone-ings

        console.log('eg c');

        seed && row.update('steps', seed);

        //row.update('pace', 250);

        var len = row.seq.len;

        var toneOrdering = ['square', 'organ', 'spring', 'wind', 'sine'];
        var tones = toneOrdering.slice();
        function cycleTone() {
            tones.length || (tones = toneOrdering.slice());
            var nextTone = tones.shift();
            row.update('tone', nextTone);
        }
        function stageCompletion() {
            relay.publish('my_stage_done', {});
        }
        var my_stages = [
            ['every', ['beat', 2, 20, cycleTone, stageCompletion]],
            ['every', ['beat', 1, 25, cycleTone, stageCompletion]],
            ['every', ['beat', 3, 10, cycleTone, stageCompletion]],
            ['every', ['beat', 5, 8, cycleTone, stageCompletion]]
        ];
        var my_stage_idx = 0;
        
        relay.subscribe('my_stage_done', function(data) {
            var stage = my_stages[my_stage_idx];
            console.log('my_stage_done', stage[1]);
            // End if no more stages
            stage && (this.cId = row[stage[0]].apply(row, stage[1])); 
            my_stage_idx += 1;
            if (my_stage_idx == my_stages.length) {
                my_stage_idx = 0;
                if (! repeat) {
                    relay.unsubscribe('my_stage_done');
                    this.cancel('c');
                }
            }
        }.bind(this));

        //relay.publish('my_stage_done', {});
        
        this.active.c = row[my_stages[my_stage_idx][0]].apply(
            row, my_stages[my_stage_idx][1]
        );
        //my_stage_idx += 1;

        row.go();
    },
    d: function(seed, repeat) {
        // Re-length-enings.

        console.log('eg d');

        seed && row.update('steps', seed);
        seed || (seed = row.seq.steps);
        //var baseSeed = seed;
        //seed = seed || row.seq.steps;
        var lens = [0.5, 0.75, 1, 1.5, 0.75, 0.25]; 
        var nextLenIdx = 0;
        // XXX: cancel-able
        var runnerId = null;
        /*
        */
        relay.subscribe('seq_updated', function(data) {
            if (! data.options.my_key && data.options.steps) {
                //seed = row.seq.steps
                seed = data.options.steps
            } else if (data.options.my_key) {
                //console.log('seq_updy', data, data.options.my_key);
            };
        });
        function reLen(data) {
            /*
            console.log(
                data,
                nextLen, 
                lens[nextLen],
                seed.length * lens[nextLen],
                Math.round(seed.length * lens[nextLen])
            );
            */
            if (nextLenIdx == lens.length) {
                if (! repeat) {
                    //row.halt();
                    this.cancel('d');
                    return; // Note: early return.
                } else {
                    nextLenIdx = 0;
                    // Re-sample seed to avoid too many races with other egs
                    //seed = row.seq.steps;
                    //console.log('reset seed', seed);
                }
            }
            this.active.d = row.at('loop', 2, function() {
                console.log('re-seed at', seed, lens[nextLenIdx]);
                row.update({
                    my_key: true,
                    // XXX: should slice in row.update
                    steps: seed.slice(), 
                    //steps: seed,
                    len: Math.round(seed.length * lens[nextLenIdx])
                });
                nextLenIdx += 1;
            });
            //console.log(runnerId);
        }
        // XXX: unsub ?
        relay.subscribe('stage_done', function(data) {
            if (data.hook_id == this.active.d) {
                reLen.bind(this)(data);
            }
        }.bind(this));
        relay.publish('stage_done', {});
        row.go();
    },
    e: function(seed, repeat) {
        // Re-pacings.

        console.log('eg e');

        seed && row.update('steps', seed);

        var pk1 = row.pace;

        //console.log(row.seq.steps.length, row.seq.len);
        var tk1 = row.seq.len; 
        var pk2 = pk1 / 3,
            pk3 = pk1 / 2,
            pk4 = pk1 / 4,
            // XXX: should round in patt.schedulers.*
            tk2 = Math.round(tk1 / 2),
            tk3 = Math.round(tk1 / 3),
            tk4 = Math.round(tk1 / 4),
            tk5 = tk2,
            tk6 = tk3,
            tk7 = tk4
            ;
        var stages = [
            // XXX: ? beat/step ?
            ['at', ['beat', tk2, ['update', ['pace', pk2]]]],
            ['at', ['beat', tk2, ['update', ['pace', pk3]]]],
            ['at', ['beat', tk2, ['update', ['pace', pk4]]]],
            //['every', ['beat', tk2, tk3, ['update', ['pace', pk1]]]],
            //['every', ['beat', tk4, tk5, ['update', ['pace', pk2]]]],
            //['every', ['beat', tk6, tk7, ['update', ['pace', pk3]]]],
            ['at', ['beat', tk3, ['update', ['pace', pk1]]]],
            ['at', ['beat', tk4, ['update', ['pace', pk2]]]],
            ['at', ['beat', tk6, ['update', ['pace', pk3]]]],
        ];
        row.chain(stages, ! repeat);

        // XXX: 
        relay.subscribe('chain_done', function() {
            this.cancel('e');
        }.bind(this));
        this.active.e = function() {
            return row.patt.schedulers.chainHookId;
        };
        row.go();
    },

    f: function(seed, repeat) {
        // Additive seq.
        seed && row.update('steps', seed);
    },
    g: function(seed) {
        // Subtractive seq.
        seed && row.update('steps', seed);
    },
    h: function(seed, repeat) {
        // Custom tones.
        seed && row.update('steps', seed);
    },
    i: function(seed, repeat) {
        // Custom step transforms.
        seed && row.update('steps', seed);
    },
    j: function(seed, repeat) {
        // Custom tuning tables.
        seed && row.update('steps', seed);
    },
    k: function(seed, repeat) {
        // Custom step and param generators.
        seed && row.update('steps', seed);
    },

    all: function(seed, repeat) {

        console.log('all', seed, repeat);
        row.update('steps', seed || seeds[6]);

        /*
        row.at('loop', 2, examples.a.bind(this));
        row.at('loop', 8, examples.c.bind(this));
        row.at('loop', 12, examples.b.bind(this));
        row.at('loop', 22, examples.e.bind(this));
        row.at('loop', 24, examples.d.bind(this));
        */

        row.at('loop', 1, function() {
            //examples.a(null, true);
            examples.a();
        });
        row.at('loop', 5, function() { examples.c(null, repeat); });
        row.at('loop', 9, function() { examples.b(null, repeat); });
        row.at('loop', 15, function() { examples.d(null, repeat); });
        row.at('loop', 18, function() { examples.e(null, repeat); });

        row.go();
        
    },
    
    // XXX:
    init: function(options) {
    },
    
    cancel: function(item, forceContinue) {
        console.log('cancel', item);
        if (util.type(this[item + 'Id']) == 'Function') {
            row.cancel(this[item + 'Id']());
        } else {
            row.cancel(this[item + 'Id']);
        }
        //row.halt();
        if (this.active[item] !== undefined) {
            //console.log('this.active', item);
            if (util.type(this.active[item]) == 'Function') {
                row.cancel(this.active[item]());
            } else {
                row.cancel(this.active[item]);
            }
            delete this.active[item];
            var activeCount = 0;
            for (var key in this.active) {
                activeCount += 1;
            }
            if (! activeCount && ! forceContinue) {
                row.halt();
            } else {
                console.log('no halt for', this.active, forceContinue);
            }
        }
    },

    test: function() {
    }
};

window.examples = examples;

console.log('examples loaded');
