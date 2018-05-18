'use strict';
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

var RANGE = 50000;

var ReaderWriterSKT = function() {
    this._decoder = new BinaryDecoder();
    this._decoder.setLittleEndian(true);
    this._geometry = undefined;
};

var SKTHeader = function() {
    this._magic = ''; // is the ASCII string 'skfb', and can be used to identify the file as skfb tile.
    this._version = 0; // is an uint32 that indicates the version of the Binary skt container format
    this._tileId = new Uint16Array(5); // Tile Identifier
    this._numTris = 0;
    this._numChildren = 0;
};



var SKTModel = function() {
    this._header = new SKTHeader();
    this._children = []
};

ReaderWriterSKT.prototype = {
    readNodeURL: function(url, options) {
        var self = this;
        var filePromise = requestFile(url, {
            responseType: 'arraybuffer'
        });

        if ( options && options.databasePath !== undefined ) {
            this._databasePath = options.databasePath;
        }

        return filePromise.then(function(file) {
            return self.readTile(file);
        });
    },

    readTile: function(bufferArray) {
        var model = new SKTModel();
        this.readHeader(bufferArray, model);
        this.readChildrenInfo(bufferArray, model);



        var geometry = this.readBuffers( bufferArray, model );

        var tileLOD = new PagedLOD();
        if(!model._children.length) return geometry;

        tileLOD._children = model._children;
        tileLOD.addChild(geometry, 0, RANGE);
        tileLOD.setFunction(1, this.readChildrenTiles.bind(this));
        tileLOD.setRange(1, RANGE, Number.MAX_VALUE);
        tileLOD.setRangeMode( PagedLOD.PIXEL_SIZE_ON_SCREEN );
        return tileLOD;
    },

    readChildrenTiles: function ( parent ) {
        var defer = P.defer();
        var numChilds = 0;
        var group = new Node();

        var createTile = function ( tileURI, rw ) {
            rw.readNodeURL( rw._databasePath + tileURI ).then( function ( child ) {
                group.addChild(child);
                numChilds--;
                if ( numChilds <= 0 )
                    defer.resolve( group );
            } );
        };
        // we need to read all the childrens
        var children = parent._children;
        var numChilds = children.length;
        for ( var i = 0; i < numChilds; i++ ) {
            createTile(this.getRelativeTileName(children[i]),this);
        }
        return defer.promise;
    },


    readHeader: function(bufferArray, model) {
        this._decoder.setBuffer(bufferArray);

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
        model._header._tileId[4] = this._decoder.getUint16Value();

        // Padding 16 bits (shame..:( )
        this._decoder.getUint16Value();

        //NumTris
        model._header._numTris = this._decoder.getUint32Value();

        // Extent needs double check, not important for now
        model._header._minExtent = [this._decoder.getFloat64Value(), this._decoder.getFloat64Value(), this._decoder.getFloat64Value()];
        model._header._maxExtent = [this._decoder.getFloat64Value(), this._decoder.getFloat64Value(), this._decoder.getFloat64Value()];
        // Num Children
        model._header._numChildren = this._decoder.getUint32Value();
        // more padding
        var val = this._decoder.getUint32Value();
    },

    readChildrenInfo: function(bufferArray, model)
    {
        for (var i=0; i < model._header._numChildren; i++)
        {
            var tileId = new Uint16Array(5);
            tileId[0] = this._decoder.getUint16Value();
            tileId[1] = this._decoder.getUint16Value();
            tileId[2] = this._decoder.getUint16Value();
            tileId[3] = this._decoder.getUint16Value();
            tileId[4] = this._decoder.getUint16Value();
            model._children[i]=tileId;
        }
    },

    readBuffers: function(bufferArray, model) {
        var indicesSize = this._decoder.getUint32Value();
        var indices = new Uint32Array(this._decoder.decodeArray(indicesSize*4).buffer);
        var verticesSize = this._decoder.getUint32Value()*3.0;
        // Need to write/read directly in Float32Array so this should disappear
        var vertices64 = new Float64Array(this._decoder.decodeArray(verticesSize*8).buffer);
        var vertices = new Float32Array( vertices64.length );

        for ( var i = 0, len = vertices64.length/3.0; i < len; i ++ ) {
            vertices[ 3*i ] = vertices64[ 3*i ];
            vertices[ 3*i + 1 ] = vertices64[ 3*i + 1 ];
            vertices[ 3*i + 2 ] = vertices64[ 3*i + 2 ];
        }

        var normalsSize = this._decoder.getUint32Value()*3.0;
        var normals = new Float32Array(this._decoder.decodeArray(normalsSize*4).buffer);

        var geometry = new Geometry();
        geometry.getAttributes().Vertex = new BufferArray(BufferArray.ARRAY_BUFFER, vertices, 3);

        geometry.getAttributes().Normal = new BufferArray(BufferArray.ARRAY_BUFFER, normals, 3);
        var primitive = new DrawElements(
        primitiveSet.TRIANGLES,
            new BufferArray(BufferArray.ELEMENT_ARRAY_BUFFER, indices, 1)
        );
        geometry.getPrimitives().push(primitive);
        return geometry;
    },


    getRelativeTileName: function(tileId) {
        var tileName = '';
        tileName += tileId[0]+'/';
        tileName += tileId[4]+'/';
        tileName += tileId[1]+'/';
        tileName += tileId[2]+'/';
        tileName += 'L' + tileId[0] + '_';
        tileName += 'X' + tileId[1] + '_';
        tileName += 'Y' + tileId[2] + '_';
        tileName += 'Z' + tileId[3] + '_';
        tileName += 'W' + tileId[4] + '.skt';
        return tileName;
    }

};

Registry.instance().addReaderWriter('skt', new ReaderWriterSKT());

export default ReaderWriterSKT;
