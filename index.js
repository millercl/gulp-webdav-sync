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
    'log': 'error'
    , 'parent': process.cwd()
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
      uri = target( _string, vinyl )
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

    function target( href, vinyl ) {
      var vinyl_stem = ''
      var opt = path.resolve( _options.parent )
      log.log( _gulp_prefix( 'main#target$opt' ), opt )
      if ( vinyl.path.length < opt.length ) {
        _on_error(
          new gutil.PluginError(
              PLUGIN_NAME
            , 'Incoherent Target: options.parent too long.\n'
            + '\tvinyl.path is ' + vinyl.path + '\n'
            + '\toptions.parent is ' + opt + '\n'
          )
        )
      }
      if ( vinyl.path.substr( 0, opt.length ) === opt ) {
        vinyl_stem = vinyl.path.substr( opt.length+1 )
      } else {
        _on_error(
          new gutil.PluginError(
              PLUGIN_NAME
            , 'Incoherent Target: paths diverge.\n'
            + '\tvinyl.path is ' + vinyl.path + '\n'
            + '\toptions.parent is ' + opt + '\n'
          )
        )
      }
      log.log( _gulp_prefix( 'main#target$vinyl_stem' ), vinyl_stem )
      if ( href && path.toString() !== '' ) {
        return href + vinyl_stem
      }
      if ( npmconf.loaded.sources.global ) {
        href = npmconf.loaded.sources.global.data.dav
      }
      if ( npmconf.loaded.sources.user ) {
        href = npmconf.loaded.sources.user.data.dav
      }
      if ( npmconf.loaded.sources.project ) {
        href = npmconf.loaded.sources.project.data.dav
      }
      return href + vinyl_stem
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
      log.info( from )
      log.info( '-->', to )
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
  var time = '[' + chalk.grey( ( new Date() ).toLocaleTimeString() ) + ']'
  var name = '[' + chalk.grey( PLUGIN_NAME ) + ']'
  var item = chalk.grey( arguments[0] )
  return [ time, name, item ].join( ' ' )
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
  options = underscore.extend(
      _options
    , url.parse( uri )
    , { method: 'MKCOL' }
  )
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
  options = underscore.extend(
      _options
    , url.parse( uri )
    , { method: 'PUT' }
  )
  req = http.request( options, callback )
  vinyl.pipe( req )
  req.on( 'error', _on_error )
}
