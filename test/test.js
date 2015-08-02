var assert = require( 'assert' )
var dav = require( 'jsDAV' )
var del = require( 'del' )
var es = require( 'event-stream' )
var fs = require( 'fs' )
var mod = require( '../index' )
var npmconf = require( 'npmconf' )
var os = require( 'os' )
var path = require( 'path' )
var url = require( 'url' )
var Vinyl = require( 'vinyl' )

const PLUGIN_NAME = 'gulp-webdav-sync'
const HREF = 'http://localhost:8000/'
const MOCK = 'mock'
const TEMP = 'tmp'

describe( PLUGIN_NAME, function () {
  var node
  before( function ( done ) {
    npmconf.load( null, function () {
      node = path.join( npmconf.loaded.prefix, TEMP )
      if ( !fs.existsSync( node ) ) {
        fs.mkdirSync( node )
      }
      del.sync( path.join( node, '*' ) )
      var uri = url.parse( HREF )
      var opt = { node: node }
      var srv = dav.mount( opt )
      srv.listen( uri.port, uri.hostname, function () {
        done()
      } )
    } )
  } )
  afterEach( function () {
    del.sync( path.join( node, '*' ) )
  } )
  after( function () {
    del.sync( node )
  } )

  describe( '#main', function () {
    it( 'Should throw exception with "dav:" scheme'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl( {
            path: path.resolve( MOCK )
            , contents: new Buffer( MOCK )
          } )
          var uri = url.parse( HREF )
          uri.protocol = 'dav:'
          assert.throws(
              function () {
                mod( uri.format() ).write( mock, null, validate )
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

    it( 'Should emit an "error" event on refused connection ( closed port )'
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
            , port: 65536
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
          unit.on( 'error', function ( actual ) {
            assert.deepEqual( actual, expected, 'error is ECONNREFUSED' )
            validate()
          } )
          unit.write( mock, null, null )
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

    it( 'Should emit an "error" event when "parent" and file paths diverge'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl( {
            path: path.resolve( MOCK )
            , contents: new Buffer( MOCK )
          } )
          var options = {
            'parent': os.tmpDir()
          }
          var unit = mod( options, HREF )
          unit.on( 'error', function ( actual ) {
            assert( /paths diverge/.test( actual ), 'error is "paths diverge"' )
            validate()
          } )
          unit.write( mock, null, null )
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

    it( 'Should emit an "error" event when "parent" is longer than file path'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl( {
            path: path.resolve( MOCK )
            , contents: new Buffer( MOCK )
          } )
          var options = {
            'parent': path.join( process.cwd()
            , MOCK, '/', MOCK )
          }
          var unit = mod( options, HREF )
          unit.on( 'error', function ( actual ) {
            assert( /too long/.test( actual ), 'error is "too long"' )
            validate()
          } )
          unit.write( mock, null, null )
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

  } )

  describe( '#_mkdir', function () {
    it( 'Should create a directory on the server when vinyl.isNull()'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl( {
            path: path.resolve( MOCK )
          } )
          assert( mock.isNull(), 'vinyl.isNull()' )
          var unit = mod( HREF )
          unit.write( mock, null, validate )
          function validate() {
            assert( fs.existsSync( expected_path ), 'directory exists' )
            done()
          }
        }
    )
  } )

  describe( '#_put', function () {
    it( 'Should create a file on the server when vinyl.isBuffer()'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl( {
            path: path.resolve( MOCK )
            , contents: new Buffer( MOCK )
          } )
          assert( mock.isBuffer(), 'vinyl.isBuffer()' )
          var unit = mod( HREF )
          unit.write( mock, null, validate )
          function validate() {
            assert( fs.existsSync( expected_path ), 'file exists' )
            done()
          }
        }
    )
    it( 'Should create a file on the server when vinyl.isStream()'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl( {
            path: path.resolve( MOCK )
            , contents: es.readArray( [ MOCK ] )
          } )
          assert( mock.isStream(), 'vinyl.isStream()' )
          var unit = mod( HREF )
          unit.write( mock, null, validate )
          function validate() {
            assert( fs.existsSync( expected_path ), 'file exists' )
            done()
          }
        }
    )
  } )

} )
