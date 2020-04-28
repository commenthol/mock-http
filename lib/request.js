'use strict'

/**
 * @module lib/Request
 * @copyright 2014-present commenthol
 * @license MIT
 */

var util = require('util')
var Readable = require('stream').Readable
var pick = require('mergee').pick

/**
 * Mock implementation of Class http.IncomingMessage
 *
 * It behaves like the class, apart from really handling a socket. I.e. it implements the Readable Stream Class as well.
 * All methods can be used to mock a client request on the server such allowing to unit-test e.g. connect middleware
 *
 * @constructor
 * @see http://nodejs.org/api/http.html#http_http_incomingmessage
 * @param {Object} [options] - options object
 * @param {Number} options.highWaterMark - highWaterMark for Readable Stream
 * @param {String} options.url - internal Server URL of the request (should start with "/")
 * @param {String} options.method - HTTP method (GET|POST|PUT|DELETE|HEAD|...)
 * @param {Object} options.headers - HTTP-header object
 * @param {Buffer} options.buffer - buffer to send as Readable Stream, e.g. for POST-requests
 * @param {Number} options.emitClose - emit `close` event after sending num bytes
 * @param {Number} options.connection.remoteAddress - remoteAddress of connection. Default=127.0.0.1
 * @param {Number} options.connection.remotePort - remotePort of connection. Default=51501
 * @return {Stream.Readable} Readable Stream
 */
function Request (options) {
  var i

  if (!(this instanceof Request)) {
    return new Request(options)
  }

  if (typeof options === 'string') {
    options = { url: options }
  }

  options = options || {}
  Readable.call(this, pick(options, 'highWaterMark'))

  options.rawHeaders = Array.isArray(options.rawHeaders) && (options.rawHeaders.length % 2 === 0) ? options.rawHeaders : undefined
  options.headers = options.headers || {}

  Object.assign(this,
    {
      /** @see http://nodejs.org/api/http.html#http_message_url */
      url: '/',
      /** @see http://nodejs.org/api/http.html#http_message_method */
      method: 'GET',
      /** @see http://nodejs.org/api/http.html#http_message_httpversion */
      httpVersion: '1.0',
      httpVersionMajor: 1,
      httpVersionMinor: 0,
      /** @see http://nodejs.org/api/http.html#http_message_headers */
      headers: {},
      /** @see https://nodejs.org/api/http.html#http_message_rawheaders */
      rawHeaders: [],
      /** @see http://nodejs.org/api/http.html#http_message_trailers */
      trailers: {},
      socket: {}, // / {Object}  Dummy object for socket
      connection: { // / {Object}  Dummy object for connection
        remoteAddress: '127.0.0.1',
        remotePort: 51501
      },
      _internal: {
        httpVersion: '1.0',
        buffer: Buffer.from(''),
        timer: 0, // / {Number}  The time in msecs to take to
        timedout: false, // / {Boolean} If true than `Response.setTimeout` was called.
        emitCloseCount: 0 // / {Number}
      }
    },
    pick(options, 'url,method,trailers')
  )

  if (options.rawHeaders) {
    for (i = 0; i < options.rawHeaders.length; i += 2) {
      this.setHeader(options.rawHeaders[i], options.rawHeaders[i + 1])
    }
  } else if (options.headers) {
    for (i in options.headers) {
      if (Object.prototype.hasOwnProperty.call(options.headers, i)) {
        this.setHeader(i, options.headers[i])
      }
    }
  }

  Object.defineProperty(this, 'httpVersion', {
    get: function () {
      return this._internal.httpVersion
    },
    set: function (value) {
      var tmp = (value || '').split('.').map(function (v) { return parseInt(v, 10) })

      this._internal.httpVersion = value

      if (tmp.length === 2) {
        this.httpVersionMajor = tmp[0]
        this.httpVersionMinor = tmp[1]
      }
    }
  })

  this.httpVersion = options.httpVersion || this._internal.httpVersion

  if (options.connection) {
    this.connection = Object.assign(this.connection, options.connection)
  }
  if (options.emitClose) {
    this._internal.emitClose = options.emitClose
  }
  if (options.buffer) {
    this._internal.buffer = options.buffer
  }

  this.socket.localAddress = this.connection.remoteAddress
  this.socket.localPort = this.connection.remotePort

  return this
}
util.inherits(Request, Readable)

Request.prototype._read = function (size) {
  var buf
  while (this._internal.buffer.length > 0) {
    size = (size > this._internal.buffer.length ? this._internal.buffer.length : size) // v0.8 requires this
    buf = this._internal.buffer.slice(0, size)
    this._internal.buffer = this._internal.buffer.slice(size, this._internal.buffer.length)
    this._internal.emitCloseCount += size
    if (this._internal.emitClose && this._internal.emitClose <= this._internal.emitCloseCount) {
      this._internal.buffer = Buffer.from('') // reset buffer to stop pushing
      this.emit('close')
    }
    if (!this.push(buf)) {
      return
    }
  }
  this.push(null)
}

// real API
Object.assign(Request.prototype, {
  /**
   * @see http://nodejs.org/api/http.html#http_message_settimeout_msecs_callback
   * @param {Number} msecs
   * @param {Function} callback
   */
  setTimeout (msecs, callback) {
    var self = this
    if (!msecs) return
    setTimeout(function () {
      self._internal.timedout = true
      callback && callback()
    }, msecs)
  },
  /**
   * Set HTTP header
   * @see https://nodejs.org/api/http.html#http_request_setheader_name_value
   * @param {String} name - name of HTTP header
   * @param {String} value - value of HTTP header
   */
  setHeader (name, value) {
    this.headers[name.toLowerCase()] = value
    this.rawHeaders.push(name)
    this.rawHeaders.push(value)
  },
  /**
   * Get HTTP header
   * @see https://nodejs.org/api/http.html#http_request_getheader_name
   * @param {String} name - name of HTTP header
   * @return HTTP header value
   */
  getHeader (name) {
    return this.headers[name.toLowerCase()]
  },
  /**
   * Remove HTTP header
   * @see https://nodejs.org/api/http.html#http_request_removeheader_name
   * @param {String} name - name of HTTP header
   */
  removeHeader (name) {
    var _name = name.toLowerCase()
    delete this.headers[_name]
    var rawHeaders = this.rawHeaders
    this.rawHeaders = []
    for (var i = 0; i < rawHeaders.length; i += 2) {
      var rawName = rawHeaders[i]
      if (rawName.toLowerCase() !== _name) {
        this.rawHeaders.push(rawName)
        this.rawHeaders.push(rawHeaders[i + 1])
      }
    }
  },
  /**
   * Flushes the request headers
   * @see https://nodejs.org/api/http.html#http_request_flushheaders
   */
  flushHeaders () {
    // does nothing for the moment
  },
  /**
   * @see https://nodejs.org/api/http.html#http_request_setnodelay_nodelay
   */
  setNoDelay (noDelay) {
    // does nothing for the moment
  },
  /**
   * @see https://nodejs.org/api/http.html#http_request_setsocketkeepalive_enable_initialdelay
   */
  setSocketKeepAlive (enable, initialDelay) {
    // does nothing for the moment
  }
})

// test API - they do **NOT** exist in the "real" API
Object.assign(Request.prototype, {
  /**
   * Test only - Set internal buffer
   * @param {Buffer|String} data - buffered data
   * @param {String} [encoding]
   */
  setBuffer (data, encoding) {
    this._internal.buffer = Buffer.from(data.toString(encoding || 'utf8'))
  }
})

module.exports = Request
