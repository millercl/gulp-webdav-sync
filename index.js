var gutil = require( 'gulp-util' )
var http = require( 'http' )
var through2 = require( 'through2' )
var url = require( 'url' )

const PLUGIN_NAME = 'gulp-webdav-sync'

module.exports = function ( i ) {
  return through2.obj( function ( vinyl, encoding, callback ) {
    var uri = i + vinyl.relative
    this.pause()

    function report( res ) {
      gutil.log(
        uri
        , res.statusCode
        , http.STATUS_CODES[res.statusCode]
      )
    }

    if ( vinyl.isBuffer() ) {
      put( uri, vinyl, function ( res ) {
        report( res )
        callback()
      } )
      this.resume()
      return
    }

    if ( vinyl.isNull() ) {
      mkdir( uri, function ( res ) {
        report( res )
        callback()
      } )
      this.resume()
      return
    }

    if ( vinyl.isStream() ) {
      put( uri, vinyl, function ( res ) {
        report( res )
        callback()
      } )
      this.resume()
      return
    }

    callback( null, vinyl )
    this.resume()
  } )
}

function mkdir( uri, callback ) {
  var options, req
  options = url.parse( uri )
  options.method = 'MKCOL'
  req = http.request( options, function ( res ) {
    callback( res )
  } )
  req.on( 'error', function ( e ) {
    throw new gutil.PluginError( PLUGIN_NAME, e.toString() )
  } )
  req.end()
}

function put( uri, vinyl, callback ) {
  var options, req
  options = url.parse( uri )
  options.method = 'PUT'
  req = http.request( options, function ( res ) {
    callback( res )
  } )
  vinyl.pipe( req )
  req.on( 'error', function ( e ) {
  } )
}
