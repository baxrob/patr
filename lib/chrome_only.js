
function alert_compat($el) {
    if (! navigator.userAgent.match(/chrome/i)) {
        // Display borken warning and prevent further loading
        alert('This only works in Google\'s Chrome browser.');
        console.log($('#ctl_bar'));
        return false;
    }
    return true;
}
