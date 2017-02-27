'use strict';
var P = require( 'bluebird' );
var requestFile = require( 'osgDB/requestFile.js' );
var Notify = require( 'osg/notify' );
var Registry = require( 'osgDB/Registry' );
var ReaderParser = require( 'osgDB/readerParser' );
var FileHelper = require( 'osgDB/FileHelper' );
var JSZip = window.JSZip;

var ReaderWriterPOTREE = function () {
    this._options = undefined;
    this._filesMap = new window.Map();
    this._fileName = ''; // The file containing the model of the archive ( gltf, glb, osgjs, b3dm, etc )
    this._pco = new PointCloudOctree();
    this._binaryDecoder = new BinaryDecoder();
};

var PointCloudOctree = function( ){
    this.version = undefined;
    this.spacing = 0;
    this.hierarchyStepSize = 0;
    this.pointAttributes = undefined;
    this.projection = undefined;
    this.boundingBox = undefined;
    this.tightBoundingBox = undefined;
    this.boundingSphere = undefined;
    this.tightBoundingSphere = undefined;
    this.offset = undefined;
};

ReaderWriterPotree.prototype = {

    readNodeURL: function ( url, options ) {
        var defer = P.defer();
        if ( options && options.databasePath !== undefined ) {
            this._databasePath = options.databasePath;
        }

        var self = this;

        var filePromise = requestFile( url );

        filePromise.then( function ( file ) {
            defer.resolve( self.readCloudFile( file ) );
        } );
        return defer.promise;
    },
    readCloudFile: function( file ){
        var cloudJson = JSON.parse( file );
        this._pco.version = cloudJson.version;
        this._pco.spacing = cloudJson.spacing;
        this._pco.hierarchyStepSize = cloudJson.hierarchyStepSize;

        return this.readRootTile( tilesetJson.root );
    },
    readHierarchyFile: function( hrcFile ){

    },

    readRootTile: function( cloudJson ){

    },
};

Registry.instance().addReaderWriter( 'pot', new ReaderWriterPOTREE() );

module.exports = ReaderWriterPOTREE;
