/**
 * @author Jordi Torres
 */

define( [
    'q',
    'osg/Utils',
    'osg/NodeVisitor',
    'osg/PagedLOD',
    'osg/Timer',
    'osg/Node'
], function ( Q, MACROUTILS, NodeVisitor, PagedLOD, Timer, Node ) {

    'use strict';
    /**
     * Database paging class which manages the loading of files
     * and synchronizing of loaded models with the main scene graph.
     *  @class DatabasePager
     */
    var DatabasePager = function () {
        this._pendingRequests = [];
        this._pendingNodes = [];
        this._loading = false;
        this._progressCallback = undefined;
        this._lastCB = true;
        this._doRequests = true;
        this._activePagedLODList = new Set();
        this._childrenToRemoveList = new Set();
        this._downloadingRequestsNumber = 0;
        this._maxRequestsPerFrame = 1;
        // In OSG the targetMaximumNumberOfPagedLOD is 300 by default
        // here we set 75 as we need to be more strict with memory in a browser
        // This value can be setted using setTargetMaximumNumberOfPageLOD method.
        this._targetMaximumNumberOfPagedLOD = 100;
    };

    var DatabaseRequest = function () {
        this._loadedModel = undefined;
        this._group = undefined;
        this._url = [];
        this._prefixurl = '';
        this._function = undefined;
        this._timeStamp = 0.0;
        this._groupExpired = false;
        this._priority = 0.0;
        this._finished = false;
        this._requests = [];
    };

    var FindPagedLODsVisitor = function ( pagedLODList, frameNumber ) {
        NodeVisitor.call( this, NodeVisitor.TRAVERSE_ALL_CHILDREN );
        this._activePagedLODList = pagedLODList;
        this._frameNumber = frameNumber;
    };
    FindPagedLODsVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
        apply: function ( node ) {
            if ( node.getTypeID() === PagedLOD.getTypeID() ) {
                node.setFrameNumberOfLastTraversal( this._frameNumber );
                this._activePagedLODList.add( node );
            }
            this.traverse( node );
        }
    } );

    var ReleaseVisitor = function () {
        NodeVisitor.call( this, NodeVisitor.TRAVERSE_ALL_CHILDREN );
    };
    ReleaseVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
        apply: function ( node ) {
            // mark GLResources in nodes to be released
            node.releaseGLObjects();
            this.traverse( node );
        }
    } );

    var ExpirePagedLODVisitor = function () {
        NodeVisitor.call( this, NodeVisitor.TRAVERSE_ALL_CHILDREN );
        this._childrenList = [];
    };

    ExpirePagedLODVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {

        apply: function ( node ) {
            if ( node.getTypeID() === PagedLOD.getTypeID() ) {
                this._childrenList.push( node );
                this._markRequestsExpired( node );
            }
            this.traverse( node );
        },

        removeExpiredChildrenAndFindPagedLODs: function ( plod, expiryTime, expiryFrame, removedChildren ) {
            if ( !plod.children.length ) return false;

            var sizeBefore = removedChildren.length;
            plod.removeExpiredChildren( expiryTime, expiryFrame, removedChildren );
            for ( var i = sizeBefore; i < removedChildren.length; i++ ) {
                removedChildren[ i ].accept( this );
            }
            return sizeBefore !== removedChildren.length;
        },

        _markRequestsExpired: function ( plod ) {
            var numRanges = plod._perRangeDataList.length;
            var request;
            for ( var i = 0; i < numRanges; i++ ) {
                request = plod.getDatabaseRequest( i );
                if ( request !== undefined ) {
                    for ( var h = request._requests.length -1 ; h >= 0; h--)
                    {
                        var xhr = request._requests.pop();
                        xhr.abort();
                    }
                    request._groupExpired = true;
                    if (request._promises){
                    for ( var j = 0; j< request._promises.length; j++ )
                        request._promises[j].resolve();
                    }
                    request._promises = undefined;
                    request._loadedModel = null;
                }
            }
        }
    } );

    DatabasePager.prototype = MACROUTILS.objectLibraryClass( {

        setTargetMaximumNumberOfPageLOD: function ( target ) {
            this._targetMaximumNumberOfPagedLOD = target;
        },

        getTargetMaximumNumberOfPageLOD: function () {
            return this._targetMaximumNumberOfPagedLOD;
        },

        reset: function () {
            this._pendingRequests = [];
            this._pendingNodes = [];
            this._loading = false;
            this._lastCB = true;
            this._activePagedLODList.clear();
            this._childrenToRemoveList.clear();
            this._downloadingRequestsNumber = 0;
            this._maxRequestsPerFrame = 10;
            this._doRequests = true;
            this._targetMaximumNumberOfPagedLOD = 75;
        },

        stopRequests: function () {
            this._doRequests = false;
        },

        startRequests: function () {
            this._doRequests = true;
        },

        updateSceneGraph: function ( frameStamp ) {
            // Progress callback
            if ( this._progressCallback !== undefined ) {
                // Maybe we should encapsulate this in a promise.
                this.executeProgressCallback();
            }
            // We need to control the time spent in DatabasePager tasks to
            // avoid making the rendering slow.
            // Probably we can have a time parameter to manage all the tasks.
            // Now it is fixed to 0.0025 ms to remove expired childs
            // and 0.005 ms  to add to the scene the loaded requests.

            // Remove expired nodes
            this.removeExpiredSubgraphs( frameStamp, 0.0025 );
            // Time to do the requests.
            this.takeRequests();
            // Add the loaded data to the graph
            this.addLoadedDataToSceneGraph( frameStamp, 0.005 );
        },

        executeProgressCallback: function () {
            if ( this._pendingRequests.length > 0 || this._pendingNodes.length > 0 || this._downloadingRequestsNumber > 0 ) {
                this._progressCallback( this._pendingRequests.length + this._downloadingRequestsNumber, this._pendingNodes.length );
                this._lastCB = false;
            } else {
                if ( !this._lastCB ) {
                    this._progressCallback( this._pendingRequests.length + this._downloadingRequestsNumber, this._pendingNodes.length );
                    this._lastCB = true;
                }
            }
        },

        setMaxRequestsPerFrame: function ( numRequests ) {
            this._maxRequestsPerFrame = numRequests;
        },

        getMaxRequestsPerFrame: function () {
            return this._maxRequestsPerFrame;
        },

        getRequestListSize: function () {
            return this._pendingRequests.length + this._downloadingRequestsNumber;
        },

        setProgressCallback: function ( cb ) {
            this._progressCallback = cb;
        },

        addLoadedDataToSceneGraph: function ( frameStamp, availableTime ) {

            if ( availableTime <= 0.0 ) return 0.0;

            // Prune the list of database requests.
            var elapsedTime = 0.0;
            var beginTime = Timer.instance().tick();
            this._pendingNodes.sort( function ( r1, r2 ) {
                return r2._timeStamp - r1._timeStamp;
            } );

            for ( var i = 0; i < this._pendingNodes.length; i++ ) {
                if ( elapsedTime > availableTime ) return 0.0;

                var request = this._pendingNodes.shift();
                var frameNumber = frameStamp.getFrameNumber();
                var timeStamp = frameStamp.getSimulationTime();

                // If the request is not expired, then add/register new childs
                if ( request._groupExpired === false ) {

                    var plod = request._group;
                    plod.setTimeStamp( plod.children.length, timeStamp );
                    plod.setFrameNumber( plod.children.length, frameNumber );
                    plod.addChildNode( request._loadedModel );

                    // Register PagedLODs.
                    if ( !this._activePagedLODList.has( plod ) ) {
                        this.registerPagedLODs( plod, frameNumber );
                    } else {
                        this.registerPagedLODs( request._loadedModel, frameNumber );
                    }

                } else {

                    // Clean the request
                    request._loadedModel = undefined;
                    //request = undefined;

                }
                elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
            }
            availableTime -= elapsedTime;
            return availableTime;
        },

        isLoading: function () {
            return this._loading;
        },

        registerPagedLODs: function ( subgraph, frameNumber ) {
            if ( !subgraph ) return;
            subgraph.accept( new FindPagedLODsVisitor( this._activePagedLODList, frameNumber ) );
        },

        requestNodeFile: function ( func, prefixurl, url, node, timestamp, priority ) {
            // We don't need to determine if the dbrequest is in the queue
            // That is already done in the PagedLOD, so we just create the request
            if ( !this._doRequests ) return undefined;
            var dbrequest = new DatabaseRequest();
            dbrequest._group = node;
            dbrequest._function = func;
            dbrequest._url = url;
            dbrequest._prefixurl = prefixurl;
            dbrequest._timeStamp = timestamp;
            dbrequest._priority = priority;
            this._pendingRequests.push( dbrequest );
            return dbrequest;
        },

        takeRequests: function () {
            if ( this._pendingRequests.length ) {
                var numRequests = Math.min( this._maxRequestsPerFrame, this._pendingRequests.length );
                this._pendingRequests.sort( function ( r1, r2 ) {
                    // Ask for newer requests first.
                    var value = r2._timeStamp - r1._timeStamp;
                    // Ask for the greater priority if the timestamp is the same.
                    if ( value === 0 ) {
                        value = r2._priority - r1._priority;
                    }
                    return value;

                } );
                for ( var i = 0; i < numRequests; i++ ) {
                    this.processRequest( this._pendingRequests.shift() );
                }
            }
        },
        processRequest: function ( dbrequest ) {

            this._loading = true;
            var that = this;
            // Check if the request is valid;
            if ( dbrequest._groupExpired ) {
                //Notify.log( 'DatabasePager::processRequest() Request expired.' );
                for (var h = 0, k = dbrequest._url.length; h < k; h++)
                    that._downloadingRequestsNumber--;
                this._loading = false;
                return;
            }

            // Load from function
            if ( dbrequest._function !== undefined ) {
                Q.when( this.loadNodeFromFunction( dbrequest._function, dbrequest._group ) ).then( function ( child ) {
                    that._downloadingRequestsNumber--;
                    dbrequest._loadedModel = child;
                    that._pendingNodes.push( dbrequest );
                    that._loading = false;
                } );
            } else if ( dbrequest._url.length > 0 ) { // Load from URL
                var pending = dbrequest._url.length;
                var g = new Node();
                dbrequest._loadedModel = g;
                that._pendingNodes.push( dbrequest );
                var retrieveChild = function ( i ){
                    Q.when( that.loadNodeFromURL( dbrequest, i ) ).then( function ( child ) {
                        // DEBUGSPHERE
                       //  var bbs = child.getBound();
                       //  var bs = Shape.createTexturedSphere( bbs.radius() );
                       //  bs.setName( 'debugSphere' );
                       //  bs.setCullingActive( false );
                       //  that.setMaterialAndAlpha( bs, 0.5 );
                       //  var transformSphere = new MatrixTransform();
                       //  transformSphere.setMatrix( Matrix.makeTranslate( bbs._center[ 0 ], bbs._center[ 1 ], bbs._center[ 2 ], [] ) );
                       //  transformSphere.addChild( bs );
                       //  child.addChild(transformSphere);
                        dbrequest._loadedModel.addChild( child );
                        pending = pending - 1;
                        that._downloadingRequestsNumber--;
                        if (pending === 0 ){
                            dbrequest._finished = true;
                            that._loading = false;
                        }
                    } );
                };
                for (var i = 0, j = dbrequest._url.length; i < j; i++) {
                    this._downloadingRequestsNumber++;
                    retrieveChild( i );
                }
            }
        },


        loadNodeFromFunction: function ( func, plod ) {
            // Need to call with pagedLOD as parent, to be able to have multiresolution structures.
            var defer = Q.defer();
            Q.when( ( func )( plod ) ).then( function ( child ) {
                defer.resolve( child );
            } );
            return defer;
        },

        loadNodeFromURL: function ( dbrequest, i ) {
            var ReaderParser = require( 'osgDB/ReaderParser' );
            var defer = Q.defer();
            var url = dbrequest._prefixurl + dbrequest._url[ i ];
            var options = ReaderParser.registry().getOptions();

            url = ReaderParser.registry().computeURL( url );
            var that = this;
            var readSceneGraph = function ( data ) {

                ReaderParser.parseSceneGraph( data, options )
                    .then( function ( child ) {
                        defer.resolve( child );
                       // Notify.log( 'loaded ' + url );
                    } ).fail( function ( error ) {
                        defer.reject( error );
                    } );
            };
            var ungzipFile = function ( file ) {

                function pad( n ) {
                    return n.length < 2 ? '0' + n : n;
                }

                function uintToString( uintArray ) {
                    var str = '';
                    for ( var i = 0, len = uintArray.length; i < len; ++i ) {
                        str += ( '%' + pad( uintArray[ i ].toString( 16 ) ) );
                    }
                    str = decodeURIComponent( str );
                    return str;
                }


                var unpacked = ReaderParser.registry()._unzipTypedArray( file );

                var typedArray = new Uint8Array( unpacked );
                var str = uintToString( typedArray );
                return str;
            };

            options = MACROUTILS.objectMix( {}, options );

            // automatic prefix if non specfied
            if ( options.prefixURL === undefined ) {
                var prefix = this.getPrefixURL();
                var index = url.lastIndexOf( '/' );
                if ( index !== -1 ) {
                    prefix = url.substring( 0, index + 1 );
                }
                options.prefixURL = prefix;
            }

            var fileTextPromise = this.requestFile( url, options, dbrequest );
            fileTextPromise.then( function ( str ) {
                var data;
                try {

                    data = JSON.parse( str );

                } catch ( error ) { // can't parse try with ungzip code path

                    //console.log( 'cant parse url ' + url + ' try to gunzip' );

                }
                // we have the json, read it
                if ( data )
                    return readSceneGraph( data );
                // no data try with gunzip
                var fileGzipPromise = that.requestFile( url, {
                    responseType: 'arraybuffer'},
                    dbrequest
                    );

                fileGzipPromise.then( function ( file ) {

                    var str = ungzipFile( file );
                    data = JSON.parse( str );
                    readSceneGraph( data );

                } ).fail( function ( ) {

                    //console.log( 'cant read file ' + url + ' status ' + status );
                    defer.reject();

                } ).done();

                return true;

            } ).fail( function ( ) {

                //console.log( 'cant get file ' + url + ' status ' + status );
                defer.reject();

            } ).done();

            return defer.promise;
        },

        requestFile: function ( url, options, dbrequest ) {

            var defer = Q.defer();

            var req = new XMLHttpRequest();
            dbrequest._requests.push( req );
            req.open( 'GET', url, true );

            // handle responseType
            if ( options && options.responseType )
                req.responseType = options.responseType;

            if ( options && options.progress ) {
                req.addEventListener( 'progress', options.progress, false );
            }

            req.addEventListener( 'error', function () {
                defer.reject();
            }, false );

            req.addEventListener( 'load', function ( /*oEvent */) {

                if ( req.responseType === 'arraybuffer' )
                    defer.resolve( req.response );
                else
                    defer.resolve( req.responseText );

            } );
            var that = this;
            req.addEventListener( 'abort', function ( /*oEvent */) {
                console.log('abort request');
                that._downloadingRequestsNumber--;
                defer.reject();
            } );

            req.send( null );

            return defer.promise;
        },

        releaseGLExpiredSubgraphs: function ( availableTime ) {

            if ( availableTime <= 0.0 ) return 0.0;
            // We need to test if we have time to flush
            var elapsedTime = 0.0;
            var beginTime = Timer.instance().tick();
            var that = this;

            this._childrenToRemoveList.forEach( function ( node ) {
                // If we don't have more time, break the loop.
                if ( elapsedTime > availableTime ) return;
                that._childrenToRemoveList.delete( node );
                node.removeChildren();
                node.accept( new ReleaseVisitor() );
                node = null;
                elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
            } );

            availableTime -= elapsedTime;
            return availableTime;
        },

        removeExpiredSubgraphs: function ( frameStamp, availableTime ) {

            if ( frameStamp.getFrameNumber() === 0 ) return 0.0;

            var numToPrune = this._activePagedLODList.size - this._targetMaximumNumberOfPagedLOD;
            var expiryTime = frameStamp.getSimulationTime() - 0.1;
            var expiryFrame = frameStamp.getFrameNumber() - 1;
            // First traverse and remove inactive PagedLODs, as their children will
            // certainly have expired.
            // TODO: Then traverse active nodes if we still need to prune.
            if ( numToPrune > 0 ) {
                availableTime = this.removeExpiredChildren( numToPrune, expiryTime, expiryFrame, availableTime );
            }
            return availableTime;
        },

        removeExpiredChildren: function ( numToPrune, expiryTime, expiryFrame, availableTime ) {
            // Iterate over the activePagedLODList to remove expired children
            // We need to control the time spent in remove childs.
            var elapsedTime = 0.0;
            var beginTime = Timer.instance().tick();
            var that = this;
            var removedChildren = [];
            var expiredPagedLODVisitor = new ExpirePagedLODVisitor();

            this._activePagedLODList.forEach( function ( plod ) {
                // Check if we have time, else return 0
                if ( elapsedTime > availableTime ) return 0.0;
                if ( numToPrune < 0 ) return availableTime;
                // See if plod is still active, so we don't have to prune
                if ( expiryFrame < plod.getFrameNumberOfLastTraversal() ) return availableTime;
                expiredPagedLODVisitor.removeExpiredChildrenAndFindPagedLODs( plod, expiryTime, expiryFrame, removedChildren );
                for ( var i = 0; i < expiredPagedLODVisitor._childrenList.length; i++ ) {
                    that._activePagedLODList.delete( expiredPagedLODVisitor._childrenList[ i ] );
                    numToPrune--;
                }
                // Add to the remove list all the childs deleted
                for ( i = 0; i < removedChildren.length; i++ ) {
                    that._childrenToRemoveList.add( removedChildren[ i ] );
                }
                expiredPagedLODVisitor._childrenList.length = 0;
                removedChildren.length = 0;
                elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
            } );
            availableTime -= elapsedTime;
            return availableTime;
        }
    }, 'osgDB', 'DatabasePager' );

    return DatabasePager;
} );
