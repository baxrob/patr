

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
