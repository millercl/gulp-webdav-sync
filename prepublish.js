var child_process = require( 'child_process' )
var del = require( 'del' )
var fs = require( 'fs-extra' )
var path = require( 'path' )
var process = require( 'process' )

const PATH = 'test/assets/openssl/'

console.log( process.cwd() )
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
  child_process.spawnSync(
      'openssl'
    , [
          'genrsa'
        , '-out'
        , path_join( 'private/ca.pem' )
        , '2048'
      ]
    , opt
  )
  child_process.spawnSync(
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
  child_process.spawnSync(
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
  child_process.spawnSync(
      'openssl'
    , [
          'genrsa'
        , '-out'
        , path_join( 'private/localhost.pem' )
        , '2048'
      ]
    , opt
  )
  child_process.spawnSync(
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
  child_process.spawnSync(
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
}
