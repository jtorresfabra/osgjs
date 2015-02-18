( function () {
    'use strict';

    var OSG = window.OSG;
    OSG.globalify();
    var osg = OSG.osg;
    var osgViewer = OSG.osgViewer;
    var osgUtil = OSG.osgUtil;
    var $ = window.$;

    var Example = function () {};

    Example.prototype = {

        // This function will create a basic scene with some cubes
    createScene : function ( viewer ) {
    var root = new osg.Node();

    var request = osgDB.readNodeURL( 'minitin.osgjs' );
    Q( request ).then( function ( node ) {
        root.addChild( node );
        var visitor = new osgUtil.DisplayNodeGraphVisitor();
        root.accept( visitor );
        visitor.createGraph();
        viewer.getManipulator().computeHomePosition();
    } );

    return root;
    },

        run: function ( canvas ) {

            var viewer;
            viewer = new osgViewer.Viewer( canvas, {
                antialias: true,
                alpha: true
            } );
            viewer.init();

            var rotate = new osg.MatrixTransform();
            var root = this.createScene();

           

            rotate.addChild( root );

            viewer.getCamera().setClearColor( [ 0.0, 0.0, 0.0, 0.0 ] );
            viewer.setSceneData( rotate );
            viewer.setupManipulator();
            viewer.getManipulator().computeHomePosition();

            viewer.run();
        }

    };

    window.addEventListener( 'load', function () {
        var example = new Example();
        var canvas = $( '#View' )[ 0 ];
        example.run( canvas );
    }, true );

} )();
