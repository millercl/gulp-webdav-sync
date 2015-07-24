var chalk = require( 'chalk' )
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
  _options = {
    log: 'error'
  }

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
        _mkcol( uri, resume )
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
      function code_fn( statusCode ) {
        switch ( statusCode ) {
          case 102:
            return chalk.bgYellow.white
          case 200:
          case 201:
          case 204:
            return chalk.bgGreen.white
          case 207:
            return chalk.bgWhite.black
          case 403:
          case 409:
          case 412:
          case 415:
          case 422:
          case 423:
          case 424:
          case 502:
          case 507:
            return chalk.bgRed.white
          default:
            return chalk.bgWhite.black
        }
      }
      function msg_fn( statusMessage ) {
        switch ( statusMessage ) {
          case 102:
            return chalk.yellow
          case 200:
          case 201:
          case 204:
            return chalk.green
          case 207:
            return chalk.white
          case 403:
          case 409:
          case 412:
          case 415:
          case 422:
          case 423:
          case 424:
          case 502:
          case 507:
            return chalk.red
          default:
            return chalk.white
        }
      }
      var from = chalk.underline.cyan( vinyl.path )
      var to = chalk.underline.cyan( uri )
      var code =
        code_fn( res.statusCode ).call( this, res.statusCode )
      var msg =
        msg_fn( res.statusCode ).call( this, http.STATUS_CODES[res.statusCode] )
      log.info( from, '->', to )
      log.info( code, msg )
    }
  }
  return stream
}

function _delete( uri, callback ) {
}

function _get( uri, vinyl, callback ) {
}

function _gulp_prefix() {
  return '[' + chalk.grey( ( new Date() ).toLocaleTimeString() ) + ']'
}

var log = ( function () {
  var methods = [ 'error', 'warn', 'info', 'log' ]
  var _log = {}
  methods.forEach( function ( element, index, array ) {
    _log[element] = function () {
      if ( index <= methods.indexOf( _options.log ) ) {
        console[element].apply( this, arguments )
      }
    }
  } )
  return _log
} )()

function _mkcol( uri, callback ) {
  var options, req
  options = underscore.extend( _options, url.parse( uri ) )
  options.method = 'MKCOL'
  req = http.request( options, callback )
  req.on( 'error', _on_error )
  req.end()
}

function _on_error( error ) {
  stream.emit( 'error', error )
}

function _propfind( uri, callback ) {
}

function _proppatch( uri, props, callback ) {
}

function _put( uri, vinyl, callback ) {
  var options, req
  options = underscore.extend( _options, url.parse( uri ) )
  options.method = 'PUT'
  req = http.request( options, callback )
  vinyl.pipe( req )
  req.on( 'error', _on_error )
}
