import { vec3 } from 'osg/glMatrix';
import primitiveSet from 'osg/primitiveSet';
import DrawElements from 'osg/DrawElements';
import DrawArrays from 'osg/DrawArrays';

/**
 * PrimitiveFunctor emulates the TemplatePrimitiveFunctor class in OSG and can
 * be used to get access to the vertices that compose the things drawn by osgjs.
 *
 * You have to feed it with an object that references 3 callbacks :
 *
 * var myObject = {
 *     operatorPoint : function ( v ) { }, // Do your point operations here
 *     operatorLine : function ( v1, v2 ){ }, // Do you line operations here
 *     operatorTriangle : function ( v1, v2, v3 ) { } // Do your triangle operations here
 * };
 *
 */

var functorDrawElements = [];
var functorDrawArrays = [];

functorDrawElements[primitiveSet.POINTS] = (function() {
    var v = vec3.create();
    return function(offset, count, indexes, cb, vertices) {
        var end = offset + count;
        for (var i = offset; i < end; ++i) {
            var j = indexes[i] * 3;
            v[0] = vertices[j];
            v[1] = vertices[j + 1];
            v[2] = vertices[j + 2];
            cb.operatorPoint(v);
        }
    };
})();

functorDrawElements[primitiveSet.LINES] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function(offset, count, indexes, cb, vertices) {
        var end = offset + count;
        for (var i = offset; i < end - 1; i += 2) {
            var j = indexes[i] * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = indexes[i + 1] * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            cb.operatorLine(v1, v2);
        }
    };
})();

functorDrawElements[primitiveSet.LINE_STRIP] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function(offset, count, indexes, cb, vertices) {
        var end = offset + count;
        for (var i = offset; i < end - 1; ++i) {
            var j = indexes[i] * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = indexes[i + 1] * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            cb.operatorLine(v1, v2);
        }
    };
})();

functorDrawElements[primitiveSet.LINE_LOOP] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function(offset, count, indexes, cb, vertices) {
        var last = offset + count - 1;
        for (var i = offset; i < last; ++i) {
            var j = indexes[i] * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = indexes[i + 1] * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            cb.operatorLine(v1, v2);
        }
        last = indexes[last] * 3;
        v1[0] = vertices[last];
        v1[1] = vertices[last + 1];
        v1[2] = vertices[last + 2];
        var first = indexes[0] * 3;
        v2[0] = vertices[first];
        v2[1] = vertices[first + 1];
        v2[2] = vertices[first + 2];
        cb.operatorLine(v1, v2);
    };
})();

functorDrawElements[primitiveSet.TRIANGLES] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function(offset, count, indexes, cb, vertices) {
        var end = offset + count;
        for (var i = offset; i < end; i += 3) {
            var j = indexes[i] * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = indexes[i + 1] * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            j = indexes[i + 2] * 3;
            v3[0] = vertices[j];
            v3[1] = vertices[j + 1];
            v3[2] = vertices[j + 2];
            cb.operatorTriangle(v1, v2, v3);
        }
    };
})();

functorDrawElements[primitiveSet.TRIANGLE_STRIP] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function(offset, count, indexes, cb, vertices) {
        for (var i = 2, pos = offset; i < count; ++i, ++pos) {
            var j = indexes[pos] * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = indexes[pos + 1] * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            j = indexes[pos + 2] * 3;
            v3[0] = vertices[j];
            v3[1] = vertices[j + 1];
            v3[2] = vertices[j + 2];
            if (i % 2) {
                cb.operatorTriangle(v1, v3, v2);
            } else {
                cb.operatorTriangle(v1, v2, v3);
            }
        }
    };
})();

functorDrawElements[primitiveSet.TRIANGLE_FAN] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function(offset, count, indexes, cb, vertices) {
        var first = indexes[offset];
        for (var i = 2, pos = offset + 1; i < count; ++i, ++pos) {
            v1[0] = vertices[first];
            v1[1] = vertices[first + 1];
            v1[2] = vertices[first + 2];
            var j = indexes[pos] * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            j = indexes[pos + 1] * 3;
            v3[0] = vertices[j];
            v3[1] = vertices[j + 1];
            v3[2] = vertices[j + 2];
            cb.operatorTriangle(v1, v2, v3);
        }
    };
})();

functorDrawArrays[primitiveSet.POINTS] = (function() {
    var v = vec3.create();
    return function(first, count, cb, vertices) {
        for (var i = first; i < first + count; ++i) {
            var j = i * 3;
            v[0] = vertices[j];
            v[1] = vertices[j + 1];
            v[2] = vertices[j + 2];
            cb.operatorPoint(v);
        }
    };
})();

functorDrawArrays[primitiveSet.LINES] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function(first, count, cb, vertices) {
        for (var i = first; i < first + count - 1; i += 2) {
            var j = i * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = (i + 1) * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            cb.operatorLine(v1, v2);
        }
    };
})();

functorDrawArrays[primitiveSet.LINE_STRIP] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function(first, count, cb, vertices) {
        for (var i = first; i < first + count - 1; ++i) {
            var j = i * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = (i + 1) * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            cb.operatorLine(v1, v2);
        }
    };
})();

functorDrawArrays[primitiveSet.LINE_LOOP] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function(first, count, cb, vertices) {
        var last = first + count - 1;
        for (var i = first; i < last; ++i) {
            var j = i * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = (i + 1) * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            cb.operatorLine(v1, v2);
        }
        last = last * 3;
        v1[0] = vertices[last];
        v1[1] = vertices[last + 1];
        v1[2] = vertices[last + 2];
        first = first * 3;
        v2[0] = vertices[first];
        v2[1] = vertices[first + 1];
        v2[2] = vertices[first + 2];
        cb.operatorLine(v1, v2);
    };
})();

functorDrawArrays[primitiveSet.TRIANGLES] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function(first, count, cb, vertices) {
        for (var i = first; i < first + count; i += 3) {
            var j = i * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = (i + 1) * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            j = (i + 2) * 3;
            v3[0] = vertices[j];
            v3[1] = vertices[j + 1];
            v3[2] = vertices[j + 2];
            cb.operatorTriangle(v1, v2, v3);
        }
    };
})();

functorDrawArrays[primitiveSet.TRIANGLE_STRIP] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function(first, count, cb, vertices) {
        for (var i = 2, pos = first; i < count; ++i, ++pos) {
            var j = pos * 3;
            v1[0] = vertices[j];
            v1[1] = vertices[j + 1];
            v1[2] = vertices[j + 2];
            j = (pos + 1) * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            j = (pos + 2) * 3;
            v3[0] = vertices[j];
            v3[1] = vertices[j + 1];
            v3[2] = vertices[j + 2];
            if (i % 2) {
                cb.operatorTriangle(v1, v3, v2);
            } else {
                cb.operatorTriangle(v1, v2, v3);
            }
        }
    };
})();

functorDrawArrays[primitiveSet.TRIANGLE_FAN] = (function() {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function(first, count, cb, vertices) {
        for (var i = 2, pos = first + 1; i < count; ++i, ++pos) {
            v1[0] = vertices[first];
            v1[1] = vertices[first + 1];
            v1[2] = vertices[first + 2];
            var j = pos * 3;
            v2[0] = vertices[j];
            v2[1] = vertices[j + 1];
            v2[2] = vertices[j + 2];
            j = (pos + 1) * 3;
            v3[0] = vertices[j];
            v3[1] = vertices[j + 1];
            v3[2] = vertices[j + 2];
            cb.operatorTriangle(v1, v2, v3);
        }
    };
})();

var primitiveFunctor = function(geom, cb, vertices) {
    var primitives = geom.getPrimitiveSetList();
    if (!primitives) return;

    var cbFunctor;

    var nbPrimitives = primitives.length;
    for (var i = 0; i < nbPrimitives; i++) {
        var primitive = primitives[i];
        if (primitive instanceof DrawElements) {
            cbFunctor = functorDrawElements[primitive.getMode()];
            if (cbFunctor) {
                var indexes = primitive.indices.getElements();
                cbFunctor(
                    primitive.getFirst() / indexes.BYTES_PER_ELEMENT,
                    primitive.getCount(),
                    indexes,
                    cb,
                    vertices
                );
            }
        } else if (primitive instanceof DrawArrays) {
            cbFunctor = functorDrawArrays[primitive.getMode()];
            if (cbFunctor) {
                cbFunctor(primitive.getFirst(), primitive.getCount(), cb, vertices);
            }
        }
    }
};

export default primitiveFunctor;
