var debug = require( 'gulp-debug' )
var dav = require( './index.js' )
var gulp = require( 'gulp' )
var jscs = require( 'gulp-jscs' )
var jshint = require( 'gulp-jshint' )
var stylish = require( 'jshint-stylish' )

gulp.task( 'default', [ 'int-test' ] )

gulp.task( 'int-test', function () {
  return gulp.src( 'test/assets/**' )
    .pipe( debug( { title: 'pre' } ) )
    .pipe( dav( { 'log': 'info', 'parent': 'test/assets' } ) )
    .pipe( debug( { title: 'post' } ) )
} )

gulp.task( 'src-test', function () {
  return gulp.src( [ '*.js', 'test/*.js' ] )
    .pipe( jshint() )
    .pipe( jshint.reporter( 'jshint-stylish' ) )
    .pipe( jscs() )
} )
