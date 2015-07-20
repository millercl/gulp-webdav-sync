var gutil = require( 'gulp-util' )
var http = require( 'http' )
var npmconf = require( 'npmconf' )
var path = require( 'path' )
var Stream = require( 'stream' )
var underscore = require( 'underscore' )
var url = require( 'url' )

const PLUGIN_NAME = 'gulp-webdav-sync'

module.exports = function () {
  _string = ''
  _options = {}

  for ( var i in arguments ) {
    if ( typeof arguments[i] === 'string' ) {
      _string = arguments[i]
    }
    if ( typeof arguments[i] === 'object' && arguments[i] ) {
      _options = underscore.extend( _options, arguments[i] )
    }
  }

  stream = new Stream.Transform( { objectMode: true } )
  stream._transform = function ( vinyl, encoding, callback ) {
    if ( !npmconf.loaded ) {
      npmconf.load( null, init )
    } else {
      init()
    }

    function init() {
      uri = target( _string )
      if ( vinyl.isBuffer() ) {
        _put( uri, vinyl, resume )
        return
      }
      if ( vinyl.isNull() ) {
        _mkdir( uri, resume )
        return
      }
      if ( vinyl.isStream() ) {
        _put( uri, vinyl, resume )
        return
      }
      callback( null, vinyl )
    }

    function target( path ) {
      if ( path && path.toString() !== '' ) {
        return path + vinyl.relative
      }
      var href
      if ( npmconf.loaded.sources.global ) {
        href = npmconf.loaded.sources.global.data.dav
      }
      if ( npmconf.loaded.sources.user ) {
        href = npmconf.loaded.sources.user.data.dav
      }
      if ( npmconf.loaded.sources.project ) {
        href = npmconf.loaded.sources.project.data.dav
      }
      return href + vinyl.relative
    }

    function resume( res ) {
      if ( res ) {
        report( res )
      }
      callback()
    }

    function report( res ) {
      gutil.log(
        uri
        , res.statusCode
        , http.STATUS_CODES[res.statusCode]
      )
    }
  }
  return stream
}

function _mkdir( uri, callback ) {
  var options, req
  options = underscore.extend( _options, url.parse( uri ) )
  options.method = 'MKCOL'
  req = http.request( options, callback )
  req.on( 'error', _on_error )
  req.end()
}

function _put( uri, vinyl, callback ) {
  var options, req
  options = underscore.extend( _options, url.parse( uri ) )
  options.method = 'PUT'
  req = http.request( options, callback )
  vinyl.pipe( req )
  req.on( 'error', _on_error )
}

function _on_error( error ) {
  stream.emit( 'error', error )
}
