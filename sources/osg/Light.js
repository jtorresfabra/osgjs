import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';
import Uniform from 'osg/Uniform';
import { mat3 } from 'osg/glMatrix';
import { mat4 } from 'osg/glMatrix';
import { vec3 } from 'osg/glMatrix';
import { vec4 } from 'osg/glMatrix';

// use the same kind of opengl lights
// see http://www.glprogramming.com/red/chapter05.html

var Light = function(lightNum, disable) {
    StateAttribute.call(this);

    var lightNumber = lightNum !== undefined ? lightNum : 0;

    this._ambient = vec4.fromValues(0.2, 0.2, 0.2, 1.0);
    this._diffuse = vec4.fromValues(0.8, 0.8, 0.8, 1.0);
    this._specular = vec4.fromValues(0.2, 0.2, 0.2, 1.0);

    // Default is directional as postion[3] is 0
    this._position = vec4.fromValues(0.0, 0.0, 1.0, 0.0);
    this._direction = vec3.fromValues(0.0, 0.0, -1.0);

    // TODO : refactor lights management w=1.0 (isHemi), w=-1.0
    // (isNotHemi) _ground contains the color but w says if it's
    // an hemi or not
    this._ground = vec4.fromValues(0.2, 0.2, 0.2, -1.0);

    this._spotCutoff = 180.0;
    this._spotBlend = 0.01;

    // the array contains constant, linear, quadratic factor
    this._attenuation = vec4.fromValues(1.0, 0.0, 0.0, 0.0);

    this._lightNumber = lightNumber;

    this._enable = !disable;
    this._dirtyHash = true;
    this._hash = '';
};

Light.DIRECTION = 'DIRECTION';
Light.SPOT = 'SPOT';
Light.POINT = 'POINT';
Light.HEMI = 'HEMI';

Light.uniforms = {};
utils.createPrototypeStateAttribute(
    Light,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'Light',

        cloneType: function() {
            return new Light(this._lightNumber, true);
        },

        getTypeMember: function() {
            return this.attributeType + this._lightNumber;
        },

        getUniformName: function(name) {
            return 'u' + this.getTypeMember() + '_' + name;
        },

        getHash: function() {
            if (!this._dirtyHash) return this._hash;

            this._hash = this._computeInternalHash();
            this._dirtyHash = false;
            return this._hash;
        },

        _computeInternalHash: function() {
            return this.getTypeMember() + this.getLightType() + this.isEnabled().toString();
        },
        getOrCreateUniforms: function() {
            var obj = Light;
            var typeMember = this.getTypeMember();

            if (obj.uniforms[typeMember]) return obj.uniforms[typeMember];

            obj.uniforms[typeMember] = {
                viewPosition: Uniform.createFloat4(this.getUniformName('viewPosition')),
                viewDirection: Uniform.createFloat3(this.getUniformName('viewDirection')),
                modelViewMatrix: Uniform.createMatrix4(this.getUniformName('modelViewMatrix')),
                modelViewNormalMatrix: Uniform.createMatrix3(
                    this.getUniformName('modelViewNormalMatrix')
                ),

                ambient: Uniform.createFloat4(this.getUniformName('ambient')),
                diffuse: Uniform.createFloat4(this.getUniformName('diffuse')),
                specular: Uniform.createFloat4(this.getUniformName('specular')),
                attenuation: Uniform.createFloat4(this.getUniformName('attenuation')),

                spotCutOff: Uniform.createFloat1(this.getUniformName('spotCutOff')),
                spotBlend: Uniform.createFloat1(this.getUniformName('spotBlend')),
                ground: Uniform.createFloat4(this.getUniformName('ground'))
            };

            return obj.uniforms[typeMember];
        },

        // enable / disable is not implemented in uniform
        // we should add it
        isEnabled: function() {
            return this._enable;
        },

        setEnabled: function(bool) {
            this._enable = bool;
            this._dirtyHash = true;
        },

        // colors
        setAmbient: function(a) {
            vec4.copy(this._ambient, a);
        },

        getAmbient: function() {
            return this._ambient;
        },

        setDiffuse: function(a) {
            vec4.copy(this._diffuse, a);
        },

        getDiffuse: function() {
            return this._diffuse;
        },

        setSpecular: function(a) {
            vec4.copy(this._specular, a);
        },

        getSpecular: function() {
            return this._specular;
        },

        // position, also used for directional light
        // position[3] === 0 means directional
        // see creating lightsources http://www.glprogramming.com/red/chapter05.html
        setPosition: function(a) {
            vec4.copy(this._position, a);
        },

        getPosition: function() {
            return this._position;
        },

        // unused for directional
        setDirection: function(a) {
            vec3.copy(this._direction, a);
        },

        getDirection: function() {
            return this._direction;
        },

        setSpotCutoff: function(a) {
            this._spotCutoff = a;
        },

        getSpotCutoff: function() {
            return this._spotCutoff;
        },

        setSpotBlend: function(a) {
            this._spotBlend = a;
        },

        getSpotBlend: function() {
            return this._spotBlend;
        },

        // set/get the color of the ground
        setGround: function(a) {
            vec3.copy(this._ground, a);
        },

        getGround: function() {
            return this._ground;
        },

        // attenuation coeff
        setConstantAttenuation: function(value) {
            this._attenuation[0] = value;
        },

        getConstantAttenuation: function() {
            return this._attenuation[0];
        },

        setLinearAttenuation: function(value) {
            this._attenuation[1] = value;
        },

        getLinearAttenuation: function() {
            return this._attenuation[1];
        },

        setQuadraticAttenuation: function(value) {
            this._attenuation[2] = value;
        },

        getQuadraticAttenuation: function() {
            return this._attenuation[2];
        },

        setLightType: function(type) {
            if (type === Light.DIRECTION) return this.setLightAsDirection();
            else if (type === Light.SPOT) return this.setLightAsSpot();
            else if (type === Light.HEMI) return this.setLightAsHemi();
            return this.setLightAsPoint();
        },

        getLightType: function() {
            if (this.isDirectionLight()) return Light.DIRECTION;
            else if (this.isSpotLight()) return Light.SPOT;
            else if (this.isHemiLight()) return Light.HEMI;
            return Light.POINT;
        },

        setLightAsSpot: function() {
            vec4.set(this._position, 0.0, 0.0, 0.0, 1.0);
            vec3.set(this._direction, 0.0, 0.0, -1.0);
            this._ground[3] = -1.0;
            this._spotCutoff = 90;
            this._dirtyHash = true;
        },

        setLightAsPoint: function() {
            vec4.set(this._position, 0.0, 0.0, 0.0, 1.0);
            vec3.set(this._direction, 0.0, 0.0, -1.0);
            this._ground[3] = -1.0;
            this._dirtyHash = true;
        },

        setLightAsDirection: function() {
            vec4.set(this._position, 0.0, 0.0, 1.0, 0.0);
            this._spotCutoff = 180;
            this._ground[3] = -1.0;
            this._dirtyHash = true;
        },

        setLightAsHemi: function() {
            vec4.set(this._position, 0.0, 0.0, 1.0, 0.0);
            this._spotCutoff = 180;
            this._ground[3] = 1.0;
            this._dirtyHash = true;
        },

        setLightNumber: function(unit) {
            this._lightNumber = unit;
            this._dirtyHash = true;
        },

        getLightNumber: function() {
            return this._lightNumber;
        },

        // internal helper
        isSpotLight: function() {
            return this._spotCutoff < 180.0;
        },

        isDirectionLight: function() {
            return this._position[3] === 0.0 && this._ground[3] === -1.0;
        },

        isHemiLight: function() {
            return this._ground[3] === 1.0;
        },

        // matrix is current model view, which can mean:
        // world (node refAbsolute)
        // world+camera (camera is refAbsolute)
        // world+camera+camera+... (camera relative...)
        applyPositionedUniform: function(matrix) {
            var uniformMap = this.getOrCreateUniforms();

            var modelView = uniformMap.modelViewMatrix.getInternalArray();
            var modelViewNormal = uniformMap.modelViewNormalMatrix.getInternalArray();
            var viewPosition = uniformMap.viewPosition.getInternalArray();
            var viewDirection = uniformMap.viewDirection.getInternalArray();

            mat4.copy(modelView, matrix);
            mat3.normalFromMat4(modelViewNormal, matrix);

            vec4.transformMat4(viewPosition, this._position, modelView);
            vec3.transformMat3(viewDirection, this._direction, modelViewNormal);
        },

        apply: function() {
            if (!this._enable) return;

            var uniformMap = this.getOrCreateUniforms();

            if (this.isSpotLight()) {
                var spotsize = Math.cos(this._spotCutoff * Math.PI / 180.0);
                uniformMap.spotCutOff.setFloat(spotsize);
                uniformMap.spotBlend.setFloat((1.0 - spotsize) * this._spotBlend);
            }

            if (this.isHemiLight()) {
                uniformMap.ground.setFloat4(this._ground);
            }

            uniformMap.attenuation.setFloat4(this._attenuation);
            uniformMap.diffuse.setFloat4(this._diffuse);
            uniformMap.specular.setFloat4(this._specular);
            uniformMap.ambient.setFloat4(this._ambient);
        }
    }),
    'osg',
    'Light'
);

export default Light;
