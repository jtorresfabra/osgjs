//begin shadows

#pragma include "colorEncode.glsl"

// see shadowSettings.js header for shadow algo param explanations

// end Float codec
float getSingleFloatFromTex(sampler2D depths, vec2 uv){
#ifndef _FLOATTEX
    return  decodeFloatRGBA(texture2D(depths, uv));
#else
    return texture2D(depths, uv).x;
#endif
}

vec2 getDoubleFloatFromTex(sampler2D depths, vec2 uv){
#ifndef _FLOATTEX
    return decodeHalfFloatRGBA(texture2D(depths, uv));
#else
    return texture2D(depths, uv).xy;
#endif
}

vec4 getQuadFloatFromTex(sampler2D depths, vec2 uv){
    return texture2D(depths, uv).xyzw;
}
// end Float codec


#pragma include "vsm.glsl" "_VSM"

#pragma include "evsm.glsl" "_EVSM"

#pragma include "esm.glsl" "_ESM"

#pragma include "pcf.glsl" "_NONE" "_PCF"
