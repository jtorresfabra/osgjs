(function() {
    /**
     * @author Jordi Torres
     */
    'use strict';
    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgGA = OSG.osgGA;
    var osgViewer = OSG.osgViewer;
    var osgDB = OSG.osgDB;
    var ExampleOSGJS = window.ExampleOSGJS;

    var modelURL = 'L0_X0_Y0_Z0.skt';
    var databasePath = './tileset/';

    var Example = function() {
        this._viewer = undefined;
        this._canvas = undefined;
        this._rootNode = new osg.MatrixTransform();
    };

    Example.prototype = osg.objectInherit(ExampleOSGJS.prototype, {
        getShader: function() {
            var vertexshader = [
                '',
                '#ifdef GL_ES',
                'precision highp float;',
                '#endif',

                'attribute vec3 Vertex;',
                'attribute vec3 Normal;',
                'attribute vec4 Color;',

                'uniform vec3 minExtent;',
                'uniform vec3 maxExtent;',

                'uniform mat4 uModelViewMatrix;',
                'uniform mat4 uProjectionMatrix;',
                //'varying vec4 vModelVertex;',
                'varying vec4 vVertexColor;',
                'void main(void) {',
                '  vec3 length = maxExtent - minExtent;',
                '  vec3 position;',
                '  position.x = minExtent.x +(Vertex.x * length.x/65535.);',
                '  position.y = minExtent.y +(Vertex.y * length.y/65535.);',
                '  position.z = minExtent.z +(Vertex.z * length.z/65535.);',
                '  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position,1.0);',
                '  vVertexColor = Color;',
                '}'
            ].join('\n');

            // notice the comment allowing for automatic UI shader binding
            var fragmentshader = [
                '',
                '#ifdef GL_ES',
                'precision highp float;',
                '#endif',
                //'varying vec4 vModelVertex;',
                'varying vec4 vVertexColor;',

                'void main(void) {',
                '  gl_FragColor = vVertexColor;',
                '}',
                ''
            ].join('\n');

            var program = new osg.Program(
                new osg.Shader('VERTEX_SHADER', vertexshader),
                new osg.Shader('FRAGMENT_SHADER', fragmentshader)
            );
            return program;
        },

        run: function() {
            // The 3D canvas.
            this._canvas = document.getElementById('View');
            // The viewer
            this._viewer = new osgViewer.Viewer(this._canvas, {
                enableFrustumCulling: true
            });
            this._viewer.init();

            var tiledmodelPromise = osgDB.readNodeURL(modelURL, {
                databasePath: databasePath
            });
            var self = this;
            tiledmodelPromise.then(function(tiledmodel) {
                tiledmodel.getOrCreateStateSet().setAttributeAndModes(self.getShader());

                var mt = new osg.MatrixTransform();
                osg.mat4.fromRotation(mt.getMatrix(), Math.PI / 2.0, osg.vec3.fromValues(0, 0, 1));
                mt.addChild(tiledmodel);
                self._rootNode.addChild(mt);

                //self._rootNode.addChild(tiledmodel);
                var cadManipulator = new osgGA.CADManipulator({
                    inputManager: self._viewer.getInputManager()
                });
                self._viewer.setupManipulator(cadManipulator);

                
                self._viewer.getCamera()
                   .getRenderer()
                   .getCullVisitor().setTraversalMask(~0x01);
                var bs = tiledmodel.getBound();
                self._viewer.getManipulator().computeHomePosition();

            });

            this._viewer.getDatabasePager().setMaxRequestsPerFrame(1);
            /*      this._viewer
                    .getCamera()
                    .getRenderer()
                    .getCullVisitor()
                    .setLODScale(0.5);*/

            var that = this;
            this._canvas.addEventListener('mousedown', function() {
                that._viewer.getDatabasePager().setAcceptNewDatabaseRequests(false);
            });
            this._canvas.addEventListener('mouseup', function() {
                that._viewer.getDatabasePager().setAcceptNewDatabaseRequests(true);
            });

            var timer;
            this._canvas.addEventListener('wheel', function() {
                that._viewer.getDatabasePager().setAcceptNewDatabaseRequests(false);
                clearTimeout(timer);
                timer = setTimeout(function() {
                    that._viewer.getDatabasePager().setAcceptNewDatabaseRequests(true);
                }, 350);
            });

            this._viewer.setSceneData(this._rootNode);

            this._viewer.run();
        }
    });

    window.addEventListener(
        'load',
        function() {
            var example = new Example();
            example.run();
        },
        true
    );
})();
