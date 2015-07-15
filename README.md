# gulp-webdav-sync
> Put files and folders to a WebDAV server. Deploy with [gulp](http://gulpjs.com/).

## Usage
```js
var dav = require( 'gulp-webdav-sync' )

gulp.task( 'default', function () {
  return gulp.src( '*' )
    .pipe( dav( url ) )
} )
```

## Development
```shell
cd gulp-webdav-sync
npm install
npm test
npm set dav http://user:pass@localhost:8000/
gulp
```

