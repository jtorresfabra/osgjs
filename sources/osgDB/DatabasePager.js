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
        this._pendingNodes = [];
    };
    
    DatabasePager.prototype = MACROUTILS.objectLibraryClass( {

        addNodeToQueue : function ( node , parent ) {
            if ( this._pendingNodes.indexOf( node ) !== -1 ){
                this._pendingNodes.push( node, parent );
            }
        },
        updateSceneGraph : function( frameStamp ){
            console.log('frameStamp:' , frameStamp.getFrameNumber() );
        },
    }, 'osgDB', 'DatabasePager' );

    return DatabasePager;
} );

