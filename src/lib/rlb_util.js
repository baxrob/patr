

function xhr(options) {
    var req = new XMLHttpRequest();
    // XXX: errors
    req.onreadystatechange = function(evt) {
        if (req.readyState == 4 && req.status == 200) {
            //console.log(evt, arguments, req);
            options.success && options.success(evt);
        }
    };
    req.open('GET', options.url || '', true);
    req.send(null);
}

var util = {
    type: function(obj) {
        return Object.prototype.toString.call(obj).match(/(\w+)\]/)[1];
    },
    trace: function(proc) {
        try {
            proc();
        } catch(e) {
            console.log(e.stack);
        }
    }
}
