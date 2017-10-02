'use strict';
var utils = require('osg/utils');
var StateAttribute = require('osg/StateAttribute');

var LineWidth = function(lineWidth) {
    StateAttribute.call(this);
    this.lineWidth = 1.0;
    if (lineWidth !== undefined) {
        this.lineWidth = lineWidth;
    }
};
utils.createPrototypeStateAttribute(
    LineWidth,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'LineWidth',
        cloneType: function() {
            return new LineWidth();
        },
        apply: function(state) {
            state.getGraphicContext().lineWidth(this.lineWidth);
        }
    }),
    'osg',
    'LineWidth'
);

module.exports = LineWidth;
