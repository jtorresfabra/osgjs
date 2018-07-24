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
import Uniform from 'osg/Uniform';
import { mat4 } from 'osg/glMatrix';
import WorkerPool from 'osgUtil/WorkerPool';

var RANGE = 100000.0;

// task to run
function WorkerTask(callback, msg) {
    this.callback = callback;
    this.startMessage = msg;
};

var ReaderWriterSKT = function() {
    this._decoder = new BinaryDecoder();
    this._decoder.setLittleEndian(true);
    this._geometry = undefined;
    this._extent = [];
    this._workerPool = new WorkerPool(6,'ReaderWorker.js');
    this._workerPool.init();
    this._currentPromise = undefined;
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
        return new P(function(resolve)
        {
            var message = {
                buffer: bufferArray,
            };
            var task =  function(e) {
                var model = e.data.model;
                if(!that._extent.length)
                {
                    that._extent = that._extent.concat(model._header._minExtent);
                    that._extent = that._extent.concat(model._header._maxExtent);
                }
                var mt = new MatrixTransform();
                mat4.fromTranslation(mt.getMatrix(), model._header._center);
                var geometry = new Geometry();
                geometry.getAttributes().Vertex = new BufferArray(BufferArray.ARRAY_BUFFER, e.data.vertices, 3);

                geometry.getAttributes().NormalsQuantized = new BufferArray(BufferArray.ARRAY_BUFFER, e.data.normals, 2);

                geometry.getAttributes().Color = new BufferArray(BufferArray.ARRAY_BUFFER, e.data.colors, 3);
                geometry.getAttributes().Color.setNormalize(true);
                var primitive = new DrawElements(
                    primitiveSet.TRIANGLES,
                    new BufferArray(BufferArray.ELEMENT_ARRAY_BUFFER, e.data.indices, 1)
                );
                geometry.getPrimitives().push(primitive);
                mt.addChild(geometry);
                var bb = new BoundingBox();
                var extent =  that.getExtentFromTileId(model._header._tileId);
                bb.setMin(extent.slice(0,3));
                bb.setMax(extent.slice(3));
                geometry.setBound(bb);
                var minExtentUniform = Uniform.createFloat3(model._header._minExtent, 'minExtent');
                var maxExtentUniform = Uniform.createFloat3(model._header._maxExtent, 'maxExtent');
                geometry.getOrCreateStateSet().addUniform(minExtentUniform);
                geometry.getOrCreateStateSet().addUniform(maxExtentUniform);
                var tileLOD =  new PagedLOD();
                tileLOD._children = model._children;
                tileLOD._name = model._header._tileId;
                tileLOD.addChild(geometry, 0, RANGE);
                tileLOD.setFunction(1, that.readChildrenTiles.bind(that));
                tileLOD.setRange(1, RANGE, Number.MAX_VALUE);
                tileLOD.setRangeMode(PagedLOD.PIXEL_SIZE_ON_SCREEN);
                if (!model._children.length) tileLOD = geometry;
                resolve(tileLOD);
            };
            var workerTask = new WorkerTask(task, message);
            that._workerPool.addWorkerTask(workerTask);
        });
    },


    readChildrenTiles: function(parent) {
        var group = new Node();
        var children = parent._children;
        var numChilds = children.length;
        var promises = [];
        this._currentPromise = promises;
        var createTile = function(tileURI, rw) {
            return rw
                .readNodeURL(rw._databasePath + tileURI, { xhr: parent._xhrRequests })
                .then(function(child) {
                    group.addChild(child);
                });
        };
        // we need to read all the childrens

        for (var i = 0; i < numChilds; i++) {
            promises[i] = createTile(this.getRelativeTileName(children[i]), this);
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
        var verticesQuantized = new Uint16Array(this._decoder.decodeArray(verticesSize * 2).buffer);

        var vertices = new Float32Array(verticesSize);
        var lengthX = model._header._maxExtent[0] - model._header._minExtent[0];
        var lengthY = model._header._maxExtent[1] - model._header._minExtent[1];
        var lengthZ = model._header._maxExtent[2] - model._header._minExtent[2];

        /* for (var i=0; i< verticesSize / 3; i++){
            vertices[i*3] = model._header._minExtent[0] + (verticesQuantized[i*3] * lengthX/ 65535);
            vertices[i*3+1] = model._header._minExtent[1] +( verticesQuantized[i*3+1] * lengthY/ 65535);
            vertices[i*3+2] = model._header._minExtent[2]  +( verticesQuantized[i*3 +2] * lengthZ/ 65535);
        }*/

        var normalsSize = this._decoder.getUint32Value() * 2.0;
        var normalsQuantized = new Uint8Array(this._decoder.decodeArray(normalsSize).buffer);

        var colorSize = this._decoder.getUint32Value() * 3.0;
        var colors = new Uint8Array(this._decoder.decodeArray(colorSize).buffer);

        var geometry = new Geometry();
        geometry.getAttributes().Vertex = new BufferArray(BufferArray.ARRAY_BUFFER, verticesQuantized, 3);

        geometry.getAttributes().NormalsQuantized = new BufferArray(BufferArray.ARRAY_BUFFER, normalsQuantized, 2);

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
    },

    getExtentFromTileId: function(tileId) {

        var numTiles = Math.max(1.0, 1 << tileId[0]);
        var tileExtent =[];

        var lengthX = this._extent[3] -this._extent[0];
        var lengthY = this._extent[4] -this._extent[1];
        var lengthZ = this._extent[5] -this._extent[2];

        tileExtent[0] = this._extent[0] + tileId[1]*(lengthX)/numTiles;
        tileExtent[1] = this._extent[1] + tileId[2]*(lengthY)/numTiles;
        tileExtent[2] = this._extent[2] + tileId[3]*(lengthZ)/numTiles;

        tileExtent[3] = tileExtent[0] + lengthX/numTiles;
        tileExtent[4] = tileExtent[1] + lengthY/numTiles;
        tileExtent[5] = tileExtent[2] + lengthZ/numTiles;
        return tileExtent;
    },




};

Registry.instance().addReaderWriter('skt', new ReaderWriterSKT());

export default ReaderWriterSKT;
