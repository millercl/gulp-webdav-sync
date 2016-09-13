module.exports = {
  tr_207: tr_207
}

function tr_207( dom ) {
  try {
    return dom.multistatus.response.map( function ( response ) {
      var href = response.href[0]
      var propstat = response.propstat[0]
      var prop = response.propstat[0].prop[0]
      var getlastmodified = response.propstat[0].prop[0].getlastmodified[0]
      var stat = response.propstat[0].status[0]
      var resource = {}
      resource.href = href._
      if ( propstat ) {
        if ( prop ) {
          var getcontentlength = response.propstat[0].prop[0].getcontentlength
          if ( getcontentlength ) {
            resource.getcontentlength = getcontentlength[0]._
          }
          if ( getlastmodified ) {
            resource.getlastmodified = new Date( getlastmodified._ )
          }
          var resourcetype = response.propstat[0].prop[0].resourcetype
          if ( resourcetype ) {
            if ( typeof resourcetype[0] === 'string' ) {
              resource.resourcetype = null
            } else
            if ( typeof resourcetype[0] === 'object' ) {
              resource.resourcetype = Object.keys( resourcetype[0] )[0]
            }
          }
        }
        if ( stat ) {
          resource.stat = http_status_to_int( stat._ )
        }
      }
      return resource
    } )
  } catch ( error ) {
    throw error
  }
  return []
  function http_status_to_int( string ) {
    return Number( /\d{3}/.exec( string ) )
  }
}

