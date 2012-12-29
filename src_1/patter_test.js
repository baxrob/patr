"use strict";

$script('patter', function() {

    console.log(arguments);
    
    // TODO: grok: so document.ready already happened...
    $(document).ready(function() {
        alert(arguments);
    });

});
