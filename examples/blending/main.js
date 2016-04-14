( function () {
    /**
     * @author Jordi Torres
     */
    'use strict';

    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgDB = OSG.osgDB;
    var osgViewer = OSG.osgViewer;

    var Example = function () {
        this._model = undefined;
    };

    Example.prototype = {

        initGui: function () {
        },

        getOrCreateModel: function ( size ) {
            if ( this._model === undefined ) {
                // check osg/Shape.js to see arguements of createTexturedQuadGeometry
                var model = osg.createTexturedQuadGeometry( -size / 2, -size / 2, 0,
                    size, 0, 0,
                    0, size, 0 );
                var texture = new osg.Texture();
                var that = this;
                P.resolve( osgDB.readImageURL( '../media/textures/alpha/tree.png' ) ).then( function ( image ) {
                    texture.setImage( image );
                    texture.setWrapT( 'REPEAT' );
                    texture.setWrapS( 'REPEAT' );
                    texture.setMinFilter( 'LINEAR_MIPMAP_LINEAR' );
                    var sset = model.getOrCreateStateSet();
                    var bb = new osg.BillboardAttribute();
                    bb.setEnabled( true );
                    sset.setAttributeAndModes( bb );
                    sset.setTextureAttributeAndModes( 0, texture );
                } );
                this._model = model;
            }
            return this._model;
        },


        createCloud: function ( value, position ) {
            var root =  new osg.MatrixTransform();
            osg.Matrix.makeTranslate( position[ 0 ], position[ 1 ], position[ 2 ], root.getMatrix() );
            for ( var i = 0, l = value; i < l; i++ ) {
                for ( var j = 0, m = value; j < m; j++ ) {
                    var mt = new osg.MatrixTransform();
                    var x = Math.random() * 50;
                    var y = Math.random() * 50;
                    var z = Math.random() * 50;
                    var size = 5;
                    osg.Matrix.makeTranslate( x, y, z, mt.getMatrix() );
                    mt.addChild( this.getOrCreateModel( size ) );
                    root.addChild( mt );
                }
            }
            return root;
        },

        run: function () {
            this.initGui();
            var canvas = document.getElementById( 'View' );
            // The viewer
            this.viewer = new osgViewer.Viewer( canvas, {
                'enableFrustumCulling': true
            } );
            
            var node = new osg.Node();
            // SSET NODE
            var sset  = node.getOrCreateStateSet();
            sset.setRenderingHint( 'TRANSPARENT_BIN' );
            sset.setAttributeAndModes( new osg.BlendFunc( 'ONE', 'ONE' ), osg.StateAttribute.ON | osg.StateAttribute.OVERRIDE);

            // CLOUD 1
            var cloud1 = this.createCloud( 30, osg.Vec3.createAndSet( 0, 0, 0 ) );

            var ssc1  = cloud1.getOrCreateStateSet();
            ssc1.setRenderingHint( 'TRANSPARENT_BIN' );
            ssc1.setAttributeAndModes( new osg.BlendFunc( 'ONE', 'ONE_MINUS_SRC_ALPHA' ), osg.StateAttribute.ON  );
            // CLOUD 2
            var cloud2 = this.createCloud( 30, osg.Vec3.createAndSet( 100, 0, 0 ) );
            var ssc2  = cloud2.getOrCreateStateSet();
            ssc2.setRenderingHint( 'TRANSPARENT_BIN' );
            ssc2.setAttributeAndModes( new osg.BlendFunc( 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA' ), osg.StateAttribute.ON | osg.StateAttribute.OVERRIDE);
            // CLOUD 3
            var cloud3 = this.createCloud( 30, osg.Vec3.createAndSet( 200, 0, 0 ) );
            var ssc3  = cloud3.getOrCreateStateSet();
            ssc3.setRenderingHint( 'TRANSPARENT_BIN' );
            ssc3.setAttributeAndModes( new osg.BlendFunc( 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA' ), osg.StateAttribute.OFF| osg.StateAttribute.OVERRIDE );


            node.addChild( cloud1 );
            node.addChild( cloud2 );
            node.addChild( cloud3 )
            this.viewer.init();
            this.viewer.setSceneData( node );
            this.viewer.setupManipulator();
            this.viewer.run();
        }
    };

    window.addEventListener( 'load', function () {
        var example = new Example();
        example.run();
    }, true );
} )();
