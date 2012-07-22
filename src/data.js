
var URI = Class.extend({
    init: function(assignor, delimiter, params) {
        this.assignor = assignor;
        this.delimiter = delimiter;
        this.params = params;

        this.updating = false;

        window.onhashchange = function(evt) {
            // FIXME: back/fwd doesn't update seq length (eh, this is
            //        seq.patt's problem)
            if (this.onchangeHook && ! this.updating) {
                this.updating = true;
                this.onchangeHook();
                this.updating = false;
            }
        }.bind(this);

    },
    parseHash: function() {
        this.hash = document.location.hash;
        var hashObj = this.hashToObj();
        this.params.map(function(name) {
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
            for (name in params) {
                params[name] && (this[name] = params[name]);
            }
            this.buildHash();
            if (this.hash !== document.location.hash) {
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
        document.location.hash = this.hash;
    }
});

