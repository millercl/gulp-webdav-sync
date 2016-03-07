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
    , value: function ( dest ) {
      if ( dest === undefined || dest === null ) {
        throw new TypeError( 'Cannot convert first argument to object' )
      }
      var to = Object( dest )
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

module.exports = function () {
  var _string
  var codes = []
  var _options = {
    'base': process.cwd()
    , 'clean': false
    , 'headers': { 'User-Agent': PLUGIN_NAME + '/' + VERSION }
    , 'list': 'dest'
    , 'log': 'error'
    , 'logAuth': false
    , 'uselastmodified': 1000
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
  var log = new Log( _options )
  _info_dest( href, _options )
  if ( _options.agent === undefined ) {
    var agent = url.parse( href ).protocol === 'https:'
      ? new https.Agent( _options )
      : new http.Agent( { 'keepAlive': true } )
    _options.agent = agent
  }
  function filter_on_href( list, urlpath ) {
    return list
      .filter( function ( element ) {
        if ( element.href ) {
          var w_slash = url.resolve( href, element.href ) === urlpath + '/'
          var wo_slash = url.resolve( href, element.href ) === urlpath
          if ( w_slash || wo_slash ) {
            return true
          }
        }
        return false
      } )
  }

  stream = new Stream.Transform( { objectMode: true } )
  stream._transform = function ( vinyl, encoding, callback ) {
    if ( vinyl.event ) {
      log.var( '$vinyl.event', vinyl.event )
    } else {
      vinyl.event = null
    }
    var dest_url
    var dest_stem
    var dest_propfind = {}
    var server_date
    try {
      dest_url = _splice_dest(
          vinyl.path
        , path.resolve( _options.base )
        , href
        , _options
      )
      dest_stem = _splice_dest_stem(
          vinyl.path
        , path.resolve( _options.base )
        , href
        , _options
      )
    } catch ( error ) {
      _on_error( error )
      callback( null, vinyl )
      return
    }
    log.var( '$dest_url', _strip_url_auth( dest_url ) )
    if ( _options.list === 'dest' ) {
      _propfind( dest_url, 0, _options, function ( res, dom ) {
        if ( res.statusCode === 207 ) {
          dest_propfind = _xml_parse( dom )[0]
          log.var( '$dest_propfind' )
          log.var( ' .getcontentlength', dest_propfind.getcontentlength )
          log.var( ' .getlastmodified', dest_propfind.getlastmodified )
          log.var( ' .stat', dest_propfind.stat )
          log.var( ' .resourcetype', dest_propfind.resourcetype )
        }
        if ( res.headers.date ) {
          server_date = new Date( res.headers.date )
        }
        init()
      } )
    } else {
      init()
    }

    function init() {
      function times_are_comparable() {
        return dest_propfind.getlastmodified && vinyl.stat && vinyl.stat.ctime
      }
      function server_is_synchronized() {
        var now = new Date()
        var tolerance = _options.uselastmodified
        var interval_end = new Date( server_date.getTime() + tolerance )
        var within_interval = interval_end.getTime() > now.getTime()
        log.var( '$server_date', server_date.getTime() )
        log.var( '$now        ', now.getTime() )
        log.var( '$within_interval', within_interval )
        return within_interval
      }
      function ctime_is_newer() {
        var tolerance = _options.uselastmodified
        var ctime = vinyl.stat
          ? vinyl.stat.ctime.getTime()
          : null
        var lastmodified = dest_propfind.getlastmodified
          ? dest_propfind.getlastmodified.getTime()
          : null
        var newer = ctime > lastmodified
        log.var( '$ctime', ctime )
        log.var( '$lastmodified', lastmodified )
        log.var( '$newer', newer )
        return newer
      }
      var list = dest_propfind ? [ dest_propfind ] : []
      var path_
      if ( dest_url === href ) {
        callback()
        return
      }
      if ( vinyl.event === 'unlink'  || _options.clean ) {
        _delete( dest_url, _options, resume )
        return
      }
      if ( vinyl.isNull() ) {
        dest_stem += '/'
        if ( vinyl.stat && !vinyl.stat.isDirectory() ) {
          log.warn(
              _gulp_prefix( 'warn' )
            , vinyl.path + ' is not a directory.'
          )
        }
        path_ = filter_on_href( list, dest_url )
        if ( path_.length === 1 ) {
          resume( { statusCode: path_[0].stat } )
        } else {
          _mkcol( dest_url, _options, resume )
        }
        return
      }
      if ( vinyl.isBuffer() || vinyl.isStream() ) {
        if ( _options.uselastmodified && times_are_comparable() ) {
          if ( server_is_synchronized() && ctime_is_newer() ) {
            _put( dest_url, vinyl, _options, resume )
            return
          } else {
            resume( { statusCode: dest_propfind.stat } )
            return
          }
        } else {
          _put( dest_url, vinyl, _options, resume )
          return
        }
      }
      callback( null, vinyl )
    }

    function resume( res ) {
      if ( res ) {
        if ( codes.indexOf( res.statusCode ) === -1 ) {
          codes.push( res.statusCode )
        }
        _info_status( res.statusCode, dest_stem, _options )
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
      var dest_url = _splice_dest(
            glob_watcher.path
          , path.resolve( _options.base )
          , href
          , _options
      )
      var dest_stem = _splice_dest_stem(
            glob_watcher.path
          , path.resolve( _options.base )
          , href
          , _options
      )
      _delete( dest_url, _options, function ( res ) {
        if ( codes.indexOf( res.statusCode ) === -1 ) {
          codes.push( res.statusCode )
        }
        _info_status( res.statusCode, dest_stem, _options )
        _info_status_code( codes, _options )
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
    _propfind( href, 1, _options, function ( res, dom ) {
      var url_paths = _xml_to_url_a( dom )
      url_paths = url_paths.filter(
        function ( url_path ) {
          return url.resolve( href, url_path ) !== href
        }
      )
      function recursive_delete( url_paths ) {
        if ( url_paths.length > 0 ) {
          var element = url_paths.pop()
          _delete( url.resolve( href, element )
            , _options
            , function ( res ) {
                if ( codes.indexOf( res.statusCode ) === -1 ) {
                  codes.push( res.statusCode )
                }
                _info_status( res.statusCode, element, _options )
                recursive_delete( url_paths )
              }
          )
        } else {
          _info_status_code( codes, _options )
          if ( callback ) {
            callback()
          }
        }
      }
      recursive_delete( url_paths )
    } )
  }
  stream.on( 'finish', function () {
    _info_status_code( codes, _options )
  } )
  return stream
}

function _colorcode_statusCode_fn( statusCode ) {
  switch ( statusCode ) {
    case 102:
      return chalk.bgYellow.white
    case 200:
      return chalk.bgWhite.black
    case 201:
      return chalk.bgGreen.white
    case 204:
      return chalk.bgYellow.white
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
      return chalk.white
    case 201:
      return chalk.green
    case 204:
      return chalk.yellow
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

function _delete( href, _options, callback ) {
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

function _filter_collection( resrc ) {
  if ( resrc.resourcetype && resrc.resourcetype === 'collection' ) {
    return true
  }
  return false
}

function _get( href, _options, callback ) {
  var options, req, client
  options = Object.assign(
      {}
    , _options
    , url.parse( href )
  )
  client = _if_tls( options.protocol )
  req = client.request( options, callback )
  req.on( 'error', _on_error )
  req.end()
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

function _info_status( statusCode, string, _options ) {
  var log = new Log( _options )
  var code =
    _colorcode_statusCode_fn( statusCode )
      .call( this, statusCode )
  log.info( _gulp_prefix(), code, string )
}

function _info_status_code( codes, _options ) {
  codes = codes.filter( function ( code ) {
    return !( code === 200 || code === 404 )
  } )
  codes.sort().forEach( function ( element ) {
    _info_code( element, _options )
  } )
}

function _info_code( statusCode, _options ) {
  var log = new Log( _options )
  var code =
    _colorcode_statusCode_fn( statusCode )
      .call( this, statusCode )
  var msg =
    _colorcode_statusMessage_fn( statusCode )
      .call( this, http.STATUS_CODES[statusCode] )
  log.info( _gulp_prefix(), code, msg )
}

function _info_dest( href, _options ) {
  var log = new Log( _options )
  if ( _options.logAuth !== true ) {
    href = _strip_url_auth( href )
  }
  var to = chalk.blue( href )
  log.info( _gulp_prefix(), to )
}

var Log = function ( _options ) {
  var methods = [ 'error', 'warn', 'info', 'log' ]
  var _log = {}
  methods.forEach( function ( element, index, array ) {
    _log[element] = function () {
      if ( index <= methods.indexOf( _options.log ) ) {
        console[element].apply( this, arguments )
      }
    }
  } )
  _log.var = function () {
    var args = Array.prototype.slice.call( arguments )
    var last = args.length > 1 ? args.pop() : ''
    _log.log( _gulp_prefix( 'log' ), chalk.grey( args.join( ' ' ) ), last )
  }
  return _log
}

function _mkcol( href, _options, callback ) {
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

function _propfind( href, depth, _options, callback ) {
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

function _proppatch( href, props, _options, callback ) {
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

function _put( href, vinyl, _options, callback ) {
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

function _splice_dest( vinyl_path, base_dir, href, _options ) {
  var error
  var dest_stem = ''
  var log = new Log( _options )
  log.var( '$vinyl_path', vinyl_path )
  log.var( '$base_dir', base_dir )
  if ( vinyl_path.length < base_dir.length ) {
    error = new gutil.PluginError(
        PLUGIN_NAME
      , 'Incoherent Target: options.base too long.\n'
      + '\tpath is ' + chalk.red( vinyl_path ) + '\n'
      + '\tbase is ' + chalk.red( base_dir ) + '\n'
    )
    error.vinyl_path = vinyl_path
    error.base = base_dir
    throw error
  }
  dest_stem = _splice_dest_stem( vinyl_path, base_dir, href, _options )
  if ( !href ) {
    href = ''
  }
  return url.resolve( href, dest_stem )
}

function _splice_dest_stem( vinyl_path, base_dir, href, _options ) {
  var error
  var dest_stem
  var log = new Log( _options )
  if ( vinyl_path.substr( 0, base_dir.length ) === base_dir ) {
    dest_stem = vinyl_path.substr( base_dir.length+1 )
  } else {
    error = new gutil.PluginError(
        PLUGIN_NAME
      , 'Incoherent Target: paths diverge.\n'
      + '\tpath is ' + chalk.red( vinyl_path ) + '\n'
      + '\tbase is ' + chalk.red( base_dir ) + '\n'
    )
    error.vinyl_path = vinyl_path
    error.base = base_dir
    throw error
  }
  return dest_stem
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
          var resourcetype = response.propstat[0].prop[0].resourcetype
          if ( resourcetype ) {
            if ( typeof resourcetype[0] === 'string' ) {
              resource.resourcetype = null
            } else
            if ( typeof resourcetype[0] === 'object' ) {
              resource.resourcetype = Object.keys( resourcetype[0] )[0]
            }
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
