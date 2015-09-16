var chalk = require( 'chalk' )
var gutil = require( 'gulp-util' )
var http = require( 'http' )
var https = require( 'https' )
var path = require( 'path' )
var Stream = require( 'stream' )
if ( !Object.assign ) {
  Object.defineProperty( Object, 'assign', {
    configurable: true
    , enumerable: false
    , value: function ( target ) {
      if ( target === undefined || target === null ) {
        throw new TypeError( 'Cannot convert first argument to object' )
      }
      var to = Object( target )
      var nextSource
      for ( var i = 1 ; i < arguments.length ; i++ ) {
        nextSource = arguments[i]
        if ( nextSource === undefined || nextSource === null ) {
          continue
        }
        nextSource = Object( nextSource )
        var keysArray = Object.keys( Object( nextSource ) )
        keysArray.forEach( assignKey )
      }
      function assignKey( e, i, a ) {
        var nextKey = a[i]
        var desc = Object.getOwnPropertyDescriptor( nextSource, nextKey )
        if ( desc !== undefined && desc.enumerable ) {
          to[nextKey] = nextSource[nextKey]
        }
      }
      return to
    }
    , writable: true
  } )
}
var url = require( 'url' )
var xml2js = require( 'xml2js' )

const PLUGIN_NAME = 'gulp-webdav-sync'
const VERSION = require( './package.json' ).version
var stream
var _options

module.exports = function () {
  var _string
  _options = {
    'clean': false
    , 'headers': { 'User-Agent': PLUGIN_NAME + '/' + VERSION }
    , 'log': 'error'
    , 'logAuth': false
    , 'parent': process.cwd()
  }
  for ( var i in arguments ) {
    if ( typeof arguments[i] === 'string' ) {
      _string = arguments[i]
    }
    if ( typeof arguments[i] === 'object' && arguments[i] ) {
      Object.assign( _options, arguments[i] )
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
  var href
  if ( _string ) {
    href = _string
  } else
  if ( url.format( _options ) !== '' ) {
    href = url.format( _options )
  } else {
    href = 'http://localhost/'
  }
  _info_target( href )
  if ( _options.agent === undefined ) {
    var agent = url.parse( href ).protocol === 'https:'
      ? new https.Agent( _options )
      : new http.Agent( { 'keepAlive': true } )
    _options.agent = agent
  }

  stream = new Stream.Transform( { objectMode: true } )
  stream._transform = function ( vinyl, encoding, callback ) {
    if ( vinyl.event ) {
      log.var( '$vinyl.event', vinyl.event )
    } else {
      vinyl.event = null
    }
    var target_url
    var target_stem
    var target_propfind
    try {
      target_url = _splice_target(
          vinyl.path
        , path.resolve( _options.parent )
        , href
      )
      target_stem = _splice_target_stem(
          vinyl.path
        , path.resolve( _options.parent )
        , href
      )
    } catch ( error ) {
      _on_error( error )
      callback( null, vinyl )
      return
    }
    log.var( '$target_url', target_url )
    _propfind( target_url, 0, function ( res, dom ) {
      if ( res.statusCode === 207 ) {
        target_propfind = _xml_parse( dom )[0]
        log.var( '$target_propfind', '' )
        log.var( ' .getcontentlength', target_propfind.getcontentlength )
        log.var( ' .getlastmodified', target_propfind.getlastmodified )
        log.var( ' .stat', target_propfind.stat )
      } else {
        log.warn(
            _gulp_prefix( 'warn' )
          , _colorcode_statusCode_fn( res.statusCode )
          , 'PROPFIND ' + target_url
        )
      }
      init()
    } )

    function init() {
      function eq_target_stem( element ) {
        return url.resolve( href, element ) === target_url
      }
      function eq_target_stem_col( element ) {
        return url.resolve( href, element ) === target_url + '/'
      }
      function is_target( element, operator ) {
        if ( operator( url.resolve( href, element.href ) ) ) {
          return true
        } else {
          return false
        }
      }
      var list = target_propfind ? [ target_propfind ] : []
      var path_
      if ( target_url === href ) {
        callback()
        return
      }
      _info_path( target_stem )
      if ( vinyl.event === 'unlink' ) {
        _delete( target_url, resume )
        return
      }
      if ( _options.clean ) {
        _delete( target_url, resume )
        return
      }
      if ( vinyl.isBuffer() ) {
        _put( target_url, vinyl, resume )
        return
      }
      if ( vinyl.isNull() ) {
        if ( vinyl.stat && !vinyl.stat.isDirectory() ) {
          log.warn(
              _gulp_prefix( 'warn' )
            , vinyl.path + ' is not a directory.'
          )
        }
        path_ = list.filter(
            function ( element ) {
              return is_target( element, eq_target_stem_col )
            }
        )
        if ( path_.length === 1 ) {
          resume( { statusCode: path_[0].stat } )
        } else {
          _mkcol( target_url, resume )
        }
        return
      }
      if ( vinyl.isStream() ) {
        _put( target_url, vinyl, resume )
        return
      }
      callback( null, vinyl )
    }

    function resume( res ) {
      if ( res ) {
        _info_status( res.statusCode )
      }
      callback()
    }

  }
  stream.watch = function ( glob_watcher, callback ) {
    if ( typeof glob_watcher !== 'object'
         || !glob_watcher.type
         || !glob_watcher.path
       ) {
      throw new gutil.PluginError( PLUGIN_NAME, 'expected glob-watcher object' )
    }
    log.var( 'glob_watcher.path', glob_watcher.path )
    if ( glob_watcher.type === 'deleted' ) {
      var target_url = _splice_target(
            glob_watcher.path
          , path.resolve( _options.parent )
          , href
      )
      var target_stem = _splice_target_stem(
            glob_watcher.path
          , path.resolve( _options.parent )
          , href
      )
      _info_path( target_stem )
      _delete( target_url, function ( res ) {
        _info_status( res.statusCode )
        if ( callback && typeof callback === 'function' ) {
          callback()
        }
      } )
    } else {
      if ( callback && typeof callback === 'function' ) {
        callback()
      }
    }
  }
  stream.clean = function ( callback ) {
    _propfind( href, 1, function ( res, dom ) {
      var url_paths = _xml_to_url_a( dom )
      url_paths = url_paths.map(
        function ( url_path ) {
          return url.resolve( href, url_path )
        }
      ).filter(
        function ( url_path ) {
          return url_path !== href
        }
      )
      function recursive_delete( url_paths ) {
        if ( url_paths.length > 0 ) {
          _delete( url_paths.pop()
            , function ( res ) {
                _info_status( res.statusCode )
                recursive_delete( url_paths )
              }
          )
        } else {
          if ( callback ) {
            callback()
          }
        }
      }
      recursive_delete( url_paths )
    } )
  }
  return stream
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
    case 404:
    case 409:
    case 412:
    case 415:
    case 422:
    case 423:
    case 424:
    case 500:
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
    case 404:
    case 409:
    case 412:
    case 415:
    case 422:
    case 423:
    case 424:
    case 500:
    case 502:
    case 507:
      return chalk.red
    default:
      return chalk.white
  }
}

function _delete( href, callback ) {
  var options, req, client
  options = Object.assign(
      {}
    , _options
    , url.parse( href )
    , { method: 'DELETE' }
  )
  client = _if_tls( options.protocol )
  req = client.request( options, callback )
  req.on( 'error', _on_error )
  req.end()
}

function _get( href, vinyl, callback ) {
}

function _gulp_prefix() {
  function bracket( string ) {
    if ( typeof string === 'string' ) {
      return '[' + chalk.grey( string ) + ']'
    } else {
      return ''
    }
  }
  return [ PLUGIN_NAME ]
    .concat( Array.prototype.slice.call( arguments ) )
    .map( bracket )
    .join( ' ' )
}

function _if_tls( scheme ) {
  switch ( scheme ) {
    case 'http:':
      return http
    case 'https:':
      return https
    default:
      return http
  }
}

function _info_path( string ) {
  var out = string
  log.info( _gulp_prefix(), out )
}

function _info_status( statusCode ) {
  var code =
    _colorcode_statusCode_fn( statusCode )
      .call( this, statusCode )
  var msg =
    _colorcode_statusMessage_fn( statusCode )
      .call( this, http.STATUS_CODES[statusCode] )
  log.info( '  ', code, msg )
}

function _info_target( href ) {
  if ( _options.logAuth !== true ) {
    href = _strip_url_auth( href )
  }
  var to = chalk.blue( href )
  log.info( _gulp_prefix(), to )
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

log.var = function () {
  var args = Array.prototype.slice.call( arguments )
  var last = args.pop()
  log.log( _gulp_prefix( 'log' ), chalk.grey( args.join( ' ' ) ), last )
}

function _mkcol( href, callback ) {
  var options, req, client
  options = Object.assign(
      {}
    , _options
    , url.parse( href )
    , { method: 'MKCOL' }
  )
  client = _if_tls( options.client )
  req = client.request( options, callback )
  req.on( 'error', _on_error )
  req.end()
}

function _on_error( error ) {
  stream.emit( 'error', error )
}

function _propfind( href, depth, callback ) {
  var options, req, client
  options = Object.assign(
      {}
    , _options
    , url.parse( href )
    , { method: 'PROPFIND' }
    , { 'headers': { 'Depth': depth } }
  )
  client = _if_tls( options.protocol )
  req = client.request( options, function ( res ) {
    var content = ''
    res.on( 'data', function ( chunk ) {
      content += chunk
    } )
    res.on( 'end', function () {
      var opt = {
        explicitCharkey: true
        , tagNameProcessors: [ xml2js.processors.stripPrefix ]
      }
      xml2js.parseString( content, opt, function ( err, result ) {
        if ( err ) {
          _on_error( err )
        }
        callback( res, result )
      } )
    } )
  } )
  req.on( 'error', _on_error )
  req.end()
}

function _proppatch( href, props, callback ) {
  var options, xml, req
  options = Object.assign(
      {}
    , _options
    , url.parse( href )
    , { method: 'PROPPATCH' }
    , { headers: { 'Content-Type': 'text/xml; charset="utf-8"' } }
  )
  xml = ( new xml2js.Builder() ).buildObject( props )
  req = http.request( options, callback )
  req.on( 'error', _on_error )
  req.write( xml )
  req.end()
}

function _proppatch_( href, date, cb ) {
  var dom = {
    'd:propertyupdate': {
      $: {
        'xmlns:d': 'DAV:'
      }
      , 'd:set': {
          'd:prop': {
            'd:creationdate': date.toJSON()
            , 'd:resourcetype': { 'd:collection': null }
          }
        }
    }
  }
  _proppatch( href, dom, function ( res ) {
    cb( res )
  } )
}

function _put( href, vinyl, callback ) {
  var options, req, client
  options = Object.assign(
      {}
    , _options
    , url.parse( href )
    , { method: 'PUT' }
  )
  client = _if_tls( options.protocol )
  req = client.request( options, callback )
  vinyl.pipe( req )
  req.on( 'error', _on_error )
}

function _splice_target( vinyl_path, parent_dir, href ) {
  var error
  var target_stem = ''
  log.var( '$vinyl_path', vinyl_path )
  log.var( '$parent_dir', parent_dir )
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
  target_stem = _splice_target_stem( vinyl_path, parent_dir, href )
  if ( !href ) {
    href = ''
  }
  return url.resolve( href, target_stem )
}

function _splice_target_stem( vinyl_path, parent_dir, href ) {
  var error
  var target_stem
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
  return target_stem
}

function _strip_url_auth( href ) {
  var strip = url.parse( href )
  strip.auth = null
  return strip.format()
}

function _xml_to_url_a( dom ) {
  function href( element ) {
    return element.href
  }
  return _xml_parse( dom ).map( href )
}

function _xml_parse( dom ) {
  try {
    return dom.multistatus.response.map( function ( response ) {
      var href = response.href[0]
      var propstat = response.propstat[0]
      var prop = response.propstat[0].prop[0]
      var getlastmodified = response.propstat[0].prop[0].getlastmodified[0]
      var stat = response.propstat[0].status[0]
      var resource = {}
      resource.href = href._
      if ( propstat ) {
        if ( prop ) {
          var getcontentlength = response.propstat[0].prop[0].getcontentlength
          if ( getcontentlength ) {
            resource.getcontentlength = getcontentlength[0]._
          }
          if ( getlastmodified ) {
            resource.getlastmodified = new Date( getlastmodified._ )
          }
        }
        if ( stat ) {
          resource.stat = http_status_to_int( stat._ )
        }
      }
      return resource
    } )
  } catch ( error ) {
    _on_error( error )
  }
  return []
  function http_status_to_int( string ) {
    return Number( /\d{3}/.exec( string ) )
  }
}
