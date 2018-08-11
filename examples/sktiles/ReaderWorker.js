'use strict';

importScripts('BinaryDecoder.js');

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

onmessage = function(event)
{
    var buffer =  event.data.buffer;

    var decoder = new BinaryDecoder();
    decoder.setBuffer(buffer);

    var model = new SKTModel();
    model._header._magic = decoder.decodeStringArray(4);
    if (model._header._magic !== 'skfb') {
        console.error(
            'Invalid Sketchfab Tiles Model.  Expected magic=skfb.  Read magic=' +
                model.header.magic
        );
        return;
    }

    model._header._version = decoder.getUint32Value();
    if (model._header._version !== 1) {
        console.error(
            'Only version 1 is supported.  Version' + model._header._version + ' is not.'
        );
        return;
    }

    // Read Tile Id
    model._header._tileId[0] = decoder.getUint16Value();
    model._header._tileId[1] = decoder.getUint16Value();
    model._header._tileId[2] = decoder.getUint16Value();
    model._header._tileId[3] = decoder.getUint16Value();

    //NumTris
    model._header._numTris = decoder.getUint32Value();
    model._header._numChildren = decoder.getUint32Value();

    // Extent needs double check, not important for now
    model._header._minExtent = [
        decoder.getFloat64Value(),
        decoder.getFloat64Value(),
        decoder.getFloat64Value()
    ];
    model._header._maxExtent = [
        decoder.getFloat64Value(),
        decoder.getFloat64Value(),
        decoder.getFloat64Value()
    ];
    model._header._center = [ (model._header._maxExtent[0] + model._header._minExtent[0]) * 0.5,(model._header._maxExtent[1] + model._header._minExtent[1])*0.5,
    (model._header._maxExtent[2]+ model._header._minExtent[2])*0.5];

    for (var i = 0; i < model._header._numChildren; i++) {
            var tileId = new Uint16Array(4);
            tileId[0] = decoder.getUint16Value();
            tileId[1] = decoder.getUint16Value();
            tileId[2] = decoder.getUint16Value();
            tileId[3] = decoder.getUint16Value();
            model._children[i] = tileId;
    }

    var indicesSize = decoder.getUint32Value();
    var indices = new Uint32Array(decoder.decodeArray(indicesSize * 4).buffer);
    var verticesSize = decoder.getUint32Value() * 3.0;
    var vertices = new Uint16Array(decoder.decodeArray(verticesSize * 2).buffer);


    /*var normalsSize = decoder.getUint32Value() * 2.0;
    var normalsQuantized = new Uint8Array(decoder.decodeArray(normalsSize).buffer);
*/
    var colorSize = decoder.getUint32Value() * 3.0;
    var colors = new Uint8Array(decoder.decodeArray(colorSize).buffer);


    var message = {
        model : model,
        indices: indices,
        vertices: vertices,
        //normals: normalsQuantized,
        colors: colors
    };

    var transferables = [];
    transferables[0] = indices.buffer;
    transferables[1] = vertices.buffer;
    transferables[2] = colors.buffer;
    //transferables[2] = normalsQuantized.buffer;

    postMessage(message, transferables);


};

