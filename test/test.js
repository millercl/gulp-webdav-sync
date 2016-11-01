// gulp-webdav-sync, a webdav client as a gulp plugin
// Copyright (C) 2016 by Christopher Miller

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Additional permision is granted to reference this software
// by name and version from within other works without requiring
// such works to adopt the GNU General Public License, so long as
// such works do not require this software for mere user operation
// of such works. That is, you may require this software as a
// "devDependency" in your package.json without creating a new work
// in which this software is a necessary component.

var assert = require( 'assert' )
var dav = require( 'jsDAV' )
var del = require( 'del' )
var fs = require( 'fs' )
var merge = require( 'merge-stream' )
var mod = require( '../index' )
var net = require( 'net' )
var npmconf = require( 'npmconf' )
var os = require( 'os' )
var path = require( 'path' )
var rfc2518 = require( '../lib/rfc2518' )
var stream = require( 'stream' )
var tls = require( 'tls' )
var url = require( 'url' )
var Vinyl = require( 'vinyl' )
var xml2js = require( 'xml2js' )

const PLUGIN_NAME = 'gulp-webdav-sync'
const HREF = 'http://localhost:8000/'
const MOCK = 'mock'
const MSR_DIR = './test/assets/multistatus/'
const TEMP = 'tmp'
const TLS_PORT = 8443
const CA_CERT = './test/assets/openssl/certs/ca.pem'
const SRV_CERT = './test/assets/openssl/certs/localhost.pem'
const SRV_KEY = './test/assets/openssl/private/localhost.pem'

describe( PLUGIN_NAME
  , function () {
      var node, tls_tunnel
      before( function ( done ) {
        npmconf.load(
            null
          , function () {
                node = path.join( npmconf.loaded.prefix, TEMP )
                if ( !fs.existsSync( node ) ) {
                  fs.mkdirSync( node )
                }
                del.sync( path.join( node, '*' ) )
                var uri = url.parse( HREF )
                var opt = { node: node }
                var srv = dav.mount( opt )
                srv.listen(
                    uri.port
                  , uri.hostname
                  , function () {
                      start_tls( done )
                    }
                )
              }
        )
        function start_tls( done ) {
          var opt = {
            cert: fs.readFileSync( SRV_CERT )
            , key: fs.readFileSync( SRV_KEY )
          }
          tls_tunnel = tls.createServer(
              opt
            , function ( s ) {
                var c = net.connect( url.parse( HREF ).port )
                c.pipe( s )
                s.pipe( c )
                s.on( 'end'
                  , function () {
                      c.end()
                    }
                )
                c.on( 'end'
                  , function () {
                      s.end()
                    }
                )
              }
          )
          tls_tunnel.listen( TLS_PORT, done )
        }
      } )
      afterEach( function () {
        del.sync( path.join( node, '*' ) )
      } )
      after( function () {
        tls_tunnel.close()
        del.sync( node )
      } )

      describe( '#main'
        , function () {
            it( 'Should throw exception with "dav:" scheme'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                  } )
                  var uri = url.parse( HREF )
                  uri.protocol = 'dav:'
                  var unit = mod( uri.format() )
                  assert.throws(
                      function () {
                        unit.write( mock, null, validate )
                        unit.end()
                      }
                    , /not supported/
                  )
                  validate()
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_path )
                      , false
                      , 'file does not exist'
                    )
                    done()
                  }
                }
            )

            it( 'Should emit an "error" event on refused connection/closed port'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                  } )
                  var uri = url.parse( HREF )
                  var mal = {
                    protocol: uri.protocol
                    , slashes: uri.slashes
                    , auth: uri.auth
                    , port: 65535
                    , hostname: uri.hostname
                    , hash: uri.hash
                    , search: uri.search
                    , query: uri.query
                    , pathname: uri.pathname
                    , path: uri.path
                  }
                  var expected= new Error( 'connect ECONNREFUSED' )
                  expected.code = 'ECONNREFUSED'
                  expected.errno = 'ECONNREFUSED'
                  expected.syscall = 'connect'
                  var unit = mod( url.format( mal ) )
                  unit.on(
                      'error'
                    , function ( actual ) {
                        assert.equal(
                            actual.code
                          , expected.code
                          , 'error is ECONNREFUSED' )
                        validate()
                      }
                  )
                  unit.write( mock, null, null )
                  unit.end()
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_path )
                      , false
                      , 'file does not exist'
                    )
                    done()
                  }
                }
            )

            it( 'Should emit an "error" event when "base" and filepaths diverge'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                  } )
                  var options = {
                    'base': os.tmpDir()
                  }
                  var unit = mod( options, HREF )
                  unit.on(
                      'error'
                    , function ( actual ) {
                        assert(
                            /paths diverge/.test( actual )
                          , 'error is "paths diverge"'
                        )
                        validate()
                      }
                  )
                  unit.write( mock, null, null )
                  unit.end()
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_path )
                      , false
                      , 'file does not exist'
                    )
                    done()
                  }
                }
            )

            it( 'Should emit an "error" when "base" is longer than file path'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                  } )
                  var options = {
                    'base': path.join( process.cwd(), MOCK, '/', MOCK )
                  }
                  var unit = mod( options, HREF )
                  unit.on(
                      'error'
                    , function ( actual ) {
                        assert(
                            /too long/.test( actual )
                          , 'error is "too long"'
                        )
                        validate()
                      }
                  )
                  unit.write( mock, null, null )
                  unit.end()
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_path )
                      , false
                      , 'file does not exist'
                    )
                    done()
                  }
                }
            )

            it( 'Should create a directory on the server when vinyl.isNull()'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                  } )
                  assert( mock.isNull(), 'vinyl.isNull()' )
                  var options = {
                  }
                  var unit = mod( HREF, options )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), 'directory exists' )
                    done()
                  }
                }
            )

            it( 'Should not create a dir when vinyl.isNull() and status 200 OK'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var expected_dir = path.join( node, MOCK )
                  fs.mkdirSync( expected_dir )
                  assert( fs.existsSync( expected_dir ), 'dir exists' )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                  } )
                  assert( mock.isNull(), 'vinyl.isNull()' )
                  var options = {
                  }
                  var unit = mod( HREF, options )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), 'directory exists' )
                    done()
                  }
                }
            )

            it( 'Should create a file on the server when vinyl.isBuffer()'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                    , stat: { ctime: new Date() }
                  } )
                  assert( mock.isBuffer(), 'vinyl.isBuffer()' )
                  var unit = mod( HREF )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), 'file exists' )
                    assert.equal(
                        fs.readFileSync( expected_path ).toString()
                      , MOCK
                      , 'file contents'
                    )
                    done()
                  }
                }
            )

            it( 'Should create a file on the server when vinyl.isStream()'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var contents = new stream.Readable()
                  contents.push( MOCK )
                  contents.push( null )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: contents
                    , stat: { ctime: new Date() }
                  } )
                  assert( mock.isStream(), 'vinyl.isStream()' )
                  var options = {
                  }
                  var unit = mod( HREF, options )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), 'file exists' )
                    assert.equal(
                        fs.readFileSync( expected_path ).toString()
                      , MOCK
                      , 'file contents'
                    )
                    done()
                  }
                }
            )

            it( 'Should create a file from URL object in options'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                    , stat: { ctime: new Date() }
                  } )
                  assert( mock.isBuffer(), 'vinyl.isBuffer()' )
                  var uri = url.parse( HREF )
                  var unit = mod( uri )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), 'file exists' )
                    assert.equal(
                        fs.readFileSync( expected_path ).toString()
                      , MOCK
                      , 'file contents'
                    )
                    done()
                  }
                }
            )

            it( 'Should create a file from a partial URL object (port only)'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                    , stat: { ctime: new Date() }
                  } )
                  assert( mock.isBuffer(), 'vinyl.isBuffer()' )
                  var uri = url.parse( HREF )
                  var bon = {
                    port: uri.port
                  }
                  var unit = mod( bon )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), 'file exists' )
                    assert.equal(
                        fs.readFileSync( expected_path ).toString()
                      , MOCK
                      , 'file contents'
                    )
                    done()
                  }
                }
            )

            it( 'Should delete a file from a gulp-watch event'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var file = fs.openSync( expected_path, 'w' )
                  fs.writeSync( file, MOCK )
                  fs.closeSync( file )
                  assert( fs.existsSync( expected_path ), 'file exists' )
                  var options = {
                  }
                  var unit = mod( HREF, options )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                  } )
                  mock.event = 'unlink'
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_path )
                      , false
                      , 'file exists'
                    )
                    done()
                  }
                }
            )

            it( 'Should delete a directory from a gulp-watch event'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var file = fs.openSync( expected_path, 'w' )
                  fs.writeSync( file, MOCK )
                  fs.closeSync( file )
                  assert( fs.existsSync( expected_path ), 'file exists' )
                  var options = {
                  }
                  var unit = mod( HREF, options )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                  } )
                  mock.event = 'unlink'
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_path )
                      , false
                      , 'file exists'
                    )
                    done()
                  }
                }
            )

            it( 'Should clean files on option'
              , function ( done ) {
                  var expected_file = path.join( node, 'file' )
                  var expected_dir = path.join( node, 'dir' )
                  var expected_sub = path.join( node, 'dir/file' )
                  var file = fs.openSync( expected_file, 'w' )
                  fs.writeSync( file, MOCK )
                  fs.closeSync( file )
                  fs.mkdirSync( expected_dir )
                  var sub = fs.openSync( expected_sub, 'w' )
                  fs.writeSync( sub, MOCK )
                  fs.closeSync( sub )
                  assert( fs.existsSync( expected_file ), 'file exists' )
                  assert( fs.existsSync( expected_dir ), 'dir exists' )
                  assert( fs.existsSync( expected_sub ), 'sub exists' )
                  var mock_file = new Vinyl( { path: path.resolve( 'file' ) } )
                  var mock_dir = new Vinyl( { path: path.resolve( 'dir' ) } )
                  var mock_sub = new Vinyl(
                      { path: path.resolve( 'dir/file' ) }
                  )
                  var options = {
                    clean: true
                  }
                  var unit = mod( HREF, options )
                  unit.write(
                      mock_file
                      , null
                      , function () {
                          unit.write(
                              mock_dir
                            , null
                            , function () {
                                unit.write( mock_sub, null, validate )
                              }
                          )
                        }
                  )
                  function validate() {
                    unit.end()
                    assert.equal(
                        fs.existsSync( expected_file )
                      , false
                      , 'file exists'
                    )
                    assert.equal(
                        fs.existsSync( expected_dir )
                      , false
                      , 'dir exists'
                    )
                    assert.equal(
                        fs.existsSync( expected_sub )
                      , false
                      , 'sub exists'
                    )
                    done()
                  }
                }
            )

            it( 'Should https'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var options = {
                    ca: fs.readFileSync( CA_CERT )
                  }
                  var uri = url.parse( HREF )
                  var tls = {
                    protocol: 'https:'
                    , slashes: uri.slashes
                    , auth: uri.auth
                    , port: TLS_PORT
                    , hostname: uri.hostname
                    , hash: uri.hash
                    , search: uri.search
                    , query: uri.query
                    , pathname: uri.pathname
                    , path: uri.path
                  }
                  var hrefs = url.format( tls )
                  var unit = mod( hrefs, options )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                    , stat: { ctime: new Date() }
                  } )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), 'file exists' )
                    assert.equal(
                        fs.readFileSync( expected_path ).toString()
                      , MOCK
                      , 'file contents'
                    )
                    done()
                  }
                }
            )

            it( 'Should support concurrent calls w/ various options.base values'
              , function ( done ) {
                  var opt1 = {
                    base: process.cwd()
                    , log: 'error'
                  }
                  var opt2 = {
                    base: 'dir'
                    , log: 'error'
                  }
                  var mock1 = new Vinyl( {
                    path: path.resolve( MOCK + '1' )
                    , contents: new Buffer( MOCK )
                    , stat: { ctime: new Date() }
                  } )
                  var mock2 = new Vinyl( {
                    path: path.resolve( 'dir/' + MOCK + '2' )
                    , contents: new Buffer( MOCK )
                    , stat: { ctime: new Date() }
                  } )
                  var exp_path1 = path.join( node, MOCK + '1' )
                  var exp_path2 = path.join( node, MOCK + '2' )
                  var unit1 = mod( HREF, opt1 )
                  var unit2 = mod( HREF, opt2 )
                  assert.notEqual( unit1, unit2, 'different streams' )
                  var unit3 = merge( unit1, unit2 )
                  unit1.write( mock1, null, null )
                  unit2.write( mock2, null, null )
                  unit1.end()
                  unit2.end()
                  unit3.on( 'finish', validate )
                  function validate() {
                    assert( fs.existsSync( exp_path1 ), 'mock1 file exists' )
                    assert( fs.existsSync( exp_path2 ), 'mock2 file exists' )
                    assert.equal(
                        fs.readFileSync( exp_path1 ).toString()
                      , MOCK
                      , 'mock1 file contents'
                    )
                    assert.equal(
                        fs.readFileSync( exp_path2 ).toString()
                      , MOCK
                      , 'mock2 file contents'
                    )
                    done()
                  }
                }
            )

            it( 'Should accept current working dir\'s root for options.base'
              , function ( done ) {
                  var root = process.cwd().split( path.sep )[0] + path.sep
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                        path: path.resolve( root, MOCK )
                        , contents: new Buffer( MOCK )
                        , stat: { ctime: new Date() }
                      } )
                  assert( mock.isBuffer(), 'vinyl.isBuffer()' )
                  var options = {
                        log: 'error'
                        , base: root
                      }
                  var unit = mod( HREF, options )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), expected_path )
                    assert.equal(
                        fs.readFileSync( expected_path ).toString()
                      , MOCK
                      , 'file contents'
                    )
                    done()
                  }
                }
            )

            it( 'Should accept null string as cwd for options.base'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var mock = new Vinyl( {
                    path: path.resolve( MOCK )
                    , contents: new Buffer( MOCK )
                    , stat: { ctime: new Date() }
                  } )
                  assert( mock.isBuffer(), 'vinyl.isBuffer()' )
                  var options = {
                    log: 'error'
                    , base: ''
                  }
                  var unit = mod( HREF, options )
                  unit.write( mock, null, validate )
                  unit.end()
                  function validate() {
                    assert( fs.existsSync( expected_path ), expected_path )
                    assert.equal(
                        fs.readFileSync( expected_path ).toString()
                      , MOCK
                      , 'file contents'
                    )
                    done()
                  }
                }
            )

          }
      )

      describe( '#main().watch'
        , function () {

            it( 'Should delete a file from a glob-watcher event'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  var file = fs.openSync( expected_path, 'w' )
                  fs.writeSync( file, MOCK )
                  fs.closeSync( file )
                  assert( fs.existsSync( expected_path ), 'file exists' )
                  var options = {
                  }
                  var unit = mod( HREF, options )
                  var glob_watcher = {
                    type: 'deleted'
                    , path: path.resolve( MOCK )
                  }
                  unit.watch( glob_watcher, validate )
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_path )
                      , false
                      , 'file exists'
                    )
                    done()
                  }
                }
            )

            it( 'Should delete a directory from a glob-watcher event'
              , function ( done ) {
                  var expected_path = path.join( node, MOCK )
                  fs.mkdirSync( expected_path )
                  assert( fs.existsSync( expected_path ), 'dir exists' )
                  var options = {
                  }
                  var unit = mod( HREF, options )
                  var glob_watcher = {
                    type: 'deleted'
                    , path: path.resolve( MOCK )
                  }
                  unit.watch( glob_watcher, validate )
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_path )
                      , false
                      , 'file exists'
                    )
                    done()
                  }
                }
            )

          } )

      describe( '#main().clean'
        , function () {

            it( 'Should delete all files under target'
              , function ( done ) {
                  var expected_file = path.join( node, 'file' )
                  var expected_dir = path.join( node, 'dir' )
                  var expected_sub = path.join( node, 'dir/file' )
                  var file = fs.openSync( expected_file, 'w' )
                  fs.writeSync( file, MOCK )
                  fs.closeSync( file )
                  fs.mkdirSync( expected_dir )
                  var sub = fs.openSync( expected_sub, 'w' )
                  fs.writeSync( sub, MOCK )
                  fs.closeSync( sub )
                  assert( fs.existsSync( expected_file ), 'file exists' )
                  assert( fs.existsSync( expected_dir ), 'dir exists' )
                  assert( fs.existsSync( expected_sub ), 'sub exists' )
                  var options = {
                  }
                  var unit = mod( HREF, options )
                  unit.clean( validate )
                  function validate() {
                    assert.equal(
                        fs.existsSync( expected_file )
                      , false
                      , 'file exists'
                    )
                    assert.equal(
                        fs.existsSync( expected_dir )
                      , false
                      , 'dir exists'
                    )
                    assert.equal(
                        fs.existsSync( expected_sub )
                      , false
                      , 'sub exists'
                    )
                    done()
                  }
                }
            )

          }
      )

      describe( '#rfc2518.tr_207'
        , function () {
            var opt = {
                explicitCharkey: true
                , tagNameProcessors: [ xml2js.processors.stripPrefix ]
              }
            var files = fs.readdirSync( MSR_DIR )

            it( 'Should not throw exception during xml2js parsing'
              , function () {
                  files.forEach( parse )
                  function parse( file ) {
                    var content = fs.readFileSync( path.join( MSR_DIR, file ) )
                    assert.doesNotThrow(
                        function () {
                          xml2js.parseString( content, opt )
                        }
                      , file + ': xml2js.parseString call'
                    )
                  }
                }
            )

            it( 'Should accept dom w/ only href property on result'
              , function () {
                  var mock = {
                      multistatus: {
                          response: [
                              {
                                href: [
                                    { _: '/' }
                                ]
                              }
                          ]
                        }
                    }
                  var propfound = rfc2518.tr_207( mock )
                  assert( propfound, 'tr_207 return object' )
                  assert( propfound[0], 'first result' )
                  assert( propfound[0].href, 'href property on first result' )
                }
            )

            it( 'Should translate multistatus-response xml2js DOMs'
              , function () {
                  files.forEach( translate )
                  function translate( file ) {
                    var content = fs.readFileSync( path.join( MSR_DIR, file ) )
                    xml2js.parseString(
                        content
                      , opt
                      , function ( err, result ) {
                          assert.ifError( err )
                          var propfound = rfc2518.tr_207( result )
                          assert( propfound, 'tr_207 return object' )
                          assert(
                              propfound instanceof Array
                            , 'instanceof Array'
                          )
                          propfound.forEach( function ( r ) {
                            assert( 'href' in r, 'href attribute' )
                            assert( typeof r.href === 'string' )
                          } )
                        }
                    )
                  }
                }
            )

          }
      )

    }
)
