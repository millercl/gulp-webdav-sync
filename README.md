# gulp-webdav-sync
> Put files and folders to a WebDAV server. Deploy with [gulp](http://gulpjs.com/).

## Usage
Target is a URL-type parameter whereto files are uploaded. It must specify a directory ( also known as a "collection" ). At a minimum this must be DAV root, but subdirectories may be included ( *e.g.* project name ). Part-wise definition across multiple arguments is undefined. Extend a [URL object](https://nodejs.org/api/url.html#url_url_format_urlobj),
```js
var dav = require( 'gulp-webdav-sync' )

// fs: *.js
// dav: /js/*.js
gulp.task( 'deploy', function () {
  var options = {
      protocol: 'http:'
    , auth: 'user:pass'
    , hostname: 'localhost'
    , port: 8000
    , pathname: '/js/'
    , log: 'info'
    , logAuth: true
  }
  return gulp.src( '*.js' )
    .pipe( dav( options ) )
} )
```
or pass a string.
```js
var dav = require( 'gulp-webdav-sync' )

gulp.task( 'deploy', function () {
  return gulp.src( '*.js' )
    .pipe( dav( 'http://localhost:8000/js/', { log: 'info' } ) )
} )
```
Suppose the following directory tree, 
 * project/
   * dist/
     * css/
     * images/
     * js/

and this target .
 * localhost:8000/
   * css/
   * images/
   * js/

Use the `'parent'` option to constrain the localpath mapping.
```js
var dav = require( 'gulp-webdav-sync' )

gulp.task( 'deploy', function () {
  var options = {
      'log': 'info'
    , 'parent': 'dist'
  }
  return gulp.src( 'dist/**' )
    .pipe( dav( options ) )
} )
```
Otherwise, the result is this.
 * localhost:8000/
   * dist/
     * css/
     * images/
     * js/

This example uses [browser-sync](http://www.browsersync.io/docs/gulp/), [npmconf](https://www.npmjs.com/package/npmconf), and [.npmrc](https://docs.npmjs.com/files/npmrc) for a save-sync-reload solution.
```shell
npm set dav http://user:pass@localhost:8000/js/
```
```js
var browserSync = require( 'browser-sync' ).create()
var dav = require( 'gulp-webdav-sync' )
var npmconf = require( 'npmconf' )
var href

gulp.task( 'default', [ 'deploy' ], function () {
  browserSync.init( { proxy: href } )
  gulp.watch( [ '*.js', '!gulpfile.js' ], [ 'deploy' ] )
    .on( 'change', browserSync.reload )
} )

gulp.task( 'deploy', [ 'load-npmrc' ], function () {
  var options = {
    'log': 'info'
  }
  return gulp.src( [ '*.js', '!gulpfile.js' ] )
    .pipe( dav( href, options ) )
} )

gulp.task( 'load-npmrc', function ( cb ) {
  npmconf.load( null, function() {
    if ( npmconf.loaded.sources.user ) {
      href = npmconf.loaded.sources.user.data.dav
    }
    cb()
  } )
} )
```

## Options
Superset of [http.request options parameter](https://nodejs.org/api/http.html#http_http_request_options_callback).

### options.log
Logging threshold. Orthogonal to the `console` methods.

 string   |   output
:-------: | --------------
`'error'` |
`'warn'`  |
`'info'`  | HTTP Responses
`'log'`   | Debug

**Default:** `'error'`

### options.logAuth
Boolean. Display credentials in logged URLs.

**Default:** `false`

### options.parent
Relative or absolute path which halves the source path [`vinyl.path`] for appending the subsequent to the DAV target URI. Use with glob `**` to prevent super-directories from being created on the target. *e.g.* `gulp.src( 'dist/**' )`.

**Default:** `process.cwd()`

## Development
```shell
cd gulp-webdav-sync
npm install
npm test
npm set dav http://user:pass@localhost:8000/
gulp
```

