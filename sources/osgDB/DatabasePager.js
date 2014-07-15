/**
 * @author Jordi Torres
 */


define( [
    'Q',
    'osg/Utils',
    'osg/Node'
], function ( Q, MACROUTILS, Node ) {
    /**
     *  PagedLOD that can contains paged child nodes
     *  @class PagedLod
     */
    var DatabasePager = function () {
        this._pendingRequests = [];
        this._pendingNodes = [];
        this._loading = false;
        this._progressCallback = undefined;
    };

    var DatabaseRequest = function () {
        this._loadedModel = undefined;
        this._group = undefined;
        this._urls = [];
        this._timeStamp = 0.0;
    //  this.frameNumber = 0;
    //    this.frameNumberOfLastTraversal = 0;
    };

    DatabasePager.prototype = MACROUTILS.objectLibraryClass( {

        addNodeToQueue : function ( dbrequest ) {
            // We don't need to determine if the dbrequest is in the queue
            // That is already done in the PagedLOD
                // var dbrequest = new DatabaseRequest();
                // dbrequest._loadedModel = node;
                // dbrequest._group = parent;
                this._pendingNodes.push( dbrequest );
        },


        updateSceneGraph : function( frameStamp ) {
            // Progress callback
            if ( this._progressCallback !== undefined )
                this._progressCallback( this._pendingRequests.length, this._pendingNodes.length );
            this.removeExpiredSubgraphs( frameStamp );
            if (!this._loading )
                this.takeRequests ( 1 );
            this.addLoadedDataToSceneGraph( frameStamp );
        },

        removeExpiredSubgraphs : function (/* frameStamp */) {
         //   console.log( 'frameStamp:' , frameStamp.getFrameNumber( ) );
        },

        setProgressCallback: function ( cb ) {
            this._progressCallback = cb;
        },

        addLoadedDataToSceneGraph : function ( /*frameStamp*/) {
            // Prune the list of database requests.
            if ( this._pendingNodes.length ) {
                // Take the last element of the array. We are adding the nodes LIFO
                // Maybe be it's better to add the nodes FIFO?
                var request = this._pendingNodes.shift( );
                request._group.addChildNode( request._loadedModel );

                // TODO: control the time using frameStamp to not use too much time
            }
        },

        requestNodeFile: function ( urls, node, timestamp ){
            var dbrequest = new DatabaseRequest();
            dbrequest._group = node;
            dbrequest._urls = urls;
            dbrequest._timeStamp = timestamp;
            this._pendingRequests.push( dbrequest );
            return dbrequest;
        },

        takeRequests: function ( number )
        {

            if ( this._pendingRequests.length )
            {
                //TODO: Sort and Purge old requests depending on timestamp
                this._pendingRequests.sort(function (r1, r2) { return r1.timestamp - r2.timestamp; } );
                // remove request if we have more than 50
                // if ( this._pendingRequests.length > 50 )
                //     this._pendingRequests = this._pendingRequests.slice ( 0, 50 );

                if( this._pendingRequests.length < number )
                    number = this._pendingRequests.length;
                for ( var i =0; i < number ; i++)
                {
                    this.processRequest ( this._pendingRequests.shift() );
                }
            }
        },

        processRequest: function ( dbrequest ) {

            var that = this;
            var promiseArray = [];
            for (var i = 0, j = dbrequest._urls.length; i < j; i++) {
                promiseArray.push( this.loadURL( dbrequest._urls[ i ] ) );
            }

            Q.all( promiseArray ).then( function( ) {
                // All the results from Q.all are on the argument as an array
                // Now insert children in the right order
                var g = new Node();
                for ( var i = 0, j = promiseArray.length ; i < j; i++ )
                {
                    g.addChild( promiseArray[ i ] );
                }
                dbrequest._loadedModel = g;
                that._pendingNodes.push( dbrequest );
                that._loading = false;
                //node.addChildNode(g);
            } );
        },


        loadURL: function ( url ) {
            // TODO:
            // we should ask to the Cache if the data is in the IndexedDB first
            var ReaderParser = require( 'osgDB/ReaderParser' );
            var defer = Q.defer();
            var req = new XMLHttpRequest();
            req.open( 'GET', url, true );
            req.onload = function ( aEvt ) {
                this._loading = true;
                var promise = ReaderParser.parseSceneGraph( JSON.parse( req.responseText ) );
                Q.when( promise ).then( function ( child ) {
                    defer.resolve( child );
                } );
                console.log( 'success ' + url, aEvt );
            };

            req.onerror = function ( aEvt ) {
                console.error( 'error ' + url, aEvt );
            };
            req.send( null );
            return defer.promise;
        },
    }, 'osgDB', 'DatabasePager' );

    return DatabasePager;
} );

