# gulp-webdav-sync
> Put files and folders to a WebDAV server. Deploy with [gulp](http://gulpjs.com/).

## Usage
Target is a URL where files are uploaded to. It must specify a directory ( also known as a "collection" ). At a minimum this must be DAV root, but subdirectories may be included ( e.g. project name ). There are three ways to load the target: 1) a npmrc, 2) properties on an object argument, or 3) a string argument. The most local [npmrc](https://docs.npmjs.com/files/npmrc) is preferred, i.e. project > user > global. The user config can be set with npm.
```shell
npm set dav http://user:pass@localhost:8000/
```
If credentials are required, then they should be included inline as demonstrated. Alternatively, create a project npmrc when deploying multiple projects to the same server.
```shell
echo dav = http://user:pass@localhost:8000/application/ > .npmrc
```

```js
var dav = require( 'gulp-webdav-sync' )

gulp.task( 'default', function () {
  var options = {
      'log': 'info'
    , 'parent': 'dist'
  }
  return gulp.src( 'dist/**' )
    .pipe( dav( options ) )
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
Relative or absolute path which halves the source path [`vinyl.path`] for appending the subsequent to the DAV target URI. Use with glob `**` to prevent super-directories from being created on the target. e.g. `gulp.src( 'dist/**' )`.

**Default:** `process.cwd()`

## Development
```shell
cd gulp-webdav-sync
npm install
npm test
npm set dav http://user:pass@localhost:8000/
gulp
```

