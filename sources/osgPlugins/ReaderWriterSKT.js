'use strict';
import P from 'bluebird';
import requestFile from 'osgDB/requestFile.js';
import notify from 'osg/notify';
import Registry from 'osgDB/Registry';
import BinaryDecoder from 'osgDB/BinaryDecoder';
import Geometry from 'osg/Geometry';
import BufferArray from 'osg/BufferArray';
import DrawElements from 'osg/DrawElements';
import primitiveSet from 'osg/primitiveSet';
import PagedLOD from 'osg/PagedLOD';
import Node from 'osg/Node';
import BoundingBox from 'osg/BoundingBox';
import KdTreeBuilder from 'osg/KdTreeBuilder';
import MatrixTransform from 'osg/MatrixTransform';
import { mat4 } from 'osg/glMatrix';

var RANGE = 100000.0;

var ReaderWriterSKT = function() {
    this._decoder = new BinaryDecoder();
    this._decoder.setLittleEndian(true);
    this._geometry = undefined;
};

var SKTHeader = function() {
    this._magic = ''; // is the ASCII string 'skfb', and can be used to identify the file as skfb tile.
    this._version = 0; // is an uint32 that indicates the version of the Binary skt container format
    this._tileId = new Uint16Array(4); // Tile Identifier
    this._numTris = 0;
    this._numChildren = 0;
};

var SKTModel = function() {
    this._header = new SKTHeader();
    this._children = [];
};

ReaderWriterSKT.prototype = {
    readNodeURL: function(url, options) {
        var self = this;
        var filePromise = requestFile(url, {
            responseType: 'arraybuffer',
            xhr: options.xhr
        });

        if (options && options.databasePath !== undefined) {
            this._databasePath = options.databasePath;
        }

        return filePromise.then(function(file) {
            return self.readTile(file);
        });
    },

    readTile: function(bufferArray) {
        var that = this;

            var model = new SKTModel();
            that._decoder.setBuffer(bufferArray);
            that.readHeader(model);
            that.readChildrenInfo(bufferArray, model);

            var mt = new MatrixTransform();
            mat4.fromTranslation(mt.getMatrix(), model._header._center);
            var geometry = that.readBuffers(model);
            mt.addChild(geometry);
            // console.time( 'build' );
            var treeBuilder = new KdTreeBuilder({
                _numVerticesProcessed: 0,
                _targetNumTrianglesPerLeaf: 250,
                _maxNumLevels: 10
             });
            var bb = new BoundingBox();
            bb.setMin(model._header._minExtent);
            bb.setMax(model._header._maxExtent);
            geometry.setBound(bb);
            treeBuilder.apply(geometry);


            var tileLOD = new PagedLOD();
            if (!model._children.length) return geometry;

            tileLOD._children = model._children;
            tileLOD.addChild(geometry, 0, RANGE);
            tileLOD.setFunction(1, that.readChildrenTiles.bind(that));
            tileLOD.setRange(1, RANGE, Number.MAX_VALUE);
            tileLOD.setRangeMode(PagedLOD.PIXEL_SIZE_ON_SCREEN);
            return tileLOD;
    },

    readChildrenTiles: function(parent) {
        var group = new Node();
        var children = parent._children;
        var numChilds = children.length;
        var promises = [];
        var createTile = function(tileURI, rw) {
            return rw
                .readNodeURL(rw._databasePath + tileURI, { xhr: parent._xhrRequests })
                .then(function(child) {
                    group.addChild(child);
                });
        };
        // we need to read all the childrens

        for (var i = 0; i < numChilds; i++) {
            promises.push(createTile(this.getRelativeTileName(children[i]), this));
        }
        return P.all(promises).then(function(){
            return group;
        });
    },

    readHeader: function(model) {
        model._header._magic = this._decoder.decodeStringArray(4);
        if (model._header._magic !== 'skfb') {
            notify.error(
                'Invalid Sketchfab Tiles Model.  Expected magic=skfb.  Read magic=' +
                    model.header.magic
            );
            return;
        }

        model._header._version = this._decoder.getUint32Value();
        if (model._header._version !== 1) {
            notify.error(
                'Only version 1 is supported.  Version' + model.header.version + ' is not.'
            );
            return;
        }

        // Read Tile Id
        model._header._tileId[0] = this._decoder.getUint16Value();
        model._header._tileId[1] = this._decoder.getUint16Value();
        model._header._tileId[2] = this._decoder.getUint16Value();
        model._header._tileId[3] = this._decoder.getUint16Value();

        //NumTris
        model._header._numTris = this._decoder.getUint32Value();
        model._header._numChildren = this._decoder.getUint32Value();

        // Extent needs double check, not important for now
        model._header._minExtent = [
            this._decoder.getFloat64Value(),
            this._decoder.getFloat64Value(),
            this._decoder.getFloat64Value()
        ];
        model._header._maxExtent = [
            this._decoder.getFloat64Value(),
            this._decoder.getFloat64Value(),
            this._decoder.getFloat64Value()
        ];
        model._header._center = [ (model._header._maxExtent[0] + model._header._minExtent[0]) * 0.5,(model._header._maxExtent[1] + model._header._minExtent[1])*0.5,
        (model._header._maxExtent[2]+ model._header._minExtent[2])*0.5];
    },

    readChildrenInfo: function(bufferArray, model) {
        for (var i = 0; i < model._header._numChildren; i++) {
            var tileId = new Uint16Array(4);
            tileId[0] = this._decoder.getUint16Value();
            tileId[1] = this._decoder.getUint16Value();
            tileId[2] = this._decoder.getUint16Value();
            tileId[3] = this._decoder.getUint16Value();
            model._children[i] = tileId;
        }
    },

    readBuffers: function(model) {
        var indicesSize = this._decoder.getUint32Value();
        var indices = new Uint32Array(this._decoder.decodeArray(indicesSize * 4).buffer);
        var verticesSize = this._decoder.getUint32Value() * 3.0;
        var verticesHalf = new Uint16Array(this._decoder.decodeArray(verticesSize * 2).buffer);

        var vertices = new Float32Array(verticesSize);
        for (var i=0; i< verticesSize / 3; i++){
            vertices[i*3] = model._header._center[0] + this._decoder.decodeFloat16(verticesHalf[i*3]);
            vertices[i*3+1] = model._header._center[1] + this._decoder.decodeFloat16(verticesHalf[i*3+1]);
            vertices[i*3+2] = model._header._center[2] + this._decoder.decodeFloat16(verticesHalf[i*3+2]);
/*            vertices[i*3] = this._decoder.decodeFloat16(verticesHalf[i*3]);
            vertices[i*3+1] = this._decoder.decodeFloat16(verticesHalf[i*3+1]);
            vertices[i*3+2] = this._decoder.decodeFloat16(verticesHalf[i*3+2]);*/
        }


        var normalsSize = this._decoder.getUint32Value() * 3.0;
        var normals = new Float32Array(this._decoder.decodeArray(normalsSize * 4).buffer);

        var colorSize = this._decoder.getUint32Value() * 3.0;
        var colors = new Uint8Array(this._decoder.decodeArray(colorSize).buffer);

        var geometry = new Geometry();
        geometry.getAttributes().Vertex = new BufferArray(BufferArray.ARRAY_BUFFER, vertices, 3);

        geometry.getAttributes().Normal = new BufferArray(BufferArray.ARRAY_BUFFER, normals, 3);

        geometry.getAttributes().Color = new BufferArray(BufferArray.ARRAY_BUFFER, colors, 3);
        geometry.getAttributes().Color.setNormalize(true);
        var primitive = new DrawElements(
            primitiveSet.TRIANGLES,
            new BufferArray(BufferArray.ELEMENT_ARRAY_BUFFER, indices, 1)
        );
        geometry.getPrimitives().push(primitive);
        return geometry;
    },

    getRelativeTileName: function(tileId) {
        var tileName = '';
        tileName += tileId[0] + '/';
        tileName += tileId[1] + '/';
        tileName += tileId[2] + '/';
        tileName += 'L' + tileId[0] + '_';
        tileName += 'X' + tileId[1] + '_';
        tileName += 'Y' + tileId[2] + '_';
        tileName += 'Z' + tileId[3] + '.skt';
        return tileName;
    }
};

Registry.instance().addReaderWriter('skt', new ReaderWriterSKT());

export default ReaderWriterSKT;
