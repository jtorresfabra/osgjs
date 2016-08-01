
#extension GL_EXT_draw_buffers : require
uniform mat4 ViewMatrixInverse;
uniform vec3 lightPos;
varying vec2 FragTexCoord0;
uniform sampler2D Texture0;
uniform sampler2D Texture1;
uniform sampler2D Texture2;
uniform sampler2D Texture3;
void main (void)
{
 vec3 posWorldSpace = texture2D(Texture0, FragTexCoord0.xy).xyz;
 vec3 normalWorldSpace = texture2D(Texture1, FragTexCoord0.xy).xyz;
 vec3 colorWorldSpace = texture2D(Texture2, FragTexCoord0.xy).xyz;
 vec3 lightDirWorldspace = normalize(lightPos - posWorldSpace);
 vec3 depth =  texture2D(Texture3, FragTexCoord0.xy).xyz;
// Lambertian diffuse color.
  float diff = max(0.2, dot(lightDirWorldspace, normalWorldSpace ));
// Convert camera position from Camera (eye) space (is always at 0, 0, 0,
// in there) to World space. Dont forget to use mat4 and vec4!
  vec4 cameraPosWorldSpace = ViewMatrixInverse * vec4(0, 0, 0, 1);
// Direction from point to camer
  vec3 viewDirWorldSpace = normalize(vec3(cameraPosWorldSpace) - posWorldSpace);
// Blinn-Phong specular highlights.
  vec3 highlightsWorldSpace = normalize(lightDirWorldspace + viewDirWorldSpace);
  float spec = pow(max(0.0, dot(highlightsWorldSpace, normalWorldSpace)), 40.0);
// Final fragment color.
  vec3 color = diff * colorWorldSpace; // *shadowWorldSpa
  float a = 1.0; if ( dot(color,color) == 0.0 ) a = 0.0;
//vec3 s_worldspace = texture2DRect(shadowMap, gl_FragCoord.xy).xyz;
//  if (s_worldspace.x == 1.0)
    color += spec;
    gl_FragData[0] = vec4( color, a);
}
