'use strict';

var BinaryDecoder = function() {
    this._u8array = undefined;
    this._offset = 0;
    this._littleEndian = false;
    this._view = undefined;
};

BinaryDecoder.prototype = {
    setLittleEndian: function(value) {
        this._littleEndian = value;
    },

    setBuffer: function(buffer) {
        this._u8array = buffer;
        this._offset = 0;
        this._view = new DataView(buffer);
    },

    getOffset: function() {
        return this._offset;
    },

    setOffset: function(offset) {
        this._offset = offset;
    },

    getFloat64Value: function() {
        var value = this._view.getFloat64(this._offset, this._littleEndian);
        this._offset += Float64Array.BYTES_PER_ELEMENT;
        return value;
    },

    getFloat32Value: function() {
        var value = this._view.getFloat32(this._offset, this._littleEndian);
        this._offset += Float32Array.BYTES_PER_ELEMENT;
        return value;
    },

    getUint32Value: function() {
        var value = this._view.getUint32(this._offset, this._littleEndian);
        this._offset += Uint32Array.BYTES_PER_ELEMENT;
        return value;
    },

    getUint16Value: function() {
        var value = this._view.getUint16(this._offset, this._littleEndian);
        this._offset += Uint16Array.BYTES_PER_ELEMENT;
        return value;
    },

    getUint8Value: function() {
        var value = this._view.getUint8(this._offset, this._littleEndian);
        this._offset += Uint8Array.BYTES_PER_ELEMENT;
        return value;
    },

    getInt32Value: function() {
        var value = this._view.getInt32(this._offset, this._littleEndian);
        this._offset += Int32Array.BYTES_PER_ELEMENT;
        return value;
    },

    getInt16Value: function() {
        var value = this._view.getInt16(this._offset, this._littleEndian);
        this._offset += Int16Array.BYTES_PER_ELEMENT;
        return value;
    },

    getInt8Value: function() {
        var value = this._view.getInt8(this._offset, this._littleEndian);
        this._offset += Int8Array.BYTES_PER_ELEMENT;
        return value;
    },

    decodeArray: function(size) {
        var array = new Uint8Array(this._u8array.slice(this._offset, this._offset + size));
        this._offset += size;
        return array;
    },

    decodeFloat16: function(value) {
        var exponent = (value & 0x7C00) >> 10,
            fraction = value & 0x03FF;
        return (value >> 15 ? -1 : 1) * (
            exponent ?
            (
                exponent === 0x1F ?
                fraction ? NaN : Infinity :
                Math.pow(2, exponent - 15) * (1 + fraction / 0x400)
            ) :
            6.103515625e-5 * (fraction / 0x400)
        );
    },

    decodeStringArray: function(size) {
        var str = '';
        for (var i = this._offset, len = this._offset + size; i < len; i++) {
            str += String.fromCharCode(this._view.getUint8(i));
        }
        this._offset += size;
        return str;
    }
};

export default BinaryDecoder;
