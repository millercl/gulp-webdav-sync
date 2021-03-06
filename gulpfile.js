// gulp-webdav-sync, a webdav client as a gulp plugin
// Copyright (C) 2016, 2017 by Christopher Miller

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

var debug = require( 'gulp-debug' )
var del = require( 'del' )
var dav = require( './index.js' )
var fs = require( 'fs' )
var gulp = require( 'gulp' )
var jscs = require( 'gulp-jscs' )
var jsdav = require( 'jsDAV' )
var jsdav_locks = require( 'jsDAV/lib/DAV/plugins/locks/fs' )
var jsdav_authc = require( 'jsDAV/lib/DAV/plugins/auth/file' )
var jshint = require( 'gulp-jshint' )
var npmconf = require( 'npmconf' )
var process = require( 'process' )
var stylish_jshint = require( 'jshint-stylish' )
var stylish_jscs = require( 'gulp-jscs-stylish' )
var url = require( 'url' )

var href
gulp.task( 'default', [ 'int-test' ] )

gulp.task( 'int-test'
, [ '.npmrc' ]
, function () {
  return gulp.src( 'test/assets/int/**' )
    .pipe( dav( href, { 'log': 'info', 'base': 'test/assets/int/' } ) )
    .pipe( debug( { title: 'post' } ) )
} )

gulp.task( 'watch'
, [ '.npmrc' ]
, function () {
  var options = {
    'log': 'info'
    , 'base': 'test/assets'
  }
  gulp.watch( 'test/assets/**', [ 'int-test' ] )
    .on( 'change'
, dav( href, options ).watch )
} )

gulp.task( 'src-test'
, function () {
  return gulp.src( [ '*.js', 'lib/*.js', 'test/*.js' ], { base: './' } )
    .pipe( jshint() )
    .pipe( jshint.reporter( 'jshint-stylish' ) )
    .pipe( jscs( { fix: true } ) )
    .pipe( stylish_jscs() )
    .pipe( gulp.dest( './' ) )
} )

gulp.task( '.npmrc'
, function ( cb ) {
  npmconf.load( null
, function () {
    if ( npmconf.loaded.sources.user ) {
      href = npmconf.loaded.sources.user.data.dav
    }
    if ( npmconf.loaded.sources.project ) {
      href = npmconf.loaded.sources.project.data.dav
    }
    cb()
  } )
} )

gulp.task(
    'clean-ca'
  , function () {
      /*
    mkdir -p certs
    mkdir -p crl
    mkdir -p newcerts
    mkdir -p private
    mkdir -p pkcs10
    rm -f index.txt*
    rm -f index.txt.attr*
    rm -f serial*
    rm -f newcerts/* */
      var ca = [
          'test/assets/openssl/index.txt*'
        , 'test/assets/openssl/index.attr.txt*'
        , 'test/assets/openssl/serial*'
        , 'test/assets/openssl/newcerts/*'
        , 'test/assets/openssl/certs'
        , 'test/assets/openssl/crl'
        , 'test/assets/openssl/newcerts'
        , 'test/assets/openssl/private'
        , 'test/assets/openssl/pkcs10'
      ]
      del( ca )
    }
)

gulp.task(
    'jsdav-digest'
  , function ( done ) {
      var uri = url.parse( 'http://localhost:11280/' )
      var node = 'test/assets/'
      var htdigest = 'test/assets/.htdigest'
      var realm =
        fs
          .readFileSync( htdigest )
          .toString()
          .split( '\n' )[0]
          .split( ':' )[1]
      var opt = {
            node: node
            , locksBackend: jsdav_locks.new( node )
            , authBackend: jsdav_authc.new( htdigest )
            , realm: realm
          }
      var srv = jsdav.mount( opt )
      srv.listen(
          uri.port
        , uri.hostname
        , function () {
            gulp
              .watch( node )
          }
      )
    }
)
