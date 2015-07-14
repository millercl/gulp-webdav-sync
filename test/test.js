var assert = require( 'assert' )
var dav = require( 'jsDAV' )
var del = require( 'del' )
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
      var srv = dav.createServer( opt, uri.port, uri.hostname )
      process.nextTick( function () {
        done()
      } )
    } )
  } )
  afterEach( function () {
    del( path.join( node, '*' ) )
  } )
  after( function () {
    if ( fs.existsSync( node ) ) {
      fs.rmdirSync( node )
    }
  } )

  describe( '#mkdir', function () {
    it( 'Should create a directory on the server when vinyl.isNull().'
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

} )
