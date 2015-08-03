( function () {
    /**
     * @author Jordi Torres
     */
    'use strict';

    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgViewer = OSG.osgViewer;
    var $ = window.$;

    var minExtent = [ -20037508.342789244, -20037508.342789244 ];
    var maxExtent = [ 20037508.342789244, 20037508.342789244 ];

    var Example = function () {
        var maxx, minx, miny, maxy;
        var viewer;
        var params = undefined;
        var gui = undefined;
        this.map = undefined;
        this._config = {
            lodScale: 0.01,
            acceptNewRequests: true
        };
        this.mapRequests = new Map();
        this.loadingMap = false;
    };

    Example.prototype = {


        createMap: function () {
            var layers = [
                new ol.layer.Group( {
                    layers: [
                        new ol.layer.Tile( {
                            source: new ol.source.MapQuest( {
                                layer: 'sat'
                            } )
                        } ),
                        new ol.layer.Tile( {
                            source: new ol.source.MapQuest( {
                                layer: 'hyb'
                            } )
                        } )
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
                    renderer: 'webgl'
                } )
            } );
            return map;
            //this.map.getView().fit([ minExtent[ 0 ], minExtent[ 1 ], maxExtent[ 0 ], maxExtent[ 1 ] ],[ 256, 256 ]);
        },

        getMapImage: function ( node ) {
            // Let's see some OpenLayers magic
            var extent = node.extent;
            var defer = P.defer();
            var that = this;

            var postRender = function ( event ) {
                var viewport = that.map.getViewport();
                var canvas = viewport.getElementsByTagName( "canvas" )[ 0 ];
                that.map.unByKey( key );
                var canvasCopy = cloneCanvas( canvas );
                defer.resolve( canvasCopy );
            };
            var cloneCanvas = function ( oldCanvas ) {
                //create a new canvas
                var newCanvas = document.createElement( 'canvas' );
                var context = newCanvas.getContext( '2d' );
                //set dimensions
                newCanvas.width = oldCanvas.width;
                newCanvas.height = oldCanvas.height;
                //apply the old canvas to the new one
                context.drawImage( oldCanvas, 0, 0 );
                //return the new canvas
                return newCanvas;
            };
            // var drawTileInfo = function ( event ){
            //     var ctx = event.context;
            //     ctx.font="20px Georgia";
            //     ctx.fillStyle = 'yellow';
            //     ctx.fillText(node.parents[ 0 ].level + ' ' + node.parents[ 0 ].x + node.parents[ 0 ].y,10,50);
            // }
            //this.map.once( 'postcompose', drawTileInfo );
            var key = this.map.once( 'postrender', postRender );
            var view = this.map.getView();
            view.fit( extent, [ 128, 128 ], {
                constrainResolution: false
            } );
            return defer.promise;
        },

        createTileForGeometry: function ( i, x, y, width, height ) {
            var node = osg.createTexturedQuadGeometry( x, y, 0, width, 0, 0, 0, height, 0 );
            node.extent = [ x, y, x + width, y + height ];
            //node.extent = [-20037508.342789244, -20037508.342789244, 0 , 0 ];
            node.loaded = false;
            var that = this;
            var CullCallback = function () {};

            CullCallback.prototype = {
                cull: function ( node, nv ) {
                    if ( !that.loadingMap && !node.loaded ) {
                        that.loadingMap = true;
                        that.getMapImage( node ).then( function ( canvas ) {
                            var texture = new osg.Texture();
                            texture.setTextureSize( 128, 128 );
                            texture.setMinFilter( 'LINEAR' );
                            texture.setMagFilter( 'LINEAR' );
                            texture.setImage( canvas );
                            node.loaded = true;
                            var stateset = node.getOrCreateStateSet();
                            stateset.setTextureAttributeAndModes( 0, texture );
                            node._cullCallback = undefined;
                            that.loadingMap = false;
                            return true;
                        } ).catch( function ( e ) {
                            console.error( "error:", e );
                        } );
                        return false;
                    }

                }
            };
            node.setCullCallback( new CullCallback() );
            return node;
        },

        subTileLevelRowCol: function ( subTileId, level, row, col ) {
            var x = 0;
            var y = 0; // subtileID = 0 is 0,0
            if ( subTileId === 1 ) {
                x = 1;
            } else if ( subTileId === 2 ) {
                y = 1;
            } else if ( subTileId === 3 ) {
                x = 1;
                y = 1;
            }

            var sLevel = level + 1;
            var sCol = col * 2 + x;
            var sRow = row * 2 + y;
            return {
                sLevel: sLevel,
                sCol: sCol,
                sRow: sRow
            };
        },

        levelRowColToXYWidthHeight: function ( rootLevel, level, row, col ) {
            var leveldiff = level - rootLevel;
            var tileExtent = this.computeExtent( leveldiff, row, col );
            var width = this.maxx - this.minx;
            var height = this.maxy - this.miny;
            return {
                x: tileExtent.minx,
                y: tileExtent.miny,
                width: width,
                height: height
            };

        },

        computeExtent: function ( level, x, y ) {
            var numTiles = ( 1 << level );
            var width = ( maxExtent[ 0 ] - minExtent[ 0 ] ) / numTiles;
            var height = ( maxExtent[ 1 ] - minExtent[ 1 ] ) / numTiles;
            this.minx = minExtent[ 0 ] + x * width;
            this.miny = minExtent[ 1 ] + y * height;
            this.maxx = this.minx + width;
            this.maxy = this.miny + height;
            return {
                minx: this.minx,
                miny: this.miny,
                maxx: this.maxx,
                maxy: this.maxy
            };
        },

        initGui: function () {
            this.gui = new window.dat.GUI();
            var self = this;
            // config to let dat.gui change the scale
            var lodScaleController = this.gui.add( this._config, 'lodScale', 0.01, 3.0 );
            lodScaleController.onChange( function ( value ) {
                self.viewer.getCamera().getRenderer().getCullVisitor().setLODScale( value );
            } );
            var acceptRequestscontroller = this.gui.add( this._config, 'acceptNewRequests' );
            acceptRequestscontroller.onChange( function ( value ) {
                self.viewer.getDatabasePager().setAcceptNewDatabaseRequests( value );
            } );

        },
        run: function () {
            // The 3D canvas.
            this.createMap();
            var canvas = document.getElementById( 'View' );

            var node = osg.createTexturedQuadGeometry( minExtent[ 0 ], minExtent[ 1 ], 0, maxExtent[ 0 ] - minExtent[ 0 ], 0, 0, 0, maxExtent[ 1 ] - minExtent[ 1 ], 0 );
            // Init create function
            var that = this;
            var create = function createPagedLODGroup( parent ) {
                var group = new osg.Node();

                for ( var i = 0; i < 4; i++ ) {
                    var designation = that.subTileLevelRowCol( i, parent.level, parent.x, parent.y );
                    var tileGeometry = that.levelRowColToXYWidthHeight( 0, designation.sLevel, designation.sRow, designation.sCol );
                    // console.log('L =', designation.sLevel,' Row =', designation.sRow ,' Col =', designation.sCol);
                    // console.log ('tileGeometry =', tileGeometry.x , tileGeometry.y, tileGeometry.width, tileGeometry.height);
                    var node = that.createTileForGeometry( i, tileGeometry.x, tileGeometry.y, tileGeometry.width, tileGeometry.height );
                    var plod = new osg.PagedLOD();
                    plod.setRangeMode( osg.PagedLOD.PIXEL_SIZE_ON_SCREEN );
                    plod.addChild( node, 0, 100000 );
                    plod.setFunction( 1, create );
                    plod.setRange( 1, 100000, Number.MAX_VALUE );
                    plod.level = designation.sLevel;
                    plod.x = designation.sRow;
                    plod.y = designation.sCol;
                    group.addChild( plod );
                }
                //console.log('l=',parent.level,' x=',parent.x,' y =',parent.y);
                return group;
            };

            // Set up the PagedLOD root level
            var plod = new osg.PagedLOD();
            plod.addChild( node, 0, 100000 );
            plod.setRangeMode( osg.PagedLOD.PIXEL_SIZE_ON_SCREEN );
            plod.level = 0;
            plod.x = 0;
            plod.y = 0;
            plod.setFunction( 1, create );
            plod.setRange( 1, 100000, Number.MAX_VALUE );

            // The viewer
            this.viewer = new osgViewer.Viewer( canvas, {
                'enableFrustumCulling': true
            } );
            this.viewer.init();
            var that = this;
            // canvas.addEventListener( 'mousedown', function ( ev ) {
            //     that.viewer.getDatabasePager().setAcceptNewDatabaseRequests( false );
            // } );
            // canvas.addEventListener( 'mouseup', function ( ev ) {
            //     that.viewer.getDatabasePager().setAcceptNewDatabaseRequests( true );
            // } );
            // var wheeling;
            // $( '#View' ).on( 'mousewheel', function ( e ) {
            //     if ( !wheeling ) {
            //         that.viewer.getDatabasePager().setAcceptNewDatabaseRequests( false );
            //     }
            //     clearTimeout( $.data( this, 'timer' ) );
            //     $.data( this, 'timer', setTimeout( function () {
            //         that.viewer.getDatabasePager().setAcceptNewDatabaseRequests( true );
            //     }, 350 ) );
            // } );

            //this.viewer.getDatabasePager().setTargetMaximumNumberOfPageLOD(1);
            // this.viewer.getDatabasePager().setProgressCallback( function ( a, b ) {
            //     window.progress( a + b );
            // } );
            this.viewer.setSceneData( plod );
            var bs = plod.getBound();
            this.viewer.setupManipulator();
            this.viewer.getManipulator().setDistance( bs.radius() * 2.5 );
            this.initGui();
            // Cheat dat gui to show at least two decimals and start at 1.0
            this._config.lodScale = 1.0;
            for ( var i in this.gui.__controllers )
                this.gui.__controllers[ i ].updateDisplay();
            this.viewer.run();
        }
    };

    window.addEventListener( 'load', function () {
        var example = new Example();
        example.run();
    }, true );
} )();
