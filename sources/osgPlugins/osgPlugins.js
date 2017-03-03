'use strict';
var ReaderWriterGLTF = require( 'osgPlugins/ReaderWriterGLTF' );
var ReaderWriterZIP = require( 'osgPlugins/ReaderWriterZIP' );
var ReaderWriterPotree = require( 'osgPlugins/ReaderWriterPotree' );

var osgPlugins = {};

osgPlugins.ReaderWriterGLTF = ReaderWriterGLTF;
osgPlugins.ReaderWriterPotree = ReaderWriterPotree;
osgPlugins.ReaderWriterZIP = ReaderWriterZIP;

module.exports = osgPlugins;
