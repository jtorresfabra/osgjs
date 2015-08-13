define( [
    'osg/Utils',
    'osgShader/Compiler'
], function ( MACROUTILS, Compiler ) {

    var OverlayNodeShaderCompiler = function () {
        Compiler.apply( this, arguments );
    };

    OverlayNodeShaderCompiler.prototype = MACROUTILS.objectInherit( Compiler.prototype, {
        declareVertexTextureCoords: function ( /*glPosition*/) {
            var texCoordMap = {};
            for ( var tt = 0; tt < this._textures.length; tt++ ) {
                var texCoordUnit = this.getTexCoordUnit( tt );
                if ( texCoordUnit === undefined || texCoordMap[ texCoordUnit ] !== undefined )
                    continue;

                var generateTexCoord = [ '',
                    '%FragTexCoord.x = %vec[0]*%planeS[0] + %vec[1]*%planeS[1] + %vec[2]*%planeS[2] + %planeS[3];',
                    '%FragTexCoord.y = %vec[0]*planeT[0] + %vec[1]*%planeT[1] + %vec[2]*%planeT[2] + %planeT[3];',
                ];

                this.getNode( 'InlineCode' ).code( generateTexCoord.join( '\n' ) ).inputs( {
                    planeS: this.getOrCreateUniform( 'vec4', 'planeS' ),
                    planeT: this.getOrCreateUniform( 'vec4', 'planeT' ),
                    vec: this.getOrCreateAttribute( 'vec3', 'Vertex' )
                } ).outputs( {
                    FragTexCoord: this.getOrCreateVarying( 'vec2', 'FragTexCoord' + texCoordUnit )
                } );

                texCoordMap[ texCoordUnit ] = true;
            }
        }
    } );

    return OverlayNodeShaderCompiler;
} );
