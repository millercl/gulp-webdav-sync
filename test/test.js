var assert = require( 'assert' )
var dav = require( 'jsDAV' )
var del = require( 'del' )
var es = require( 'event-stream' )
var fs = require( 'fs' )
var npm = require( 'npm' )
var os = require( 'os' )
var path = require( 'path' )
var unit = require( '../index' )
var url = require( 'url' )
var Vinyl = require( 'vinyl' )

const PLUGIN_NAME = 'gulp-webdav-sync'
const HREF = 'http://localhost:8000/'
const MOCK = 'mock'
const TEMP = 'tmp'

describe( PLUGIN_NAME, function () {
  before( function ( done ) {
    npm.load( null, function () {
      node = path.join( npm.config.prefix, TEMP )
      if ( !fs.existsSync( node ) ) {
        fs.mkdirSync( node )
      }
      var uri = url.parse( HREF )
      var opt = { node: node }
      var srv = dav.mount( opt )
      srv.listen( uri.port, uri.hostname, function () {
        done()
      } )
    } )
  } )
  afterEach( function () {
    del( path.join( node, '*' ) )
  } )
  after( function () {
    del( path.join( node, '**' ) )
    if ( fs.existsSync( node ) ) {
      fs.rmdirSync( node )
    }
  } )

  describe( '#mkdir', function () {
    it( 'Should create a file on the server when vinyl.isBuffer()'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl( { path: MOCK, contents: new Buffer( MOCK ) } )
          assert( mock.isBuffer(), 'vinyl.isBuffer()' )
          unit( HREF ).write( mock, null, validate )
          function validate() {
            assert( fs.existsSync( expected_path ), 'file exists' )
            done()
          }
        }
    )
  } )

  describe( '#mkdir', function () {
    it( 'Should create a directory on the server when vinyl.isNull()'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl( { path: MOCK } )
          assert( mock.isNull(), 'vinyl.isNull()' )
          unit( HREF ).write( mock, null, validate )
          function validate() {
            assert( fs.existsSync( expected_path ), 'directory exists' )
            done()
          }
        }
    )
  } )

  describe( '#mkdir', function () {
    it( 'Should create a file on the server when vinyl.isStream()'
      , function ( done ) {
          var expected_path = path.join( node, MOCK )
          var mock = new Vinyl
            ( { path: MOCK , contents: es.readArray( [ MOCK ] ) } )
          assert( mock.isStream(), 'vinyl.isStream()' )
          unit( HREF ).write( mock, null, validate )
          function validate() {
            assert( fs.existsSync( expected_path ), 'file exists' )
            done()
          }
        }
    )
  } )

} )
