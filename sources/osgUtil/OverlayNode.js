define( [
    'osg/Utils',
    'osg/Node',
    'osg/Texture',
    'osg/Camera',
    'osg/FrameBufferObject',
    'osg/Transform',
    'osg/Notify',
    'osg/BoundingSphere',
    'osg/BoundingBox',
    'osg/NodeVisitor',
    'osg/ComputeBoundsVisitor',
    'osg/Vec3',
    'osg/StateSet',
    'osg/Matrix',
    'osg/Polytope',
    'osg/Viewport',
    'osgUtil/LineSegmentIntersector',
    'osgUtil/IntersectionVisitor',
    'osg/Uniform',
    'osg/ComputeMatrixFromNodePath'
], function ( MACROUTILS, Node, Texture, Camera, FrameBufferObject, Transform, Notify, BoundingSphere, BoundingBox, NodeVisitor, ComputeBoundsVisitor, Vec3, StateSet, Matrix, Polytope, Viewport, LineSegmentIntersector, IntersectionVisitor, Uniform, ComputeMatrixFromNodePath ) {

    'use strict';

    /**
     *  @class OverlayNode
     */
    var OverlayNode = function () {
        Node.call( this );
        this._overlayTechnique = OverlayNode.VIEW_OBJECT_DEPENDENT_WITH_ORTHOGRAPHIC_OVERLAY;
        this._overlaySubgraph = undefined;
        this._mainStateSet = undefined;
        this._overlayDataMap = new Map();
        this._textureSizeHint = 1024;
        this._renderTargetImplemetation = undefined;
        this._overlayClearColor = [ 0.0, 0.0, 0.0, 1.0 ];
        this._continuousUpdate = false;
        this._updateCamera = true;
        this._minAngle = -0.35;
        this._maxZoom = 1.0;
        this._textureUnit = 0;
        this._dynamicOverlayResolution = false;
        this.init();
    };

    OverlayNode.OBJECT_DEPENDENT_WITH_ORTHOGRAPHIC_OVERLAY = 0;
    OverlayNode.VIEW_OBJECT_DEPENDENT_WITH_ORTHOGRAPHIC_OVERLAY = 1;
    OverlayNode.VIEW_DEPENDENT_WITH_ORTHOGRAPHIC_OVERLAY = 2;
    OverlayNode.VIEW_DEPENDENT_WITH_PERSPECTIVE_OVERLAY = 3;
    /**
     *  Overlay utility structure to store overlay values
     *  @class OverlayData
     */
    var OverlayData = function () {
        this._validIntersection = false;
        this._texture = undefined;
        this._camera = undefined;
        this._mainSubgraphStateSet = undefined;
        this._lastIntersection = undefined;
        this._lastZoom = undefined;
        this._textureFrustum = undefined;
        this._lastVisibleBox = new BoundingBox();
    };

    /** @lends OverlayNode.prototype */
    OverlayNode.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Node.prototype, {
        init: function () {
            this.getOverlayData( 0 );
        },
        setDynamicOverlayResolution: function ( value ) {
            this._dynamicOverlayResolution = value;
        },
        setContinuousUpdate: function ( value ) {
            this._continuousUpdate = value;
        },
        getContinuousUpdate: function () {
            return this._continuousUpdate;
        },
        setOverlayTextureUnit: function ( unit ) {
            this._textureUnit = unit;
            this.updateMainSubgraphStateSet();
        },
        getOverlayTextureUnit: function () {
            return this._textureUnit;
        },
        setTextureSizeHint: function ( value ) {
            this._textureSizeHint = value;
        },
        setOverlaySubgraph: function ( node ) {
            if ( this._overlaySubgraph === node ) return;
            this._overlaySubgraph = node;
            this._overlayDataMap.forEach( function ( overlayData ) {
                var camera = overlayData._camera;
                if ( camera ) {
                    camera.removeChildren();
                    camera.addChild( node );
                }
            } );
            this.dirtyOverlayTexture();
        },
        dirtyOverlayTexture: function () {
            this._updateCamera = true;
        },

        updateMainSubgraphStateSet: function () {
            var that = this;
            this._overlayDataMap.forEach( function ( overlayData ) {
                if ( overlayData._mainSubgraphStateSet !== undefined ) {
                    overlayData._mainSubgraphStateSet.clear();
                    overlayData._mainSubgraphStateSet.setTextureAttributeAndModes( that._textureUnit, overlayData._texture );
                }
            } );
        },
        getOverlayData: function ( cullVisitor ) {
            if ( this._overlayDataMap.has( cullVisitor ) ) return this._overlayDataMap.get( cullVisitor );
            var overlayData = new OverlayData();
            this._overlayDataMap.set( cullVisitor, overlayData );
            overlayData.__validIntersection = false;
            var texWidth = this._textureSizeHint;
            var texHeight = this._textureSizeHint;
            if ( overlayData._texture === undefined ) {
                // Notify.log ('setting up texture' );
                var texture = new Texture();
                texture.setTextureSize( texWidth, texHeight );
                texture.setInternalFormat( Texture.GL_RGBA );
                texture.setMinFilter( Texture.LINEAR );
                texture.setMagFilter( Texture.LINEAR );
                texture.setWrapS( Texture.CLAMP_TO_EDGE );
                texture.setWrapT( Texture.CLAMP_TO_EDGE );
                texture.setMaxAnisotropy( 8.0 );
                overlayData._texture = texture;
            }
            // set up the rtt camera.
            if ( overlayData._camera === undefined ) {
                var camera = new Camera();
                camera.setViewport( new Viewport( 0, 0, texWidth, texHeight ) );
                camera.setReferenceFrame( Transform.ABSOLUTE_RF );
                camera.setClearColor( this._overlayClearColor );
                camera.setRenderOrder( Camera.PRE_RENDER, 0 );
                camera.attachTexture( FrameBufferObject.COLOR_ATTACHMENT0, overlayData._texture );
                //camera.attachRenderBuffer( FrameBufferObject.DEPTH_ATTACHMENT, FrameBufferObject.DEPTH_COMPONENT16 );
                if ( this._overlaySubgraph !== undefined ) 
                    camera.addChild( this._overlaySubgraph );
                overlayData._camera = camera;
            }
            if ( overlayData._mainSubgraphStateSet === undefined ) {
                overlayData._mainSubgraphStateSet = new StateSet();
            }

            return overlayData;
        },

        traverse: function ( nv ) {
            switch ( this._overlayTechnique ) {
            case ( OverlayNode.VIEW_OBJECT_DEPENDENT_WITH_ORTHOGRAPHIC_OVERLAY ):
                this.traverseViewObjectDependentWithOrtographicOverlay( nv );
                break;
            case ( OverlayNode.OBJECT_DEPENDENT_WITH_ORTHOGRAPHIC_OVERLAY ):
                this.traverseObjectDependentWithOrtographicOverlay( nv );
                break;
            case ( OverlayNode.VIEW_DEPENDENT_WITH_ORTHOGRAPHIC_OVERLAY ):
            case ( OverlayNode.VIEW_DEPENDENT_WITH_PERSPECTIVE_OVERLAY ):
                Notify.log( 'not implemented' );
                break;
            default:
                break;
            }
        },

        traverseObjectDependentWithOrtographicOverlay: ( function () {

            var upDirection = [ 0.0, 1.0, 0.0 ];
            var viewDirection = [ 0.0, 0.0, 1.0 ];

            return function ( nv ) {
                var overlayData = this.getOverlayData( 0 );
                var camera = overlayData._camera;
                if ( nv.getVisitorType() !== NodeVisitor.CULL_VISITOR ) {
                    Node.prototype.traverse.call( this, nv );
                    return;
                }
                var imgVisibleBox = new BoundingBox();
                if ( this._continuousUpdate || this._updateCamera ) {
                    var bs = new BoundingSphere();
                    for ( var i = 0; i < camera.getNumChildren(); ++i ) {
                        bs.expandByBoundingSphere( camera.getChild( i ).getBound() );
                    }
                    var bsChildren = new BoundingSphere();
                    for ( i = 0; i < this.getNumChildren(); ++i ) {
                        bsChildren.expandByBoundingSphere( this.getChild( i ).getBound() );
                    }

                    if ( bs.valid() || bsChildren.valid() ) {
                        if ( !bs.valid() || ( bs.radius() > bsChildren.radius() ) )
                            bs = bsChildren;

                        if ( overlayData._lastVisibleBox.valid() && this._dynamicOverlayResolution ) {
                            imgVisibleBox = overlayData._lastVisibleBox;
                        } else {
                            imgVisibleBox.setMin( Vec3.sub( bs.center(), Vec3.mult( Vec3.set( 1, 1, 1, Vec3.create() ), bs.radius(), Vec3.create() ), Vec3.create() ) );
                            imgVisibleBox.setMax( Vec3.add( bs.center(), Vec3.mult( Vec3.set( 1, 1, 1, Vec3.create() ), bs.radius(), Vec3.create() ), Vec3.create() ) );
                        }

                        var radius = imgVisibleBox.radius();
                        var center = imgVisibleBox.center( Vec3.create() );
                        center[ 2 ] = 0.0; // image plane is at z=0, we need this to avoid near/far clipping

                        var viewDistance = 2.0 * radius;
                        var eyePoint = Vec3.add( center, Vec3.mult( viewDirection, viewDistance, Vec3.create() ), Vec3.create() );
                        var znear = viewDistance - radius;
                        var zfar = viewDistance + radius;

                        var top = imgVisibleBox.yMax() - center[ 1 ];
                        var right = imgVisibleBox.xMax() - center[ 0 ];

                        camera.setProjectionMatrixAsOrtho( -right, right, -top, top, znear, zfar );
                        camera.setViewMatrixAsLookAt( eyePoint, center, upDirection );

                        // planes for texture coordinate calculation in shader
                        var Ax = 1 / ( 2 * right );
                        var Ay = 1 / ( 2 * top );
                        var Dx = -Ax * ( center[ 0 ] - right );
                        var Dy = -Ay * ( center[ 1 ] - top );
                        // Create uniforms
                        var planeS = Uniform.createFloat4( [ Ax, 0.0, 0.0, Dx ], 'planeS' );
                        var planeT = Uniform.createFloat4( [ 0.0, Ay, 0.0, Dy ], 'planeT' );
                        overlayData._mainSubgraphStateSet.addUniform( planeS );
                        overlayData._mainSubgraphStateSet.addUniform( planeT );
                        overlayData._mainSubgraphStateSet.setShaderGeneratorName( 'overlaynode' );
                    }
                    this._updateCamera = false;
                }
                // if we need to redraw then do cull traversal on camera.
                if ( this._continuousUpdate ) {
                    overlayData._camera.accept( nv );
                }
                //this.addChild( this._overlaySubgraph );
                // now set up the drawing of the main scene.
                nv.pushStateSet( overlayData._mainSubgraphStateSet );
                Node.prototype.traverse.call( this, nv );
                nv.popStateSet();
                if ( this._dynamicOverlayResolution ) {
                    // Calculate bbox of visible objects
                    var visibleBox = new BoundingBox();
                    this.calculateVisibleBBox( visibleBox, nv.getCurrentRenderBin() );
                    overlayData._lastVisibleBox = visibleBox;
                }
            };
        } )(),
        traverseViewObjectDependentWithOrtographicOverlay: ( function () {
            // var eye = Vec3.create();
            // var l = Vec3.create();
            // var up = Vec3.create();
            var upDirection = [ 0.0, 1.0, 0.0 ];
            return function ( nv ) {
                var overlayData = this.getOverlayData( 0 );
                var camera = overlayData._camera;
                if ( nv.getVisitorType() !== NodeVisitor.CULL_VISITOR ) {
                    Node.prototype.traverse.call( this, nv );
                    return;
                }
                if ( this._continuousUpdate || this._updateCamera ) {
                    var bs = new BoundingSphere();
                    for ( var i = 0; i < camera.getNumChildren(); ++i ) {
                        bs.expandByBoundingSphere( camera.getChild( i ).getBound() );
                    }
                    var cbVisitor = new ComputeBoundsVisitor();
                    for ( i = 0; i < this.getNumChildren(); ++i ) {
                        this.getChild( i ).accept( cbVisitor );
                    }
                    var bsChildren = new BoundingSphere();
                    bsChildren.expandByBoundingBox( cbVisitor.getBoundingBox() );
                    if ( bs.valid() || bsChildren.valid() ) {
                        // if ( !bs.valid() || ( bs.radius() > bsChildren.radius() ) )
                        //     bs = bsChildren;
                        // we will always work in UTM so we don't need to check if we are within a coordinate system node.
                        var bbHeight = cbVisitor.getBoundingBox().yMax() - cbVisitor.getBoundingBox().yMin();
                        var bbWidth = cbVisitor.getBoundingBox().xMax() - cbVisitor.getBoundingBox().xMin();

                        var minSide = Math.min( bbHeight, bbWidth );
                        // Need to use osgjs API
                        //var matrix = nv.getCurrentModelViewMatrix();
                        // Matrix.getLookAt( matrix, eye, l, up );
                        // var V = Vec3.sub( l, eye, [] );
                        // Vec3.normalize( V, V );
                        // Compute intersections
                        // var obj = this.computeLineIntersection( eye, V, this, bs );
                        // var distance = obj.distance;
                        // var center = obj.point;
                        // var cellSize = 0.1;
                        // var minZoom = cellSize * this._textureSizeHint / minSide;
                        // var zoom = this._maxZoom;
                        // if ( distance > 0.0 && distance < bs.radius() ) {
                        //     zoom = this._maxZoom * distance / minSide;
                        //     overlayData._lastIntersection = center;
                        //     overlayData._lastZoom = zoom;
                        //     overlayData._validIntersection = true;
                        // } else {
                        //     if ( overlayData._validIntersection ) {
                        //         center = overlayData._lastIntersection;
                        //         zoom = overlayData._lastZoom;
                        //     } else {
                        //         center = bs.center();
                        //         zoom = this._maxZoom;
                        //     }
                        // }
                        // Hack!
                        var center = bs.center();
                        var zoom = this._maxZoom;

                        var lookAt = [ center[ 0 ], center[ 1 ], 0.0 ];
                        if ( center[ 2 ] < 0.0 )
                            center[ 2 ] = -center[ 2 ];
                        if ( center[ 2 ] === 0.0 ) center[ 2 ] = 1.0;
                        //if ( zoom < minZoom ) zoom = minZoom;
                        //if ( zoom > this._maxZoom ) zoom = this._maxZoom;
                        var znear = -bs.radius() * 1000;
                        var zfar = bs.radius() * 1000;
                        var top = minSide * zoom;
                        var bottom = -top;
                        var right = top;
                        var left = -right;
                        // if ( zoom >= this._maxZoom ) {
                        //     if ( left + center[ 0 ] > cbVisitor.getBoundingBox().xMin() ) {
                        //         left = cbVisitor.getBoundingBox().xMin() - center[ 0 ];
                        //     }
                        //     if ( right + center[ 0 ] < cbVisitor.getBoundingBox().xMax() ) {
                        //         right = cbVisitor.getBoundingBox().xMax() - center[ 0 ];
                        //     }
                        //     if ( top + center[ 1 ] < cbVisitor.getBoundingBox().yMax() ) {
                        //         top = cbVisitor.getBoundingBox().yMax() - center[ 1 ];
                        //     }
                        //     if ( bottom + center[ 1 ] > cbVisitor.getBoundingBox().yMin() ) {
                        //         bottom = cbVisitor.getBoundingBox().yMin() - center[ 1 ];
                        //     }
                        // } else {
                        //     if ( left + center[ 0 ] < cbVisitor.getBoundingBox().xMin() ) {
                        //         left = cbVisitor.getBoundingBox().xMin() - center[ 0 ];
                        //     }
                        //     if ( right + center[ 0 ] > cbVisitor.getBoundingBox().xMax() ) {
                        //         right = cbVisitor.getBoundingBox().xMax() - center[ 0 ];
                        //     }
                        //     if ( top + center[ 1 ] > cbVisitor.getBoundingBox().yMax() ) {
                        //         top = cbVisitor.getBoundingBox().yMax() - center[ 1 ];
                        //     }
                        //     if ( bottom + center[ 1 ] < cbVisitor.getBoundingBox().yMin() ) {
                        //         bottom = cbVisitor.getBoundingBox().yMin() - center[ 1 ];
                        //     }
                        // }
                        camera.setProjectionMatrixAsOrtho( left, right, bottom, top, znear, zfar );
                        camera.setViewMatrixAsLookAt( center, lookAt, upDirection );

                        // Create uniforms

                        //var planeT = Uniform.createFloat4( [ 0.0, Ay, 0.0, Dy ], 'planeT' );
                        //overlayData._mainSubgraphStateSet.addUniform( planeS );
                        //overlayData._mainSubgraphStateSet.addUniform( planeT );

                        // TODO: TexGEN Stuff
                        // compute the matrix which takes a vertex from local coords into tex coords
                        //var MVP = Matrix.mult( camera.getViewMatrix(), camera.getProjectionMatrix(), [] );

                        // osg::Matrix MVPT = MVP *
                        // osg::Matrix::translate(1.0,1.0,1.0) *
                        //                     osg::Matrix::scale(0.5,0.5,0.5);
                        // var trans = Matrix.makeTranslate( 1.0, 1.0, 1.0, Matrix.create() );
                        // var scale = Matrix.makeScale( 0.5, 0.5, 0.5, Matrix.create() );
                        // var matMul = Matrix.mult( scale, trans, Matrix.create() );

                        // var MVPT = Matrix.mult( matMul, MVP, Matrix.create() );
                        // var mvptUniform = Uniform.createMatrix4( MVPT, 'MVPT' );
                        // overlayData._mainSubgraphStateSet.addUniform( mvptUniform );
                        // overlayData._mainSubgraphStateSet.setShaderGeneratorName( 'overlaynode' );
                        // planes for texture coordinate calculation in shader
                        var Ax = 1 / ( 2 * right );
                        var Ay = 1 / ( 2 * top );
                        var Dx = -Ax * ( center[ 0 ] - right );
                        var Dy = -Ay * ( center[ 1 ] - top );
                        // Create uniforms
                        var planeS = Uniform.createFloat4( [ Ax, 0.0, 0.0, Dx ], 'planeS' );
                        var planeT = Uniform.createFloat4( [ 0.0, Ay, 0.0, Dy ], 'planeT' );
                        overlayData._mainSubgraphStateSet.addUniform( planeS );
                        overlayData._mainSubgraphStateSet.addUniform( planeT );
                        overlayData._mainSubgraphStateSet.setShaderGeneratorName( 'overlaynode' );

                        // overlayData._texgenNode->getTexGen()->setMode(osg::TexGen::EYE_LINEAR);
                        // overlayData._texgenNode->getTexGen()->setPlanesFromMatrix(MVPT);
                        //
                        // if ( overlayData._textureFrustum === undefined ) overlayData._textureFrustum = new Polytope();
                        // overlayData._textureFrustum.setToUnitFrustum( false, false );
                        // overlayData._textureFrustum.transformProvidingInverse( MVPT );

                    }
                    this._updateCamera = false;
                }
                // now set up the drawing of the main scene.
                // TODO: TexGEN
                // overlayData._texgenNode.accept( nv );
                // overlayData._mainSubgraphStateSet.setTextureMode( this._textureUnit, StateAttribute.GL_TEXTURE_GEN_S, StateAttribute::ON );
                // overlayData._mainSubgraphStateSet.setTextureMode( this._textureUnit, StateAttribute.GL_TEXTURE_GEN_T, StateAttribute::ON );
                // push the stateset
                // We need to generate texCoords first.
                // if we need to redraw then do cull traversal on camera.
                if ( this._continuousUpdate ) {
                    overlayData._camera.accept( nv );
                }
                //this.addChild( this._overlaySubgraph );
                // now set up the drawing of the main scene.
                nv.pushStateSet( overlayData._mainSubgraphStateSet );
                Node.prototype.traverse.call( this, nv );
                nv.popStateSet();
            };
        } )(),


        calculateVisibleBBox: function ( visibleBox, renderBin ) {
            if ( renderBin === undefined ) return;
            var binList = renderBin.getRenderBinList();
            var keys = window.Object.keys( binList );
            for ( var i = 0, l = keys.length; i < l; i++ ) {
                this.calculateVisibleBBox( visibleBox, binList[ keys[ i ] ] );
            }

            var stateGraphList = renderBin.getStateGraphList();

            for ( i = 0, l = stateGraphList.length; i < l; i++ ) {
                var leafs = stateGraphList[ i ].leafs;
                for ( var j = 0, k = leafs.length; j < k; j++ ) {
                    var leaf = leafs[ j ];
                    // ** WARNING we assume there are no transformations in the subgraph (we ignore them)
                    var geometry = leaf._geometry;
                    var bbox = geometry.getBoundingBox();

                    if ( bbox.valid() ) {
                        {
                            visibleBox.expandByBoundingBox( bbox );
                        }
                    }
                }
            }
        },
        computeLineIntersection: function ( eye, lookVector, scene, bs ) {
            var intersector = new LineSegmentIntersector();
            var iv = new IntersectionVisitor();
            var end = Vec3.add( eye, Vec3.mult( lookVector, bs.radius2(), Vec3.create() ), Vec3.create() );
            intersector.set( eye, end );
            iv.setIntersector( intersector );
            scene.accept( iv );
            var hits = intersector.getIntersections();
            var distance;
            var point;
            if ( hits.length !== 0 ) {
                hits.sort( function ( a, b ) {
                    return a.ratio - b.ratio;
                } );
                point = hits[ 0 ].point;
                var matrix = ComputeMatrixFromNodePath.computeLocalToWorld( hits[ 0 ].nodepath );
                point = Matrix.transformVec3( matrix, point, point );
                var d = Vec3.sub( point, eye, Vec3.create() );
                distance = Vec3.length( d );
            } else {
                var D = bs.center()[ 2 ];
                distance = bs.radius();
                if ( lookVector[ 2 ] < this._minAngle ) {
                    distance = ( D - eye[ 2 ] ) / lookVector[ 2 ];
                } else {
                    distance = Math.min( eye[ 2 ], distance );
                }
                point = Vec3.add( eye, Vec3.mult( lookVector, distance, Vec3.create() ), Vec3.create() );
            }
            return {
                distance: distance,
                point: point
            };
        }


    } ), 'osgUtil', 'OverlayNode' );

    return OverlayNode;
} );
