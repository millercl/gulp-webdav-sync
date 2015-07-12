var gutil = require( 'gulp-util' )
var http = require( 'http' )
var through2 = require( 'through2' )
var url = require( 'url' )

const PLUGIN_NAME = 'gulp-webdav-sync'

module.exports = function ( i ) {
  return through2.obj( function ( vinyl, encoding, callback ) {
    gutil.log( vinyl.path, vinyl.isNull() )
    return callback( null, vinyl )
  } )
}
