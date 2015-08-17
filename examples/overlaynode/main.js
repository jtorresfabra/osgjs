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
            this.overlayNode.dirtyOverlayTexture();
            //this.overlayNode.setOverlayTextureUnit( 0 );
        },
        run: function () {
            // The 3D canvas.
            this.createMap();
            var canvas = document.getElementById( 'View' );

            //var node = osg.createTexturedQuadGeometry( minExtent[ 0 ], minExtent[ 1 ], 0, maxExtent[ 0 ] - minExtent[ 0 ], 0, 0, 0, maxExtent[ 1 ] - minExtent[ 1 ], 0 );
            var node = osg.createTexturedQuadGeometry( -5, -5, 0, 10, 0, 0, 0, 10, 0 );
            //var node = osg.createTexturedSphereGeometry( 8, 20, 20 );
            var cube = osg.createTexturedBoxGeometry( 0, 0, 0, 10, 10, 10 );
            var materialGround = new osg.Material();
            materialGround.setAmbient( [ 0, 0, 0, 1 ] );
            materialGround.setDiffuse( [ 1, 1, 1, 1 ] );
            cube.getOrCreateStateSet().setAttributeAndModes( materialGround );
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
            this.overlayNode = new osgUtil.OverlayNode();
            this.overlayNode.setContinuousUpdate( true );
            //this.overlayNode.setDynamicOverlayResolution( true );
            this.overlayNode.dirtyOverlayTexture();
            this.overlayNode.setOverlaySubgraph( node );
            this.overlayNode.setOverlayTextureUnit( 1 );
            this.overlayNode.addChild( cube );

            this.viewer = new osgViewer.Viewer( canvas, {
                'enableFrustumCulling': true
            } );
            this.viewer.init();
            this.viewer.setSceneData( this.overlayNode );
            var bs = this.overlayNode.getBound();
            this.viewer.setupManipulator();
            this.viewer.getManipulator().setDistance( bs.radius() * 3.5 );
            this.viewer.run();
        }
    };

    window.addEventListener( 'load', function () {
        var example = new Example();
        example.run();
    }, true );
} )();
