( function () {
    'use strict';

    // globals
    var P = window.P;
    var $ = window.$;

    // various osg shortcuts
    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgViewer = OSG.osgViewer;
    var osgShader = OSG.osgShader;
    var osgUtil = OSG.osgUtil;
    var osgDB = OSG.osgDB;
    var osgGA = OSG.osgGA;

    var NUM_TEXTURES = 3;
    var shaderNames = [
        'lightVertex.glsl',
        'lightFragment.glsl',
        'renderVertex.glsl',
        'renderFragment.glsl'
    ];

    var Example = function () {
        // main variables

        this._viewer = undefined;
        this._canvas = undefined;
        this._textureList = [];
        this._root = new osg.Node();
        this._root.setName( 'root' );
        this._shaderProcessor = undefined;
        this.setShaderPath( 'shaders/' );

        this._finalPassNode = new osg.Node();
        this._debugNodeRTT = new osg.Node();
        this._debugNodeRTT.setName( 'debugNodeRTT' );
        this._debugNodeRTT.getOrCreateStateSet().setRenderBinDetails( 1000, 'RenderBin' );
        this._root.addChild( this._debugNodeRTT );



    };


    Example.prototype = osg.objectInherit( ExampleOSGJS.prototype, {

        run: function () {

            this._canvas = document.getElementById( 'View' );

            this._viewer = new osgViewer.Viewer( this._canvas );
            this._viewer.init();
            this._viewer.getCamera().setClearColor( [ 0.0, 0.0, 0.0, 0.0 ] );
            this._viewer.setupManipulator();


            this._extDrawBuffers = this._viewer.getGraphicContext().getExtension( 'WEBGL_draw_buffers' );
            if ( !this._extDrawBuffers ) {
                osg.error( 'EXT_DrawBuffers not supported in your device' );
            }


            this.createPrograms().then( function(){
                // add all nodes under this._root
                this._root.addChild( this.createScene() );
                // basic setup
                this._viewer.setSceneData( this._root );
                this._viewer.getManipulator().computeHomePosition();
                // TODO: only run after textures and shaders loaded ?


            }.bind( this ) );
            this._viewer.run();
        },


        createPrograms: function(){
            var defer = P.defer();
            this.readShaders( shaderNames ).then( function ( ) {
                var lightvs = this._shaderProcessor.getShader( 'lightVertex.glsl' );
                var lightfs = this._shaderProcessor.getShader( 'lightFragment.glsl' );
                var rendervs = this._shaderProcessor.getShader( 'renderVertex.glsl' );
                var renderfs = this._shaderProcessor.getShader( 'renderFragment.glsl' );
                this._renderProgram = new osg.Program( new osg.Shader( 'VERTEX_SHADER', rendervs ), new osg.Shader( 'FRAGMENT_SHADER', renderfs ) );
                this._lightProgram = new osg.Program( new osg.Shader( 'VERTEX_SHADER', lightvs ), new osg.Shader( 'FRAGMENT_SHADER', lightfs ) );
                defer.resolve();
            }.bind( this ) );
            return defer.promise;
        },

        createColorTexture: function ( width, height ) {
            var texture = new osg.Texture();
            texture.setTextureSize( width, height );
            texture.setMinFilter( 'LINEAR' );
            texture.setMagFilter( 'LINEAR' );
            return texture;
        },

        createDephTexture: function ( width, height ) {
            var depthTexture = new osg.Texture();
            depthTexture.setTextureSize( width, height );
            depthTexture.setMinFilter( 'LINEAR' );
            depthTexture.setMagFilter( 'LINEAR' );
            depthTexture.setInternalFormat( osg.Texture.DEPTH_COMPONENT );
            depthTexture.setInternalFormatType( osg.Texture.UNSIGNED_SHORT );
            return depthTexture;
        },

        createPreRenderCamera: function ( width, height ) {
            var camera = new osg.Camera();
            camera.setEnableFrustumCulling( true );
            camera.setName( 'scene' );
            camera.setProjectionMatrix( osg.Matrix.create() );
            camera.setViewMatrix( osg.Matrix.create() );
            camera.setRenderOrder( osg.Camera.PRE_RENDER, 0 );
            camera.setReferenceFrame( osg.Transform.RELATIVE_RF );
            camera.setViewport( new osg.Viewport( 0, 0, width, height ) );
            camera.setClearColor( osg.Vec4.createAndSet( 0, 0, 0, 0 ) );
            return camera;
        },

        createHUDCamera: function ( width, height ) {
            var camera = new osg.Camera();
            camera.setEnableFrustumCulling( true );
            camera.setName( 'finalPass' );
            osg.Matrix.makeOrtho( 0, width, 0, height, -5, 5, camera.getProjectionMatrix() );
            camera.setViewMatrix( osg.Matrix.create() );
            camera.setRenderOrder( osg.Camera.NESTED_RENDER, 0 );
            camera.setReferenceFrame( osg.Transform.ABSOLUTE_RF );
            camera.setViewport( new osg.Viewport( 0, 0, width, height ) );
            camera.setClearColor( osg.Vec4.createAndSet( 0, 0, 0, 0 ) );
            camera.setClearMask( osg.Camera.DEPTH_BUFFER_BIT );
            return camera;
        },

        createRTTQuad: function ( width, height ) {
            var quad = osg.createTexturedQuadGeometry( 0, 0, 0, width, 0, 0, 0, height, 0 );
            var stateSet = quad.getOrCreateStateSet();
            stateSet.setAttributeAndModes( this._lightProgram );
            return quad;
        },

        createRTTScene: function ( width, height ) {
            var defer = P.defer();
            var that = this;
            
            osgDB.readNodeURL( '../media/models/material-test/file.osgjs' ).then( function ( node ) {
                // Create tangent space
               // var node = osg.createTexturedSphereGeometry( 1, 40, 40 );
                var stateSet = node.getOrCreateStateSet();
                //root.addChild( node );

                osgDB.readImageURL( '../media/textures/seamless/ropeNormal.png' ).then( function ( image ) {
                    //var bumpMap = that.createColorTexture();
                    //bumpMap.setImage( image );
                    //stateSet.setTextureAttributeAndModes( 0, bumpMap );
                    //stateSet.addUniform( osg.Uniform.createInt1( 0, 'bumpMap' ) );
                } );
                osgDB.readImageURL( '../media/textures/seamless/metal1.jpg' ).then( function ( image ) {
                    var diffMap = that.createColorTexture();
                    diffMap.setImage( image );
                    stateSet.setTextureAttributeAndModes( 1, diffMap );
                    stateSet.addUniform( osg.Uniform.createInt1( 1, 'diffMap' ) );
                } );
                that._viewer.getManipulator().computeHomePosition();
                defer.resolve( node );
            } );
            return defer.promise;
        },

        createItems: function ( value ) {
            var scene = new osg.Node();
            var stateSet = scene.getOrCreateStateSet();
            stateSet.setAttributeAndModes( this._renderProgram );
            var defer = P.defer();
            this.createRTTScene().then( function ( model ) {
                for ( var i = 0, l = value; i < l; i++ ) {
                    for ( var j = 0, m = value; j < m; j++ ) {
                        var x = Math.random() * 100;
                        var y = Math.random() * 100;
                        var z = 0.0;
                        var mt = new osg.MatrixTransform();
                        mt.setMatrix( osg.Matrix.makeTranslate( x, y, z, osg.Matrix.create() ) ) 
                        mt.addChild( model );
                        scene.addChild( mt );
                       
                    }
                }
                defer.resolve( scene );
                var tangentSpaceGenerator = new osgUtil.TangentSpaceGenerator();
                scene.accept( tangentSpaceGenerator );
            } );
            return defer.promise;
        },

        createScene: function () {
            var mrtGroup = new osg.Node();
            var width = this._canvas.width;
            var height = this._canvas.height;

            var camera = this.createPreRenderCamera( width, height );
            var that = this;
            this.createItems( 4 ).then( function ( scene ) {
                var ss = scene.getOrCreateStateSet();
                that._viewMatrixInverse = osg.Matrix.create();
                osg.Matrix.inverse( camera.getViewMatrix(), that._viewMatrixInverse );
                ss.addUniform( osg.Uniform.createMatrix4( that._viewMatrixInverse, 'ViewMatrixInverse' ) );
                camera.addChild( scene );
            } );

            var ext = this._extDrawBuffers;
            // createColorTextures
            for ( var i = 0; i < NUM_TEXTURES; i++ ) {
                this._textureList[ i ] = this.createColorTexture( width, height );
                this._textureList[ i ]._name = 'texturecolor' + i;
            }
            var depthTexture = this.createDephTexture( width, height );
            this._textureList.push( depthTexture );
            // attach textures
            camera.attachTexture( ext.COLOR_ATTACHMENT0_WEBGL, this._textureList[ 0 ], 0 );
            camera.attachTexture( ext.COLOR_ATTACHMENT1_WEBGL, this._textureList[ 1 ], 0 );
            camera.attachTexture( ext.COLOR_ATTACHMENT2_WEBGL, this._textureList[ 2 ], 0 );
            //camera.attachTexture( ext.COLOR_ATTACHMENT3_WEBGL, this._textureList[ 3 ], 0 );
            camera.attachTexture( osg.FrameBufferObject.DEPTH_ATTACHMENT, depthTexture, 0 );

            mrtGroup.addChild( camera );

            this.createDebugTextureList( this._textureList, {
                horizontal: true,
                y: 100,
                w: this._canvas.width * 0.2,
                h: this._canvas.height * 0.2,
            } );

            var finalPass = new osg.Node();
            var hudCamera = this.createHUDCamera( width, height );
            var finalQuad = this.createRTTQuad( width, height );

            hudCamera.addChild( finalQuad );

            var stateSet = finalQuad.getOrCreateStateSet();
            for ( i = 0; i < this._textureList.length; i++ ) {
                stateSet.setTextureAttributeAndModes( i, this._textureList[ i ] );
                stateSet.addUniform( osg.Uniform.createInt1( i, 'Texture' + i ) );
            }
            
            var lightPos = osg.Vec3.createAndSet( 0.0, 5.0, 0.0 );
            stateSet.addUniform( osg.Uniform.createFloat3( lightPos, 'lightPos' ) );
            //finalQuad.addUpdateCallback( new LightUpdateCallback );
            stateSet.addUniform( osg.Uniform.createMatrix4( this._viewMatrixInverse, 'ViewMatrixInverse' ) );
            finalPass.addChild( hudCamera );
            mrtGroup.addChild( finalPass );
            return mrtGroup;
        }
    } );


    window.addEventListener( 'load', function () {
        var example = new Example();
        example.run();
    }, true );

} )();
