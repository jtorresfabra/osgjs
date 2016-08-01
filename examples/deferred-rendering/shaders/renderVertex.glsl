

attribute vec3 Vertex;
attribute vec3 Normal;
attribute vec2 TexCoord0;
attribute vec4 Tangent;
varying vec2 FragTexCoord0;
varying vec2 FragTexCoord1;
varying vec3 posWorldSpace;
varying vec3 normalWorldSpace;
varying vec3 tangentWorldSpace;
varying vec3 bitangentWorldSpace;
uniform mat4 ModelViewMatrix;
uniform mat4 ProjectionMatrix;
uniform mat4 ViewMatrixInverse;
void main(void) {
  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(Vertex,1.0);
  FragTexCoord0 = TexCoord0;
  mat4 modelMatrix = ViewMatrixInverse * ModelViewMatrix;
  mat3 modelMatrix3x3 = mat3(modelMatrix);
  posWorldSpace = ( modelMatrix * vec4(Vertex,1.0) ).xyz;
  normalWorldSpace = modelMatrix3x3 * Normal;
  tangentWorldSpace   = modelMatrix3x3 * Tangent.xyz;
  bitangentWorldSpace   = cross(normalWorldSpace, tangentWorldSpace);
}