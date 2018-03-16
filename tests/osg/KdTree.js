import { assert } from 'chai';
import 'tests/mockup/mockup';
import { vec3 } from 'osg/glMatrix';
import Shape from 'osg/shape';
import DrawElements from 'osg/DrawElements';
import DrawArrays from 'osg/DrawArrays';
import primitiveSet from 'osg/primitiveSet';
import BufferArray from 'osg/BufferArray';
import Geometry from 'osg/Geometry';
import KdTree from 'osg/KdTree';
import LineSegmentIntersector from 'osgUtil/LineSegmentIntersector';
import IntersectionVisitor from 'osgUtil/IntersectionVisitor';
import SphereIntersector from 'osgUtil/SphereIntersector';

export default function() {
    test('KdTree', function() {
        //   0-3
        //   |\|
        //   1-2
        //
        // 1 being [0, 0, 0]
        // 3 being [1, 1, 0]

        var createTrianglesIndexed = function() {
            // triangles
            var quad = Shape.createTexturedQuadGeometry(0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1);

            return quad;
        };

        var createTriangleStripIndex = function() {
            var quad = Shape.createTexturedQuadGeometry(0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1);

            var indexes = [];
            indexes[0] = 1;
            indexes[1] = 0;
            indexes[2] = 2;
            indexes[3] = 3;

            var primitive = new DrawElements(
                primitiveSet.TRIANGLE_STRIP,
                new BufferArray(BufferArray.ELEMENT_ARRAY_BUFFER, indexes, 1)
            );
            quad.getPrimitives()[0] = primitive;

            return quad;
        };

        var createTriangleFanIndexed = function() {
            var quad = Shape.createTexturedQuadGeometry(0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1);

            var indexes = [];
            indexes[0] = 0;
            indexes[1] = 1;
            indexes[2] = 2;
            indexes[3] = 3;

            var primitive = new DrawElements(
                primitiveSet.TRIANGLE_FAN,
                new BufferArray(BufferArray.ELEMENT_ARRAY_BUFFER, indexes, 1)
            );
            quad.getPrimitives()[0] = primitive;

            return quad;
        };

        var createTrianglesNotIndexed = function() {
            var cornerx = 0,
                cornery = 0,
                cornerz = 0;
            var wx = 1,
                wy = 0,
                wz = 0;
            var hx = 0,
                hy = 1,
                hz = 0;
            var quad = new Geometry();

            var vertexes = [];
            vertexes[0] = cornerx + hx;
            vertexes[1] = cornery + hy;
            vertexes[2] = cornerz + hz;

            vertexes[3] = cornerx;
            vertexes[4] = cornery;
            vertexes[5] = cornerz;

            vertexes[6] = cornerx + wx;
            vertexes[7] = cornery + wy;
            vertexes[8] = cornerz + wz;

            vertexes[9] = cornerx + hx;
            vertexes[10] = cornery + hy;
            vertexes[11] = cornerz + hz;

            vertexes[12] = cornerx + wx;
            vertexes[13] = cornery + wy;
            vertexes[14] = cornerz + wz;

            vertexes[15] = cornerx + wx + hx;
            vertexes[16] = cornery + wy + hy;
            vertexes[17] = cornerz + wz + hz;

            quad.getAttributes().Vertex = new BufferArray(BufferArray.ARRAY_BUFFER, vertexes, 3);
            var primitive = new DrawArrays(primitiveSet.TRIANGLES, 0, 6);
            quad.getPrimitives().push(primitive);

            return quad;
        };

        var createTriangleStripNotIndexed = function() {
            var cornerx = 0,
                cornery = 0,
                cornerz = 0;
            var wx = 1,
                wy = 0,
                wz = 0;
            var hx = 0,
                hy = 1,
                hz = 0;
            var quad = new Geometry();

            var vertexes = [];
            vertexes[0] = cornerx;
            vertexes[1] = cornery;
            vertexes[2] = cornerz;

            vertexes[3] = cornerx + hx;
            vertexes[4] = cornery + hy;
            vertexes[5] = cornerz + hz;

            vertexes[6] = cornerx + wx;
            vertexes[7] = cornery + wy;
            vertexes[8] = cornerz + wz;

            vertexes[9] = cornerx + wx + hx;
            vertexes[10] = cornery + wy + hy;
            vertexes[11] = cornerz + wz + hz;

            quad.getAttributes().Vertex = new BufferArray(BufferArray.ARRAY_BUFFER, vertexes, 3);
            var primitive = new DrawArrays(primitiveSet.TRIANGLE_STRIP, 0, 4);
            quad.getPrimitives().push(primitive);

            return quad;
        };

        var createTriangleFanNotIndexed = function() {
            var cornerx = 0,
                cornery = 0,
                cornerz = 0;
            var wx = 1,
                wy = 0,
                wz = 0;
            var hx = 0,
                hy = 1,
                hz = 0;
            var quad = new Geometry();

            var vertexes = [];
            vertexes[0] = cornerx + hx;
            vertexes[1] = cornery + hy;
            vertexes[2] = cornerz + hz;

            vertexes[3] = cornerx;
            vertexes[4] = cornery;
            vertexes[5] = cornerz;

            vertexes[6] = cornerx + wx;
            vertexes[7] = cornery + wy;
            vertexes[8] = cornerz + wz;

            vertexes[9] = cornerx + wx + hx;
            vertexes[10] = cornery + wy + hy;
            vertexes[11] = cornerz + wz + hz;

            quad.getAttributes().Vertex = new BufferArray(BufferArray.ARRAY_BUFFER, vertexes, 3);
            var primitive = new DrawArrays(primitiveSet.TRIANGLE_FAN, 0, 4);
            quad.getPrimitives().push(primitive);

            return quad;
        };

        var createGeometry = function() {
            var geom1 = createTrianglesIndexed();
            var geom2 = createTrianglesNotIndexed();
            var geom3 = createTriangleStripIndex();
            var geom4 = createTriangleStripNotIndexed();
            var geom5 = createTriangleFanIndexed();
            var geom6 = createTriangleFanNotIndexed();

            var geoms = [geom1, geom2, geom3, geom4, geom5, geom6];
            var nbGeom = geoms.length;

            var geomTotal = new Geometry();
            var primitives = geomTotal.getPrimitives();
            var vertices = [];

            var i = 0;
            var j = 0;
            for (i = 0; i < nbGeom; ++i) {
                var geo = geoms[i];
                var prim = geo.getPrimitives()[0];
                var offset = vertices.length / 3;
                if (prim.getIndices) {
                    var indices = prim.indices.getElements();
                    var nbPrim = indices.length;
                    for (j = 0; j < nbPrim; ++j) indices[j] += offset;
                } else prim.first = offset;
                primitives.push(geo.getPrimitives()[0]);

                var verts = geo.getAttributes().Vertex.getElements();
                var nbVerts = verts.length;
                for (j = 0; j < nbVerts; ++j) vertices.push(verts[j]);
            }
            geomTotal.getAttributes().Vertex = new BufferArray(
                BufferArray.ARRAY_BUFFER,
                vertices,
                3
            );
            return geomTotal;
        };

        var geomTotal = createGeometry();
        var nbPrimitives = geomTotal.getPrimitives().length;

        var kdTree = new KdTree();
        kdTree.build(
            {
                _numVerticesProcessed: 0,
                _targetNumTrianglesPerLeaf: 3,
                _maxNumLevels: 20
            },
            geomTotal
        );
        var start = [0.4, 0.2, -2.0];
        var end = [0.4, 0.2, 0.5];

        // FIXME: Need to reimplement this tests, as intersectRay and intersectSphere
        // does not exist anymore.

        var interVisitor = new IntersectionVisitor();
        var lsi = new LineSegmentIntersector();
        interVisitor.setIntersector(lsi);

        // test ray intersection 1
        lsi.set(start, end);
        geomTotal.accept(interVisitor);

        var hits = lsi.getIntersections();
        assert.isOk(
            hits.length === nbPrimitives,
            ' Hits should be ' + nbPrimitives + ' and result is ' + hits.length
        );

        var result = [0.4, 0.2, 0];
        var dir = vec3.sub(vec3.create(), end, start);
        var found = vec3.add(vec3.create(), start, vec3.scale(vec3.create(), dir, hits[0]._ratio));
        assert.equalVector(found, result, 1e-4);

        // test ray intersection 2
        interVisitor.reset();
        lsi.reset();
        var v1 = vec3.fromValues(1.5, 0.2, -0.5);
        var v2 = vec3.fromValues(1.5, 0.2, 0.5);
        lsi.set(v1, v2);
        geomTotal.accept(interVisitor);

        hits = lsi.getIntersections();
        assert.isOk(hits.length === 0, ' Hits should be 0 ' + hits.length);

        // test sphere intersection 1
        // sphere center in on vertex 1 (see ascii art on top of the file)
        interVisitor.reset();
        var spi = new SphereIntersector();
        interVisitor.setIntersector(spi);
        spi.set(vec3.fromValues(0, 0, 0), Math.SQRT1_2 - 0.01);
        geomTotal.accept(interVisitor);

        hits = spi.getIntersections();
        assert.isOk(
            hits.length === nbPrimitives,
            ' Hits should be ' + nbPrimitives + ' and result is ' + hits.length
        );

        // test sphere intersection 2
        interVisitor.reset();
        spi.reset();
        spi.set(vec3.fromValues(0, 0, 0), Math.SQRT1_2 + 0.02);
        geomTotal.accept(interVisitor);

        var nbTriangles = nbPrimitives * 2; // the geometries are quad only
        hits = spi.getIntersections();
        assert.isOk(
            hits.length === nbTriangles,
            ' Hits should be ' + nbTriangles + ' and result is ' + hits.length
        );
    });
}
