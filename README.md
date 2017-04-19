# gulp-webdav-sync
![screenshot](https://github.com/millercl/gulp-webdav-sync/raw/master/screenshot.png)

* [Similar Projects](#similar-projects)
* [Destinations](#destinations)
  * [URL as String](#url-as-string)
  * [URL as Object](#url-as-object)
  * [Subdirectories](#subdirectories)
* [Continuous Deploying: Creates, Updates, Deletes](#continuous-deploying-creates-updates-deletes)
  * [With gulp.watch](#with-gulpwatch)
  * [With gulp-watch](#with-gulp-watch)
* [API](#api)
  * [webdav( [ href ] [, options ] )](#webdav--href---options--)
  * [webdav( [ href ] [, options ] ).clean( [ cb ] )](#webdav--href---options--clean--cb--)
  * [webdav( [ href ] [, options ] ).watch( event [, cb ] )](#webdav--href---options--watch-event--cb--)
    * [cb](#cb)
    * [event](#event)
    * [href](#href)
    * [options](#options)
      * [options.base](#optionsbase)
      * [options.clean](#optionsclean)
      * [options.log](#optionslog)
      * [options.logAuth](#optionslogauth)
      * [options.uselastmodified](#optionsuselastmodified)
* [Development](#development)

## Similar Projects
1. [grunt-webdav-sync](https://github.com/avisi/grunt-webdav-sync) for [Grunt](http://www.gruntjs.com).
2. [webdav-sync](https://github.com/bermi/webdav-sync), a nodejs command line utility.
3. [webdav-fs](https://github.com/perry-mitchell/webdav-fs): node fs wrapper for WebDAV.
4. [curl](https://github.com/curl/curl), a C command line utility for HTTP.
```shell
curl -T "index.js" http://<user>:<pass>@localhost:8000/
curl -X MKCOL http://<user>:<pass>@localhost:8000/dir/
```

## Destinations
Pass a URL argument indicating a directory/collection on a WebDAV server. Include any HTTP Basic authentication inline. HTTPS authentication must go in the options argument. [`gulp.dest()`](https://github.com/gulpjs/gulp/blob/master/docs/API.md#gulpdestpath-options) is only for the filesystem. Instead, pipe to this module, where the stream objects are consumed.
### URL as String
```js
var webdav = require( 'gulp-webdav-sync' )

// put index.js to http://localhost:8000/js/index.js
gulp.task( 'deploy', function () {
  return gulp.src( 'index.js' )
    .pipe( webdav( 'http://<user>:<pass>@localhost:8000/js/' ) )
} )
```
### URL as Object
Extend a [request options object](https://github.com/request/request#requestoptions-callback).
See request's documention for [HTTP authentication](https://github.com/request/request#http-authentication), and [TLS authentication/verification](https://github.com/request/request#tlsssl-protocol).
```js
var webdav = require( 'gulp-webdav-sync' )

// put index.js to http://localhost:8000/js/index.js
gulp.task( 'deploy', function () {
  var options = {
      protocol: 'http:'
    , auth: {
          'user': '<user>'
        , 'pass': '<pass>'
        , 'sendImmediately': false // use http digest authentication
      }
    , hostname: 'localhost'
    , port: 8000
    , pathname: '/js/'
    , log: 'info' // show status codes
    , logAuth: true // show credentials in urls
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

and this destination,
 * localhost:8000/
   * css/
   * images/
   * js/

use the `'base'` option to constrain the localpath mapping,
```js
var webdav = require( 'gulp-webdav-sync' )

gulp.task( 'deploy', function () {
  var options = {
      'base': 'dist'
    , 'log': 'info'
    , 'port': 8000
  }
  return gulp.src( 'dist/**' )
    .pipe( webdav( options ) )
} )
```
otherwise, the result is this.
 * localhost:8000/
   * _dist/_
     * css/
     * images/
     * js/

## Continuous Deploying: Creates, Updates, Deletes
By combining methods, most cases can be satisfied, however deleting directories may be inconsistent.
If any file changes or there is a creation in the path, then `gulp.watch` will re-stream all files.
The [`uselastmodified` option](#optionsuselastmodified) ( default ) compares the local time to the server time so as to only upload updates.
Deletes emit a different object; not in the stream, but with a `change` event.

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
[gulp-watch](https://www.npmjs.com/package/gulp-watch) uses a different strategy of extending the file objects in stream.
It re-emits created, modified, and deleted files.
Delete/`'unlink'` type events are attempted on the server as well.
```js
var browserSync = require( 'browser-sync' ).create()
var watch = require( 'gulp-watch' )
var webdav = require( 'gulp-webdav-sync' )
var paths = {
  'js': [ '*.js', '!gulpfile.js' ]
}
var href = 'http://localhost'

gulp.task( 'deploy', function () {
  browserSync.init( { proxy: href } )
  return gulp.src( paths.js )
    .pipe( watch( paths.js ) )
    .pipe( webdav( href, { log: 'info' } ) )
    .pipe( browserSync.stream() )
} )
```

## API

### webdav( [ href ] [, options ] )
Target is a URL-type parameter whereto files are uploaded. It must specify a directory ( also known as a "collection" ). At a minimum this must be DAV root, but subdirectories may be included ( *e.g.* project name ). Part-wise definition across multiple arguments is undefined. Use the `http:` or `https:` scheme, not `dav:`.

### webdav( [ href ] [, options ] ).clean( [ cb ] )
Deletes all resources under `href`.

### webdav( [ href ] [, options ] ).watch( event [, cb ] )
Callback adapter for `'change'` events from `gulp.watch`. Only handles `type: 'deleted'` events. `gulp.src` does not push deleted files; use this or [gulp-watch](https://github.com/floatdrop/gulp-watch) instead. Calls back regardless of `event.type`.

#### cb
Optional, asynchronous, callback function.

**Type:** `Function`</br>
**Default:** `undefined`

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

#### href

**Type:** `String`</br>
**Default:** `undefined`

#### options
Superset of [request options parameter](https://github.com/request/request#requestoptions-callback). If any URL properties are defined, then `protocol`, `hostname`, and `pathname` are assigned to `http://localhost/`.
If `options.agent` is `undefined`, then a http[s] agent will be created for the stream.

**Type:** `Object`</br>
**Default:**
```js
{
    'clean': false
  , 'headers': { 'User-Agent': PLUGIN_NAME + '/' + VERSION }
  , 'log': 'error'
  , 'logAuth': false
  , 'base': process.cwd()
  , 'uselastmodified': 1000
}
```

##### options.base
Relative or absolute path which halves the source path [`vinyl.path`] for appending the subsequent to the DAV destination URI. Use with glob `**` to prevent super-directories from being created on the destination. *e.g.* `gulp.src( 'dist/**' )`.

**Type:** `String`</br>
**Default:** `process.cwd()`

##### options.clean
Deletes corresponding resources on server instead of uploading. Note, glob star-star will delete directories before contents are pushed.

**Type:** `Boolean`</br>
**Default:** `false`

##### options.log
Logging threshold. Orthogonal to the `console` methods.

 string   |   output
:-------: | --------------
`'error'` |
`'warn'`  |
`'info'`  | HTTP Responses
`'log'`   | Debug

**Type:** `String`</br>
**Default:** `'error'`

##### options.logAuth
Display credentials in logged URLs.

**Type:** `Boolean`</br>
**Default:** `false`

##### options.uselastmodified
Compare remote `getlastmodified` versus local ( changed ) `ctime`.
Only `PUT` if `ctime` is newer than `getlastmodified`.
Numeric value in milliseconds is the tolerance interval for qualifying client-server synchronization.
Set to false to disable.

**Type:** `Number`</br>
**Default:** `1000` ms

## Development
[OpenSSL](https://github.com/openssl/openssl) is required to generate certificates for unit testing.

```shell
cd gulp-webdav-sync
npm install
npm test
npm set dav http://user:pass@localhost:8000/
gulp
```
