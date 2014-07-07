/**
 * @author Jordi Torres
 */


define( [
    'Q',
    'osg/Utils',
], function ( Q, MACROUTILS ) {
    /**
     *  PagedLOD that can contains paged child nodes
     *  @class PagedLod
     */
    var DatabasePager = function () {
        this._pendingRequests = [];
    };

    var DatabaseRequest = function () {
        this._loadedModel = undefined;
        this._group = undefined;
    //   this.timeStamp = 0.0;
    //  this.frameNumber = 0;
    //    this.frameNumberOfLastTraversal = 0;
    };

    DatabasePager.prototype = MACROUTILS.objectLibraryClass( {

        addNodeToQueue : function ( node , parent ) {
            // We don't need to determine if the dbrequest is in the queue
            // That is already done in the PagedLOD
                var dbrequest = new DatabaseRequest();
                dbrequest._loadedModel = node;
                dbrequest._group = parent;
                this._pendingRequests.push( dbrequest );
        },

        updateSceneGraph : function( frameStamp ) {
            this.removeExpiredSubgraphs( frameStamp );
            this.addLoadedDataToSceneGraph( frameStamp );
        },

        removeExpiredSubgraphs : function (/* frameStamp */) {
         //   console.log( 'frameStamp:' , frameStamp.getFrameNumber( ) );
        },

        addLoadedDataToSceneGraph : function ( /*frameStamp*/) {
            // Prune the list of database requests.
            if ( this._pendingRequests.length ) {
                // Take the last element of the array. We are adding the nodes LIFO
                // Maybe be it's better to add the nodes FIFO?
                var request = this._pendingRequests.pop( );
                request._group.addChildNode( request._loadedModel );

                // TODO: control the time using frameStamp to not use too much time
            }
        }
    }, 'osgDB', 'DatabasePager' );

    return DatabasePager;
} );

