
#extension GL_EXT_draw_buffers : require
varying vec2 FragTexCoord0;
varying vec2 FragTexCoord1;
varying vec3 posWorldSpace;
varying vec3 normalWorldSpace;
varying vec3 tangentWorldSpace;
varying vec3 bitangentWorldSpace;
uniform sampler2D diffMap;
uniform sampler2D bumpMap;
void main (void)
{
  gl_FragData[0] = vec4(posWorldSpace, gl_FragCoord.z);
  vec3 nn = vec3(1.0);
  nn = 2.0 * texture2D(bumpMap, FragTexCoord0.xy).xyz - vec3(1.0);
  gl_FragData[1] = vec4( nn.x * tangentWorldSpace + nn.y * bitangentWorldSpace + nn.z * normalWorldSpace, 1.0);
  gl_FragData[2] = texture2D( diffMap, FragTexCoord0.xy );
}