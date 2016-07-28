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

    var NUM_TEXTURES = 4;

    var Example = function () {
        // main variables

        this._viewer = undefined;
        this._canvas = undefined;
        this._textureList = [];
        this._root = new osg.Node();
        this._root.setName( 'root' );


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
            // add all nodes under this._root
            this._root.addChild( this.createScene() );

            // basic setup
            this._viewer.setSceneData( this._root );
            this._viewer.getManipulator().computeHomePosition();


            // TODO: only run after textures and shaders loaded ?
            this._viewer.run();
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
            stateSet.setAttributeAndModes( this.generateSecondPassProgram() );
            return quad;
        },

        createRTTScene: function ( width, height ) {
            var defer = P.defer();
            var that = this;
            osgDB.readNodeURL( '../media/models/material-test/file.osgjs' ).then( function ( node ) {
                //root.addChild( node );
                var stateSet = node.getOrCreateStateSet();
                stateSet.setAttributeAndModes( that.generateFirstPassProgram() );
                that._viewer.getManipulator().computeHomePosition();
                defer.resolve( node );
            } );
            return defer.promise;
        },

        generateFirstPassProgram: function () {
            var vertexShader = [
                '',
                '#version 100',
                '#ifdef GL_FRAGMENT_PRECISION_HIGH',
                'precision highp float;',
                '#else',
                'precision mediump float;',
                '#endif',
                'attribute vec3 Vertex;',
                'attribute vec2 TexCoord0;',
                'varying vec2 FragTexCoord0;',
                'uniform mat4 ModelViewMatrix;',
                'uniform mat4 ProjectionMatrix;',
                'void main(void) {',
                '  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(Vertex,1.0);',
                '  FragTexCoord0 = TexCoord0;',
                '}',
                ''
            ].join( '\n' );
            var fragmentShader = [
                '',
                '#ifdef GL_ES',
                'precision highp float;',
                '#endif',
                '#extension GL_EXT_draw_buffers : require',
                'void main (void)',
                '{',
                '  gl_FragData[0] = vec4(1.0,1.0,0.0,1.0);',
                '  gl_FragData[1] = vec4(0.0,1.0,1.0,1.0);',
                '  gl_FragData[2] = vec4(0.0,0.0,1.0,1.0);',
                '  gl_FragData[3] = vec4(1.0,1.0,1.0,1.0);',
                '}',
                ''
            ].join( '\n' );
            var program = new osg.Program( new osg.Shader( 'VERTEX_SHADER', vertexShader ), new osg.Shader( 'FRAGMENT_SHADER', fragmentShader ) );
            return program;
        },
        generateSecondPassProgram: function () {
            var vertexShader = [
                '',
                '#version 100',
                '#ifdef GL_FRAGMENT_PRECISION_HIGH',
                'precision highp float;',
                '#else',
                'precision mediump float;',
                '#endif',
                'attribute vec3 Vertex;',
                'attribute vec2 TexCoord0;',
                'varying vec2 FragTexCoord0;',
                'uniform mat4 ModelViewMatrix;',
                'uniform mat4 ProjectionMatrix;',
                'void main(void) {',
                '  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(Vertex,1.0);',
                '  FragTexCoord0 = TexCoord0;',
                '}',
                ''
            ].join( '\n' );
            var fragmentShader = [
                '',
                '#ifdef GL_ES',
                'precision highp float;',
                '#endif',
                '#extension GL_EXT_draw_buffers : require',
                'varying vec2 FragTexCoord0;',
                'uniform sampler2D Texture0;',
                'uniform sampler2D Texture1;',
                'uniform sampler2D Texture2;',
                'uniform sampler2D Texture3;',
                'uniform sampler2D Texture4;',
                'void main (void)',
                '{',
                '  vec2 uv = FragTexCoord0;',
                '  gl_FragData[0] = vec4(texture2D( Texture4, uv ) );',
                '}',
                ''
            ].join( '\n' );
            var program = new osg.Program( new osg.Shader( 'VERTEX_SHADER', vertexShader ), new osg.Shader( 'FRAGMENT_SHADER', fragmentShader ) );
            return program;
        },
        createScene: function () {
            var mrtGroup = new osg.Node();
            var width = this._canvas.width;
            var height = this._canvas.height;

            var camera = this.createPreRenderCamera( width, height );
            this.createRTTScene().then( function ( scene ) {
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
            camera.attachTexture( ext.COLOR_ATTACHMENT3_WEBGL, this._textureList[ 3 ], 0 );
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
