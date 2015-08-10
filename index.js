var chalk = require( 'chalk' )
var gutil = require( 'gulp-util' )
var http = require( 'http' )
var path = require( 'path' )
var Stream = require( 'stream' )
var underscore = require( 'underscore' )
var url = require( 'url' )

const PLUGIN_NAME = 'gulp-webdav-sync'
var stream
var _options

module.exports = function () {
  var _string
  _options = {
    'log': 'error'
    , 'logAuth': false
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
  if ( _options ) {
    if ( _options.protocol
      || _options.slashes
      || _options.auth
      || _options.port
      || _options.hostname
      || _options.pathname
      ) {
      if ( !_options.protocol ) {
        _options.protocol = 'http:'
      }
      if ( !_options.host && !_options.hostname ) {
        _options.hostname = 'localhost'
      }
      if ( !_options.pathname ) {
        _options.pathname = '/'
      }
    }
  }
  stream = new Stream.Transform( { objectMode: true } )
  stream._transform = function ( vinyl, encoding, callback ) {
    init()

    function init() {
      const FN_NAME = 'main#init'
      var target_uri
      try {
        var href
        if ( _string ) {
          href = _string
        } else {
          href = url.format( _options )
        }
        log.log( _gulp_prefix( FN_NAME + '$href' ), href )
        target_uri = _splice_target(
            vinyl.path
          , path.resolve( _options.parent )
          , href
        )
      } catch ( error ) {
        _on_error( error )
        callback( null, vinyl )
        return
      }
      log.log( _gulp_prefix( FN_NAME + '$target_uri' ), target_uri )
      _info_target( vinyl, target_uri )
      if ( vinyl.isBuffer() ) {
        _put( target_uri, vinyl, resume )
        return
      }
      if ( vinyl.isNull() ) {
        _mkcol( target_uri, resume )
        return
      }
      if ( vinyl.isStream() ) {
        _put( target_uri, vinyl, resume )
        return
      }
      callback( null, vinyl )
    }

    function resume( res ) {
      if ( res ) {
        _info_status( res )
      }
      callback()
    }

  }
  return stream
}

function _align_right() {
  var max = underscore.chain( arguments )
    .map( function ( x ) {
      return x.length
    } )
    .max()
    .value()
  return underscore.map(
      arguments
    , function ( x ) {
        var diff = max - x.length
        var pref = []
        underscore.times(
            diff
          , function () {
              pref.push( ' ' )
            }
        )
        pref.push( x )
        return pref.join( '' )
      }
  )
}

function _colorcode_statusCode_fn( statusCode ) {
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

function _colorcode_statusMessage_fn( statusMessage ) {
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

function _info_status( res ) {
  var code =
    _colorcode_statusCode_fn( res.statusCode )
      .call( this, res.statusCode )
  var msg =
    _colorcode_statusMessage_fn( res.statusCode )
      .call( this, http.STATUS_CODES[res.statusCode] )
  log.info( '  ', code, msg )
}

function _info_target( vinyl, uri ) {
  if ( _options.logAuth !== true ) {
    uri = _strip_url_auth( uri )
  }
  var from = chalk.underline.cyan( vinyl.path )
  var to = chalk.underline.cyan( uri )
  log.info( '  ', _align_right( to, from )[1] )
  log.info( '  ', _align_right( to, from )[0] )
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

function _splice_target( vinyl_path, parent_dir, href ) {
  const FN_NAME = '#_splice_target'
  var error
  var target_stem = ''
  log.log( _gulp_prefix( FN_NAME + '$vinyl_path' ), vinyl_path )
  log.log( _gulp_prefix( FN_NAME + '$parent_dir' ), parent_dir )
  if ( vinyl_path.length < parent_dir.length ) {
    error = new gutil.PluginError(
        PLUGIN_NAME
      , 'Incoherent Target: options.parent too long.\n'
      + '\tpath is ' + chalk.red( vinyl_path ) + '\n'
      + '\tparent is ' + chalk.red( parent_dir ) + '\n'
    )
    error.vinyl_path = vinyl_path
    error.parent = parent_dir
    throw error
  }
  if ( vinyl_path.substr( 0, parent_dir.length ) === parent_dir ) {
    target_stem = vinyl_path.substr( parent_dir.length+1 )
  } else {
    error = new gutil.PluginError(
        PLUGIN_NAME
      , 'Incoherent Target: paths diverge.\n'
      + '\tpath is ' + chalk.red( vinyl_path ) + '\n'
      + '\tparent is ' + chalk.red( parent_dir ) + '\n'
    )
    error.vinyl_path = vinyl_path
    error.parent = parent_dir
    throw error
  }
  log.log( _gulp_prefix( FN_NAME + '$target_stem' ), target_stem )
  if ( !href ) {
    href = ''
  }
  return href + target_stem
}

function _strip_url_auth( href ) {
  var strip = url.parse( href )
  strip.auth = null
  return strip.format()
}
