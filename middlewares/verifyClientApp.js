/**
 * @function
 * @name verifyClient
 * @desc client app verification middleware
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.headers.appclient application name "client"
 * @param {function} next middleware success
 *
 * @return {object} positive answer
 */

let verifyClient = (req, res, next) => {
  let {appclient} = req.headers
  if (appclient === 'sysnode-info') {
    next()
  } else {
    return res.status(406).json({ok: false, message: 'not allowed'})
  }
}

module.exports = verifyClient;
