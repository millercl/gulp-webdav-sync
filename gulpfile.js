var debug = require( 'gulp-debug' )
var dav = require( './index.js' )
var gulp = require( 'gulp' )
var jscs = require( 'gulp-jscs' )
var jshint = require( 'gulp-jshint' )
var npmconf = require( 'npmconf' )
var stylish = require( 'jshint-stylish' )

var href
gulp.task( 'default', [ 'int-test' ] )

gulp.task( 'int-test', [ '.npmrc' ], function () {
  return gulp.src( 'test/assets/**' )
    .pipe( dav( href, { 'log': 'info', 'base': 'test/assets' } ) )
    .pipe( debug( { title: 'post' } ) )
} )

gulp.task( 'watch', [ '.npmrc' ], function () {
  var options = {
    'log': 'info'
    , 'base': 'test/assets'
  }
  gulp.watch( 'test/assets/**', [ 'int-test' ] )
    .on( 'change', dav( href, options ).watch )
} )

gulp.task( 'src-test', function () {
  return gulp.src( [ '*.js', 'test/*.js' ] )
    .pipe( jshint() )
    .pipe( jshint.reporter( 'jshint-stylish' ) )
    .pipe( jscs() )
} )

gulp.task( '.npmrc', function ( cb ) {
  npmconf.load( null, function () {
    if ( npmconf.loaded.sources.user ) {
      href = npmconf.loaded.sources.user.data.dav
    }
    if ( npmconf.loaded.sources.project ) {
      href = npmconf.loaded.sources.project.data.dav
    }
    cb()
  } )
} )
