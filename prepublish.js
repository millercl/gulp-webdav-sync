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

var child_process = require( 'child_process' )
var del = require( 'del' )
var fs = require( 'fs-extra' )
var npmlog = require( 'npmlog' )
var path = require( 'path' )

const PATH = 'test/assets/openssl/'

if ( !creds_exist() ) {
  rekey()
}

function path_join( cdr ) {
  return path.join( PATH, cdr )
}

function and( a, b ) {
  return a && b
}

function creds_exist() {
  var creds = [
      'certs/ca.pem'
    , 'certs/localhost.pem'
    , 'private/localhost.pem'
  ]
  return creds.map( path_join ).map( fs.existsSync ).reduce( and ) && verify()
}

function verify() {
  var opt = { stdio: [ null, 'inherit', 'inherit'] }
  var ca = child_process.spawnSync(
      'openssl'
    , [
          'verify'
        , '-CAfile'
        , path_join( 'certs/ca.pem' )
        , path_join( 'certs/ca.pem' )
      ]
    , opt
  )
  var lh = child_process.spawnSync(
      'openssl'
    , [
          'verify'
        , '-CAfile'
        , path_join( 'certs/ca.pem' )
        , path_join( 'certs/localhost.pem' )
      ]
    , opt
  )
  return ca.status === 0 && lh.status === 0
}

function chmod0770( str ) {
  fs.chmodSync( str, 0770 )
}

function rekey() {
  var dirs = [ 'certs', 'crl', 'newcerts', 'private', 'pkcs10' ]
  dirs.map( path_join ).forEach( fs.ensureDirSync )
  dirs.map( path_join ).forEach( chmod0770 )
  var files = [ 'index.txt*', 'index.txt.att*', 'serial*', 'newcerts/*' ]
  del.sync( files.map( path_join ) )
  fs.ensureFileSync( path_join( 'index.txt' ) )
  fs.ensureFileSync( path_join( 'index.txt.attr' ) )
  var opt = { stdio: [ null, 'inherit', 'inherit'] }
  var last
  last = child_process.spawnSync(
      'openssl'
    , [
          'genrsa'
        , '-out'
        , path_join( 'private/ca.pem' )
        , '2048'
      ]
    , opt
  )
  if ( last.status !== 0 ) {
    npmlog.warn( 'prepublish.js', 'openssl error', last )
  }
  last = child_process.spawnSync(
      'openssl'
    , [
          'req'
        , '-config'
        , path_join( 'openssl.cnf' )
        , '-new'
        , '-key'
        , path_join( 'private/ca.pem' )
        , '-subj'
        , '/CN=ca/'
        , '-out'
        , path_join( 'pkcs10/ca.pem' )
        , '-nodes'
      ]
    , opt
  )
  if ( last.status !== 0 ) {
    npmlog.warn( 'prepublish.js', 'openssl error', last )
  }
  last = child_process.spawnSync(
      'openssl'
    , [
          'ca'
        , '-config'
        , path_join( 'openssl.cnf' )
        , '-create_serial'
        , '-keyfile'
        , path_join( 'private/ca.pem' )
        , '-in'
        , path_join( 'pkcs10/ca.pem' )
        , '-extensions'
        , 'v3_ca'
        , '-selfsign'
        , '-out'
        , path_join( 'certs/ca.pem' )
        , '-batch'
      ]
    , opt
  )
  if ( last.status !== 0 ) {
    npmlog.warn( 'prepublish.js', 'openssl error', last )
  }
  last = child_process.spawnSync(
      'openssl'
    , [
          'verify'
        , '-CAfile'
        , path_join( 'certs/ca.pem' )
        , path_join( 'certs/ca.pem' )
      ]
    , opt
  )
  if ( last.status !== 0 ) {
    npmlog.warn( 'prepublish.js', 'openssl error', last )
  }
  last = child_process.spawnSync(
      'openssl'
    , [
          'genrsa'
        , '-out'
        , path_join( 'private/localhost.pem' )
        , '2048'
      ]
    , opt
  )
  if ( last.status !== 0 ) {
    npmlog.warn( 'prepublish.js', 'openssl error', last )
  }
  last = child_process.spawnSync(
      'openssl'
    , [
          'req'
        , '-config'
        , path_join( 'openssl.cnf' )
        , '-new'
        , '-key'
        , path_join( 'private/localhost.pem' )
        , '-subj'
        , '/CN=localhost/'
        , '-out'
        , path_join( 'pkcs10/localhost.pem' )
        , '-nodes'
      ]
    , opt
  )
  if ( last.status !== 0 ) {
    npmlog.warn( 'prepublish.js', 'openssl error', last )
  }
  last = child_process.spawnSync(
      'openssl'
    , [
          'ca'
        , '-config'
        , path_join( 'openssl.cnf' )
        , '-cert'
        , path_join( 'certs/ca.pem' )
        , '-keyfile'
        , path_join( 'private/ca.pem' )
        , '-in'
        , path_join( 'pkcs10/localhost.pem' )
        , '-out'
        , path_join( 'certs/localhost.pem' )
        , '-batch'
    ]
    , opt
  )
  if ( last.status !== 0 ) {
    npmlog.warn( 'prepublish.js', 'openssl error', last )
  }
  last = child_process.spawnSync(
      'openssl'
    , [
          'verify'
        , '-CAfile'
        , path_join( 'certs/ca.pem' )
        , path_join( 'certs/localhost.pem' )
      ]
    , opt
  )
  if ( last.status !== 0 ) {
    npmlog.warn( 'prepublish.js', 'openssl error', last )
  }
}
