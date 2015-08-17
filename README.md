# gulp-webdav-sync
> Put files and folders to a WebDAV server. Deploy with [gulp](http://gulpjs.com/).

## Usage
### URL String
Nominally, pass a URL string.
```js
var webdav = require( 'gulp-webdav-sync' )

// put index.js to http://localhost:8000/js/index.js
gulp.task( 'deploy', function () {
  return gulp.src( 'index.js' )
    .pipe( webdav( 'http://localhost:8000/js/' ) )
} )
```
### URL Object
Extend a [URL object](https://nodejs.org/api/url.html#url_url_format_urlobj).
```js
var webdav = require( 'gulp-webdav-sync' )

// put index.js to http://localhost:8000/js/index.js
// show status codes
// show credentials in urls
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
  return gulp.src( 'index.js' )
    .pipe( webdav( options ) )
} )
```
### Subdirectories
Suppose the following directory tree, 
 * project/
   * dist/
     * css/
     * images/
     * js/

and this target,
 * localhost:8000/
   * css/
   * images/
   * js/

use the `'parent'` option to constrain the localpath mapping,
```js
var webdav = require( 'gulp-webdav-sync' )

gulp.task( 'deploy', function () {
  var options = {
      'log': 'info'
    , 'parent': 'dist'
    , 'port': 8000
  }
  return gulp.src( 'dist/**' )
    .pipe( webdav( options ) )
} )
```
otherwise, the result is this.
 * localhost:8000/
   * dist/
     * css/
     * images/
     * js/

### With gulp.watch
[browser-sync](http://www.browsersync.io/docs/gulp/), [npmconf](https://www.npmjs.com/package/npmconf), and [.npmrc](https://docs.npmjs.com/files/npmrc) for a save-sync-reload solution.
```shell
npm set dav http://user:pass@localhost:8000/js/
```
```js
var browserSync = require( 'browser-sync' ).create()
var webdav = require( 'gulp-webdav-sync' )
var npmconf = require( 'npmconf' )
var paths = {
  'js': [ '*.js', '!gulpfile.js' ]
}
var href
var options = {
  'log': 'info'
}

gulp.task( 'default', [ 'deploy' ], function () {
  browserSync.init( { proxy: href } )
  gulp.watch( paths.js, [ 'deploy' ] )
    .on( 'change', webdav( href, options ).watch )
    .on( 'change', browserSync.reload )
} )

gulp.task( 'deploy', [ 'load-npmrc' ], function () {
  return gulp.src( paths.js )
    .pipe( webdav( href, options ) )
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

### With gulp-watch
[gulp-watch](https://www.npmjs.com/package/gulp-watch) re-emits created, modified, and deleted files for upload.
```js
var watch = require( 'gulp-watch' )
var webdav = require( 'gulp-webdav-sync' )
var paths = {
  'js': [ '*.js', '!gulpfile.js' ]
}
var href = 'http://localhost'

gulp.task( 'deploy', function () {
  return gulp.src( paths.js )
    .pipe( watch( paths.js ) )
    .pipe( webdav( href ) )
} )
```

## API

### webdav( [ href ] [, options ] )
Target is a URL-type parameter whereto files are uploaded. It must specify a directory ( also known as a "collection" ). At a minimum this must be DAV root, but subdirectories may be included ( *e.g.* project name ). Part-wise definition across multiple arguments is undefined. Use the `http:` scheme, not `dav:`.

### webdav( [ href ] [, options ] ).watch( event [, cb ] )
Callback adapter for `'change'` events from `gulp.watch`. Only handles `type: 'deleted'` events. `gulp.src` does not push deleted files; use this or [gulp-watch](https://github.com/floatdrop/gulp-watch) instead. Calls back regardless of `event.type`.

#### event
[glob-watcher](https://github.com/wearefractal/glob-watcher/blob/master/index.js#L10) event.
```js
{
    type: 'deleted'
  , path: '/absolute/path.ext'
}
```

**Type:** `Object`</br>
**Default:** `undefined`

#### cb
Optional asynchronous callback method.

**Type:** `Function`</br>
**Default:** `undefined`

## href

**Type:** `String`</br>
**Default:** `undefined`

## options
Superset of [http.request options parameter](https://nodejs.org/api/http.html#http_http_request_options_callback), and [url.object](https://nodejs.org/api/url.html#url_url_format_urlobj). If any URL properties are defined, then `protocol`, `hostname`, and `pathname` are assigned to `http://localhost/`.

**Type:** `Object`</br>
**Default:**
```js
{
    'agent': false
  , 'log': 'error'
  , 'logAuth': false
  , 'parent': process.cwd()
}
```

### options.log
Logging threshold. Orthogonal to the `console` methods.

 string   |   output
:-------: | --------------
`'error'` |
`'warn'`  |
`'info'`  | HTTP Responses
`'log'`   | Debug

**Type:** `String`</br>
**Default:** `'error'`

### options.logAuth
Display credentials in logged URLs.

**Type:** `Boolean`</br>
**Default:** `false`

### options.parent
Relative or absolute path which halves the source path [`vinyl.path`] for appending the subsequent to the DAV target URI. Use with glob `**` to prevent super-directories from being created on the target. *e.g.* `gulp.src( 'dist/**' )`.

**Type:** `String`</br>
**Default:** `process.cwd()`

## Development
```shell
cd gulp-webdav-sync
npm install
npm test
npm set dav http://user:pass@localhost:8000/
gulp
```

