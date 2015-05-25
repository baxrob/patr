"use strict";


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

var examples = {
    // 2x each: prime, inv, retro, invret
    a: function(seed) {
        seed && row.update('steps', seed);
        var stages = ['invert', 'reverse', 'invert', 'reverse'];
        var counter = 0;
        function nextStage() {
            var stage = stages[counter++ % 4];;
            console.log(stage);
            row[stage]();
        }
        // XXX: row.every('beat', parseInt(row.seq.length * 1.5), null, nextStage);
        this.aId = row.every('loop', 2, null, nextStage);
        row.go();
    },
    b: function(seed) {
        seed && row.update('steps', seed);
    },
    c: function(seed) {
        seed && row.update('steps', seed);
    },
    d: function(seed) {
        seed && row.update('steps', seed);
    },
    e: function(seed) {
        seed && row.update('steps', seed);
    },
    f: function(seed) {
        seed && row.update('steps', seed);
    },
    g: function(seed) {
        seed && row.update('steps', seed);
    },
    h: function(seed) {
        seed && row.update('steps', seed);
    },
    i: function(seed) {
        seed && row.update('steps', seed);
    },
    cancel: function(egName) {
        row.cancel(this[egName + 'Id']);
        row.halt();
    }
};

window.examples = examples;
