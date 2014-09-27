
(function(global) {

    "use strict";

    // TODO: prevent duplicates
    //       handle failure
    //       de-cycle?
    //       discourage? assumed sibling includes / ordering - per 'module'

    function init(srcUrl) {

        var assetRoot, mainScriptFile;

        var queryString = srcUrl.replace(/^.*\?(.*)/, '$1');

        // If query string contains assignments, parse them
        if (queryString.match(/=/)) {
            var kwargs = {};
            queryString.split('&').forEach(function(expr) {
                var exprParts = expr.split('=');
                kwargs[exprParts[0]] = exprParts[1];
            });
            assetRoot = kwargs.path;
            mainScriptFile = kwargs.main;
        } else {
            // Otherwise, assign defaults
            assetRoot = '';
            // We fall through below if query string is blank
            mainScriptFile = queryString;
        }
        //console.log(queryString, kwargs);

        var waitingQueue = [];
        var busyLoading = false;

        function include(fileData, onComplete) {
            
            function loadWalkObject(pathFiles) {
                for (var path in pathFiles) {
                    loadWalkArray(
                        pathFiles[path].map(function(filePath) {
                            return path + filePath;
                        })
                    );
                }
            }
            
            function loadWalkArray(filePaths) {
                for (var idx in filePaths) {
                    var callback = (idx == filePaths.length - 1) 
                        ? onComplete 
                        : null;
                     enqueueOrLoadScript(filePaths[idx], callback);
                }
            }
            
            function enqueueOrLoadScript(filePath, onComplete) {
                //console.log('enqOrLoad', busyLoading, filePath, onComplete);
                if (busyLoading) {
                    waitingQueue.push([filePath, onComplete]);
                } else {
                    loadScript(filePath, onComplete);
                }
            }

            function loadScript(filePath, onComplete) {
                //console.log('loadScript', busyLoading, filePath);
                busyLoading = true;
                filePath = filePath.match(/\.js$/) ? filePath : filePath + '.js';
                var scriptTag = document.createElement('script');
                var basePath = filePath.match(/^\./)
                    ? ''
                    : assetRoot; 
                scriptTag.setAttribute('src', basePath + filePath);
                scriptTag.onload = function(evt) {
                    //console.log('script.onload', filePath, waitingQueue);
                    onComplete && onComplete();
                    busyLoading = false;
                    if (waitingQueue && waitingQueue.length) {
                        loadScript.apply(null, waitingQueue.shift());
                    }
                }
                console.log(scriptTag, basePath, filePath);
                // TODO: onreadystatechange = f() readyState == loaded|complete
                //       for IE
                document.scripts[document.scripts.length - 1].parentElement
                    .appendChild(scriptTag);
            }

            var fileDataType = Object.prototype.toString.call(fileData)
                .match(/(\w+)\]/)[1];
            fileDataType == 'Object' && loadWalkObject(fileData);
            fileDataType == 'Array' && loadWalkArray(fileData);
            fileDataType == 'String' && enqueueOrLoadScript(fileData);
            //console.log(fileData, fileDataType); 
        }

        // Dispatch inclusion of query string argument if not empty
        mainScriptFile && include(mainScriptFile);

        return include;
    
    }

    global.include = init(document.scripts[document.scripts.length - 1].src);

    global.addStyle = function(filePath, targetMedia) {
        var linkTag = document.createElement('link');
        linkTag.setAttribute('rel', 'stylesheet');
        linkTag.setAttribute('media', targetMedia || 'all');
        linkTag.setAttribute('href', filePath);
        linkTag.onload = function() {
            // TODO: consider using callback - is it sane in the css case ?
            //console.log('link.onload', arguments);
        };
        linkTag.onerror = function() {
            console.log('link.error', arguments);
        };
        document.head.appendChild(linkTag);
    };

    // TODO: consider exclude and removeStyle functions ?

})(this);
