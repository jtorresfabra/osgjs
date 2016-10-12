( function () {
    'use strict';

    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgUtil = OSG.osgUtil;
    var osgViewer = OSG.osgViewer;
    var osgDB = OSG.osgDB;

    var viewer;

    var createScene = function ( viewer ) {
        var root = new osg.Node();

        var node = createCubes( 1000000 );
        node.getOrCreateStateSet().setAttributeAndModes( createProgram() );
        root.addChild( node );
        viewer.getManipulator().computeHomePosition();

        return root;
    };

    var createProgram = function () {
        var vertexShader = [
            '',
            '#version 100',
            '#ifdef GL_FRAGMENT_PRECISION_HIGH',
            'precision highp float;',
            '#else',
            'precision mediump float;',
            '#endif',
            'attribute vec3 Vertex;',
            'attribute vec3 Offset;',
            'attribute vec2 TexCoord0;',
            'varying vec2 FragTexCoord0;',
            'uniform mat4 uModelViewMatrix;',
            'uniform mat4 uProjectionMatrix;',
            'void main(void) {',
            '  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4( Vertex + Offset, 1.0 );',
            '  FragTexCoord0 = TexCoord0;',
            '}',
            ''
        ].join( '\n' );
        var fragmentShader = [
            '',
            '#ifdef GL_ES',
            'precision highp float;',
            '#endif',
            'varying vec2 FragTexCoord0;',
            'uniform sampler2D Texture0;',
            'void main (void)',
            '{',
            '  gl_FragColor = texture2D( Texture0, FragTexCoord0.xy );',
            '}',
            ''
        ].join( '\n' );
        var program = new osg.Program( new osg.Shader( 'VERTEX_SHADER', vertexShader ), new osg.Shader( 'FRAGMENT_SHADER', fragmentShader ) );
        return program;
    };

    var createOffsets = function ( value ) {
        var offsets = [];
        for ( var i = 0, l = value; i < l; i++ ) {
            offsets[ 3 * i ] = Math.random() * 2000;
            offsets[ 3 * i + 1 ] = Math.random() * 2000;
            offsets[ 3 * i + 2 ] = 0;
        }
        return offsets;
    };

    var createIndices = function () {
        var indexes = new Uint16Array( 36 );
        indexes[ 0 ] = 0;
        indexes[ 1 ] = 1;
        indexes[ 2 ] = 2;
        indexes[ 3 ] = 0;
        indexes[ 4 ] = 2;
        indexes[ 5 ] = 3;

        indexes[ 6 ] = 4;
        indexes[ 7 ] = 5;
        indexes[ 8 ] = 6;
        indexes[ 9 ] = 4;
        indexes[ 10 ] = 6;
        indexes[ 11 ] = 7;

        indexes[ 12 ] = 8;
        indexes[ 13 ] = 9;
        indexes[ 14 ] = 10;
        indexes[ 15 ] = 8;
        indexes[ 16 ] = 10;
        indexes[ 17 ] = 11;

        indexes[ 18 ] = 12;
        indexes[ 19 ] = 13;
        indexes[ 20 ] = 14;
        indexes[ 21 ] = 12;
        indexes[ 22 ] = 14;
        indexes[ 23 ] = 15;

        indexes[ 24 ] = 16;
        indexes[ 25 ] = 17;
        indexes[ 26 ] = 18;
        indexes[ 27 ] = 16;
        indexes[ 28 ] = 18;
        indexes[ 29 ] = 19;

        indexes[ 30 ] = 20;
        indexes[ 31 ] = 21;
        indexes[ 32 ] = 22;
        indexes[ 33 ] = 20;
        indexes[ 34 ] = 22;
        indexes[ 35 ] = 23;
        return indexes;
    }


    var createCubes = function ( number ) {

        var g = osg.createTexturedBoxGeometry( 0, 0, 0, 1, 1, 1 );
        var texture = new osg.Texture();
        texture.setMinFilter( 'LINEAR' );
        texture.setMagFilter( 'LINEAR' );
        osgDB.readImageURL( '../media/textures/seamless/wood1.jpg' ).then( function( image ) {
            texture.setImage( image );
        });

        g.getOrCreateStateSet().setTextureAttributeAndModes( 0, texture );
        g.getOrCreateStateSet().addUniform( osg.Uniform.createInt1( 0, 'Texture0' ) );

        var vertex = g.getAttributes().Vertex;
        vertex.setAttributeDivisor( 0 );
        //g.getAttributes().Normal = new osg.BufferArray( 'ARRAY_BUFFER', fullNormalsList, 3 );
        //g.getAttributes().TexCoord0 = new osg.BufferArray( 'ARRAY_BUFFER', fullUVList, 2 );
        var offsetBuffer = new osg.BufferArray( 'ARRAY_BUFFER', createOffsets( number ), 3 );
        offsetBuffer.setAttributeDivisor( 1 );
        g.getAttributes().Offset = offsetBuffer;
        var indices = createIndices();
        var bb = new osg.BoundingBox();
        bb.expandByvec3( osg.vec3.fromValues( -2000, -2000, -2000 ));
        bb.expandByvec3( osg.vec3.fromValues( 2000, 2000, 2000 ));
        g.setBound( bb );
        g.getPrimitives()[ 0 ] = new osg.DrawElementsInstanced( osg.PrimitiveSet.TRIANGLES, new osg.BufferArray( 'ELEMENT_ARRAY_BUFFER', indices, 1 ), number );
        return g;
    };




    var onLoad = function () {

        var canvas = document.getElementById( 'View' );

        viewer = new osgViewer.Viewer( canvas );
        viewer.init();
        viewer.setupManipulator();
        viewer.setSceneData( createScene( viewer ) );
        viewer.getCamera().setComputeNearFar( false );
        viewer.run();
    };

    window.addEventListener( 'load', onLoad, true );
} )();
