import OrbitManipulatorHammerController from 'osgGA/OrbitManipulatorHammerController';
import InputGroups from 'osgViewer/input/InputConstants';
import utils from 'osg/utils';

var CADManipulatorHammerController = function(manipulator) {
    OrbitManipulatorHammerController.call(this, manipulator);
    this._timer = false;
};

utils.createPrototypeObject(
    CADManipulatorHammerController,
    utils.objectInherit(OrbitManipulatorHammerController.prototype, {
        _initInputs: function() {
            OrbitManipulatorHammerController.prototype._initInputs.call(
                this,
                InputGroups.CAD_MANIPULATOR_TOUCH
            );
           /* var manager = this._manipulator.getInputManager();
            manager.group(InputGroups.CAD_MANIPULATOR_TOUCH).addMappings(
                {
                     doubleTap: ['doubletap', 'doubletap2fingers']
                },
                this
            );*/
        },

        startMotion: function(interpolator, factor, ev) {
            OrbitManipulatorHammerController.prototype.startMotion.call(
                this,
                interpolator,
                factor,
                ev
            );
            this._manipulator.computeIntersections(ev.glX, ev.glY);
        },
        doubleTap: function (ev) {
            var manipulator = this._manipulator;
            manipulator.getZoomInterpolator().set( 0.0 );
            var zoomTarget = manipulator.getZoomInterpolator().getTarget()[ 0 ] - 10; // Default interval 10
            manipulator.getZoomInterpolator().setTarget( zoomTarget );
            manipulator.computeIntersections( ev.glX, ev.glY );
        }
    })
);

export default CADManipulatorHammerController;
