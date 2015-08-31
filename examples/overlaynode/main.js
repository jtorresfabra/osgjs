( function () {
    /**
     * @author Jordi Torres
     */
    'use strict';

    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgViewer = OSG.osgViewer;
    var osgUtil = OSG.osgUtil;

    var minExtent = [ -20037508.342789244, -20037508.342789244 ];
    var maxExtent = [ 20037508.342789244, 20037508.342789244 ];
    var extent = [ 1159303.9963296999, 9206308.74538979, 1159996.3355393922, 9207002.018075367 ];
    //var extent = [ minExtent[ 0 ], minExtent[ 1 ], maxExtent[ 0 ], maxExtent[ 1 ] ];

    var Example = function () {
        this.viewer = undefined;
        this.map = undefined;
        this.texture = undefined;
        this.overlayNode = undefined;
    };

    Example.prototype = {


        createMap: function () {
            var layers = [
                new ol.layer.Group( {
                    layers: [
                        new ol.layer.Tile( {
                            source: new ol.source.TileWMS( {
                                crossOrigin: 'anonymous',
                                url: 'http://crossorigin.me/http://www.webatlas.no/wms-std-vegvesen-n1',
                                params: {
                                    LAYERS: 'ortofoto',
                                    VERSION: '1.1.1'
                                }
                            } )
                        } ),
                    ]
                } )
            ];
            this.map = new ol.Map( {
                //loadTilesWhileInteracting: true,
                target: 'map',
                layers: layers,
                view: new ol.View( {
                    center: [ 0.0, 0.0 ],
                    //minZoom: 0,
                    zoom: 1,
                    renderer: 'canvas'
                } )
            } );
            return map;
        },

        getMapImage: function ( node ) {
            var defer = P.defer();
            var that = this;
            var postCompose = function () {
                var viewport = that.map.getViewport();
                var canvas = viewport.getElementsByTagName( "canvas" )[ 0 ];
                that.setMapImage( canvas, node );
                defer.resolve();
            };
            this.map.on( 'postrender', postCompose );
            var view = this.map.getView();
            view.fit( extent, [ 1024, 1024 ], {
                constrainResolution: false
            } );
            return defer.promise;
        },

        setMapImage: function ( img, node ) {
            this.texture.setImage( img );
            var stateset = node.getOrCreateStateSet();
        },
        run: function () {
            // The 3D canvas.
            this.createMap();
            var canvas = document.getElementById( 'View' );

            var mt = new osg.MatrixTransform();
            mt.setMatrix( osg.Matrix.makeTranslate( 50, 0, 0, [] ) );
            var cube = osg.createTexturedBoxGeometry( 50, 50, 50, 10, 10, 10 );
            mt.addChild( cube );

            var bs = cube.getBound();
            var bb = new osg.BoundingBox();
            bb.expandByBoundingSphere( bs );
            // var cbVisitor = new osg.ComputeBoundsVisitor();
            // cube.accept( cbVisitor );
            // var bb = cbVisitor.getBoundingBox();
            var node = osg.createTexturedQuadGeometry( bb.xMin(), bb.yMin(), bb.zMin(), bb.xMax() - bb.xMin(), 0, 0, 0, bb.yMax() - bb.yMin(), 0 );
            //var node = osg.createTexturedQuadGeometry( 45, 45, 45, 10, 0, 0, 0, 10, 0 );
            // ar materialGround = new osg.Material();
            // materialGround.setAmbient( [ 0, 0, 0, 1 ] );
            // materialGround.setDiffuse( [ 1, 1, 1, 1 ] );
            //cube.getOrCreateStateSet().setAttributeAndModes( materialGround );
            // The viewer
            this.texture = new osg.Texture();
            this.texture.setTextureSize( 1024, 1024 );
            this.texture.setMinFilter( 'LINEAR' );
            this.texture.setMagFilter( 'LINEAR' );
            var that = this;
            this.getMapImage( node ).then( function ( img ) {
                var stateset = node.getOrCreateStateSet();
                stateset.setTextureAttributeAndModes( 0, that.texture );
            } );
            var group = new osg.Node();
            group.addChild( node );
            this.overlayNode = new osgUtil.OverlayNode();
            this.overlayNode.setContinuousUpdate( true );
            //this.overlayNode.setDynamicOverlayResolution( true );
            this.overlayNode.dirtyOverlayTexture();
            this.overlayNode.setOverlaySubgraph( node );
            this.overlayNode.setOverlayTextureUnit( 1 );
            this.overlayNode.addChild( mt );
            group.addChild( this.overlayNode );
            this.viewer = new osgViewer.Viewer( canvas, {
                'enableFrustumCulling': true
            } );
            this.viewer.init();
            this.viewer.setSceneData( group );
            var bs = this.overlayNode.getBound();
            this.viewer.setupManipulator();
            this.viewer.getManipulator().setTarget( mt.getBound().center() );
            this.viewer.getManipulator().setDistance( mt.getBound().radius() * 3.5 );
            this.viewer.run();
        }
    };

    window.addEventListener( 'load', function () {
        var example = new Example();
        example.run();
    }, true );
} )();
