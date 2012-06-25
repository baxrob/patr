// Documentation is for the weak

var URI = Class.extend({
    init: function(assignor, delimiter, params) {
        this.assignor = assignor;
        this.delimiter = delimiter;
        this.params = params;

        this.updating = false;

        //todo: window.onhashchange = ...

    },
    parseHash: function() {
        this.hash = document.location.hash;
        var hashObj = this.hashToObj();
        var self = this;
        this.params.map(function(name) {
            hashObj[name] && (self[name] = hashObj[name]);
        });
    },
    hashToObj: function() {
        var self = this;
        var hashArray = this.hash.substr(1).split(
            this.delimiter
        ).filter(function(x) {
            return x !== '';
        }).map(function(x) {
            return x.split(self.assignor);
        });

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
        var self = this;
        this.params.map(function(name) {
            self.hash += name + self.assignor + self[name] + self.delimiter;
        });
    },
    writeHash: function() {
        document.location.hash = this.hash;
    }
});

