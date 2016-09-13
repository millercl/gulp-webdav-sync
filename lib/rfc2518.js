module.exports = {
  tr_207: tr_207
}

function tr_207( dom ) {
  try {
    return dom.multistatus.response.map( function ( response ) {
      var href
      var propstat
      var prop
      var getlastmodified
      var stat
      var resource = {}

      if (    response.href
           && response.href instanceof Array ) {
        href = response.href[0]
      }
      if (    response.propstat
           && response.propstat instanceof Array ) {
        propstat = response.propstat[0]
      }
      if (    propstat
           && propstat.prop
           && propstat.prop instanceof Array ) {
        prop = response.propstat[0].prop[0]
      }
      if (    prop
           && prop.getlastmodified
           && prop.getlastmodified instanceof Array ) {
        getlastmodified = response.propstat[0].prop[0].getlastmodified[0]
      }
      if (    propstat
           && propstat.status
           && propstat.status instanceof Array ) {
        stat = response.propstat[0].status[0]
      }

      resource.href = href._
      if ( propstat ) {
        if ( prop ) {
          var getcontentlength = response.propstat[0].prop[0].getcontentlength
          if ( getcontentlength && getcontentlength[0] ) {
            resource.getcontentlength = getcontentlength[0]._
          }
          if ( getlastmodified ) {
            resource.getlastmodified = new Date( getlastmodified._ )
          }
          var resourcetype = response.propstat[0].prop[0].resourcetype
          if ( resourcetype && resourcetype[0] ) {
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

