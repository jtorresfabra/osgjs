import utils from 'osg/utils';
import Object from 'osg/Object';

var StateAttribute = function() {
    Object.call(this);
};

utils.createPrototypeStateAttribute(
    StateAttribute,
    utils.objectInherit(Object.prototype, {
        _attributeTypeIndex: undefined,

        getType: function() {
            return this.attributeType;
        },

        // basically, if you want two StateAttribute with the same attributeType in a stateSet/State
        // their typeMember should be different
        getTypeMember: function() {
            return this.attributeType;
        },

        apply: function() {},

        // getHash is used by the compiler to know if a change in a StateAttribute
        // must trigger a shader build
        // If you create your own attribute you will have to customize this function
        // a good rule is to that if you change uniform it should not rebuild a shader
        // but if you change a type or representation of your StateAttribute, then it should
        // if it impact the rendering.
        // check other attributes for examples
        getHash: function() {
            return this.getType();
        }
    }),
    'osg',
    'StateAttribute'
);

StateAttribute.OFF = 0;
StateAttribute.ON = 1;
StateAttribute.OVERRIDE = 2;
StateAttribute.PROTECTED = 4;
StateAttribute.INHERIT = 8;

export default StateAttribute;
