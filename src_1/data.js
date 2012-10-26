"use strict";

var URN;
var URL;
var URI = Class.extend({
    init: function(assignor, delimiter, params, target) {
        this.assignor = assignor;
        this.delimiter = delimiter;
        this.params = params;

        this.target = target ? target : document.location;

        this.updating = false;

        window.onhashchange = function(evt) {
            if (
                this.onchangeHook && ! this.updating
                // CLEANUP: this should be redundant - verify
                && evt.oldURL !== evt.newURL
            ) {
                this.updating = true;
                this.onchangeHook();
                this.updating = false;
            }
        }.bind(this);

    },
    parseHash: function() {
        this.hash = this.target.hash;
        var hashObj = this.hashToObj();
        this.params.map(function(name) {
            // params become instance properties 
            hashObj[name] && (this[name] = hashObj[name]);
        }.bind(this));
    },
    hashToObj: function() {
        var hashArray = this.hash.substr(1).split(
            this.delimiter
        ).filter(function(x) {
            return x !== '';
        }).map(function(x) {
            return x.split(this.assignor);
        }.bind(this));

        var hashObj = {};
        hashArray.map(function(x) {
            hashObj[x[0]] = x[1];
        });
        return hashObj;
    },
    update: function(params) {
        if (! this.updating) {
            this.updating = true;
            for (var name in params) {
                // params are instance properties
                params[name] && (this[name] = params[name]);
            }
            this.buildHash();
            if (this.hash !== this.target.hash) {
                this.writeHash();
            }
            this.updating = false;
        }
    },
    buildHash: function() {
        this.hash = '#';
        this.params.map(function(name) {
            this.hash += name + this.assignor + this[name] + this.delimiter;
        }.bind(this));
    },
    writeHash: function() {
        this.target.hash = this.hash;
    }
});

