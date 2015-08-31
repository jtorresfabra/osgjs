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
        },
        // declareVertexTextureCoords: function ( /*glPosition*/) {
        //     var texCoordMap = {};
        //     for ( var tt = 0; tt < this._textures.length; tt++ ) {
        //         var texCoordUnit = this.getTexCoordUnit( tt );
        //         if ( texCoordUnit === undefined || texCoordMap[ texCoordUnit ] !== undefined )
        //             continue;

        //         var generateTexCoord = [ '',
        //             '%FragTexCoord = ( %mvpt * vec4( %vec, 1.) ).xy;',
        //         ];

        //         this.getNode( 'InlineCode' ).code( generateTexCoord.join( '\n' ) ).inputs( {
        //             mvpt: this.getOrCreateUniform( 'mat4', 'MVPT' ),
        //             vec: this.getOrCreateAttribute( 'vec3', 'Vertex' )
        //         } ).outputs( {
        //             FragTexCoord: this.getOrCreateVarying( 'vec2', 'FragTexCoord' + texCoordUnit )
        //         } );

        //         texCoordMap[ texCoordUnit ] = true;
        //     }
        // },
        createFragmentShaderGraph: function () {

            // shader graph can have multiple output (glPointsize, varyings)
            // here named roots
            // all outputs must be pushed inside
            var roots = [];

            // depth cast
            if ( this._isShadowCast ) {
                roots.push( this.createShadowCastFragmentShaderGraph() );
                return roots;
            }

            // no material then return a default shader
            if ( !this._material ) {
                roots.push( this.createDefaultFragmentShaderGraph() );
                return roots;
            }

            var materialUniforms = this.getOrCreateStateAttributeUniforms( this._material );


            // diffuse color
            var diffuseColor = this.getDiffuseColorFromTextures();

            if ( diffuseColor === undefined ) {

                diffuseColor = materialUniforms.diffuse;

            }
            // vertex color needs to be computed to diffuse
            //diffuseColor = this.getVertexColor( diffuseColor );


            // compute alpha
            var alpha = this.createVariable( 'float' );

            var textureTexel = this.getFirstValidTexture();

            var alphaCompute;
            if ( textureTexel ) // use alpha of the first valid texture if has texture
                alphaCompute = '%alpha = %color.a * %texelAlpha.a;';
            else
                alphaCompute = '%alpha = %color.a;';

            // Discard fragments totally transparents when rendering billboards 
            if ( this._isBillboard )
                alphaCompute += 'if ( %alpha == 0.0) discard;';

            this.getNode( 'InlineCode' ).code( alphaCompute ).inputs( {
                color: materialUniforms.diffuse,
                texelAlpha: textureTexel
            } ).outputs( {
                alpha: alpha
            } );

            // 2 codes path
            // if we have light we compute a subgraph that will generate
            // color from lights contribution...
            // if we dont have light we will use the diffuse color found as default
            // fallback
            var finalColor;

            if ( this._lights.length > 0 ) {

                // creates lights nodes
                var lightedOutput = this.createLighting( {
                    materialdiffuse: diffuseColor
                } );
                finalColor = lightedOutput;

            } else {
                // no light, no emssion use diffuse color
                finalColor = diffuseColor;
            }

            // premult alpha
            finalColor = this.getPremultAlpha( finalColor, alpha );

            var fragColor = this.getNode( 'glFragColor' );


            // todo add gamma corrected color, but it would also
            // mean to handle correctly srgb texture. So it should be done
            // at the same time. see osg.Tetxure to implement srgb
            this.getNode( 'SetAlpha' ).inputs( {
                color: finalColor,
                alpha: alpha
            } ).outputs( {
                color: fragColor
            } );

            roots.push( fragColor );

            return roots;
        },
        getFragmentShaderName: function () {
            return 'OverlayNodeShaderCompiler';
        },
    } );

    return OverlayNodeShaderCompiler;
} );
