'use strict'

/**
 * @module lib/Response
 * @copyright 2014-present commenthol
 * @license MIT
 */

var util = require('util')
var Writable = require('stream').Writable
var append = require('./append')
var pick = require('mergee').pick
var STATUS_CODES = require('http').STATUS_CODES

var isStream1 = (function () {
  if (/^v0\.(8|10)\./.test(process.version)) {
    return true
  }
})()

/**
 * Mock implementation of Class http.ServerResponse
 *
 * It behaves like the class, apart from really handling a socket. I.e. it implements the Writable Stream Class as well.
 * All methods can be used to mock a server response such allowing to unit-test e.g. connect middleware
 *
 * States are stored in the interal object `Response._internal` and can be queried from your unit-tests
 *
 *     _internal: {
 *       headers:    {Object} Response headers
 *       rawHeaders: {Object} Response headers
 *       trailers:   {Object} Trailing Response headers
 *       buffer:     {Buffer} Internal buffer represents response body
 *       timedout:   {Boolean} If true than `Response.setTimeout` was called.
 *       ended:      {Boolean} If true than `Response.end` was called.
 *     }
 *
 * @class
 * @see http://nodejs.org/api/http.html#http_class_http_serverresponse
 * @param {Object} [options] - options object
 * @param {Number} options.highWaterMark - highWaterMark for Writable Stream
 * @param {Function} options.onEnd - `function()` called on "end"
 * @param {Function} options.onFinish - `function()` called on "finish" event
 * @return {Stream.Writable} Writable Stream
 */
function Response (options) {
  var self = this

  options = options || {}
  Writable.call(this, pick(options, 'highWaterMark'))

  Object.assign(this, {
    _internal: {
      headers: {}, // / {Object}  Response headers
      rawHeaders: {}, // / {Object}  Raw Response headers
      trailers: {}, // / {Object}  Trailing Response headers
      buffer: Buffer.from(''), // / {Buffer}  Internal buffer represents response body
      timedout: false, // / {Boolean} If true than `Response.setTimeout` was called.
      ended: false, // / {Boolean} If true than `Response.end` was called.
      timer: null // / {Timer}   The timer object used by `Response.setTimeout`
    },
    socket: {}, // / {Object}  Dummy object for socket
    connection: {}, // / {Object}  Dummy object for connection
    statusCode: undefined, /** @see http://nodejs.org/api/http.html#http_response_statuscode */
    statusMessage: '', /** @see http://nodejs.org/api/http.html#http_response_statusmessage */
    headersSent: false, /** @see http://nodejs.org/api/http.html#http_response_headerssent */
    sendDate: true /** @see http://nodejs.org/api/http.html#http_response_senddate */
  })

  this._headers = this._internal.headers

  Object.defineProperty(this, '_headerNames', {
    get () {
      var re = {}
      var raw = self._internal.rawHeaders
      for (var h in raw) {
        if (Object.prototype.hasOwnProperty.call(raw, h)) {
          re[h.toLowerCase()] = h
        }
      }
      return re
    }
  })

  this.on('end', function () {
    options.onEnd && options.onEnd()
  })
  this.on('finish', function () {
    options.onFinish && options.onFinish()
  })

  return this
}

util.inherits(Response, Writable)

/** @see http://nodejs.org/api/http.html#http_response_end_data_encoding */
Response.prototype.end = function end (data, encoding, cb) {
  if (this._internal.timedout && this._internal.ended) {
    // socket is already destroyed!
    return
  }
  if (this.sendDate) {
    this._internal.headers.Date = new Date().toUTCString()
  }
  this._internal.ended = true
  this.statusCode = this.statusCode || 200
  this.statusMessage = STATUS_CODES[this.statusCode] || ''
  this.headersSent = true
  clearTimeout(this._internal.timer)
  if (isStream1) {
    this.emit('end')
    Writable.prototype.end.call(this, data, encoding, cb)
  } else {
    Writable.prototype.end.call(this, data, encoding, cb)
    this.emit('end')
  }
}

/** @see http://nodejs.org/api/http.html#http_response_write_chunk_encoding */
Response.prototype._write = function (data, encoding, done) {
  this._internal.buffer = append(this._internal.buffer, data, encoding)
  done()
}

Object.assign(Response.prototype, {
  /** @see http://nodejs.org/api/http.html#http_response_writecontinue */
  writeContinue () {
    this.headersSent = true
    this.statusCode = 100
    this.statusMessage = STATUS_CODES[this.statusCode]
  },
  /** @see http://nodejs.org/api/http.html#http_response_writehead_statuscode_reasonphrase_headers */
  writeHead (statusCode, reasonPhrase, headers) {
    var i
    if (typeof reasonPhrase === 'object') {
      headers = reasonPhrase
      reasonPhrase = null
    }
    if (reasonPhrase) {
      this._internal.reasonPhrase = reasonPhrase
    }
    for (i in headers) {
      this.setHeader(i, headers[i])
    }
    this.statusCode = statusCode
    this.statusMessage = STATUS_CODES[this.statusCode]
    this.headersSent = true
  },
  /** @see http://nodejs.org/api/http.html#http_response_settimeout_msecs_callback */
  setTimeout (msecs, callback) {
    var self = this
    if (!msecs) return
    this._internal.timer = setTimeout(function () {
      self._internal.timedout = true
      if (callback) {
        callback()
      } else {
        self._internal.ended = true
      }
    }, msecs)
  },
  /** @see http://nodejs.org/api/http.html#http_response_setheader_name_value */
  setHeader (name, value) {
    if (this.headersSent) {
      throw new Error('Can\'t set headers after they are sent.')
    } else {
      this._internal.headers[name.toLowerCase()] = value
      this._internal.rawHeaders[name] = value
    }
  },
  /** @see http://nodejs.org/api/http.html#http_response_getheader_name */
  getHeader (name) {
    return this._internal.headers[name.toLowerCase()]
  },
  /** @see https://nodejs.org/api/http.html#http_response_getheaders */
  getHeaders () {
    var self = this
    return Object.keys(this._internal.headers).reduce(function (o, name) {
      var _name = name.toLowerCase()
      o[_name] = self._internal.headers[name]
      return o
    }, {})
  },
  /** @see https://nodejs.org/api/http.html#http_response_getheadernames */
  getHeaderNames () {
    return Object.keys(this._internal.headers).map(function (name) { return String(name).toLowerCase() })
  },
  /** @see https://nodejs.org/api/http.html#http_response_hasheader_name */
  hasHeader (name) {
    return this._internal.headers[name.toLowerCase()] != undefined // eslint-disable-line eqeqeq
  },
  /** @see http://nodejs.org/api/http.html#http_response_removeheader_name */
  removeHeader (name) {
    if (this.headersSent) {
      throw new Error('Can\'t remove headers after they are sent.')
    } else {
      name = name.toLowerCase()
      if (this._internal.headers[name]) {
        delete this._internal.headers[name]
      }
    }
  },
  /** @see http://nodejs.org/api/http.html#http_response_addtrailers_headers */
  addTrailers (headers) {
    if (this._internal.headers.trailer) {
      for (var i in headers) {
        this._internal.trailers[i] = headers[i]
      }
    }
  }
})

// test API - they do **NOT** exist in the "real" API
Object.assign(Response.prototype, {
  /**
   * Test only - get internal buffer
   * @param {String} [encoding] - Default='utf8'
   * @return {Buffer}
   */
  getBuffer (encoding) {
    return this._internal.buffer.toString(encoding || 'utf8')
  },
  /**
   * Test only - get status if Response has ended
   * @return {Boolean}
   */
  hasEnded () {
    return this._internal.ended
  },
  /**
   * Test only - get status if Response has timed-out
   * @return {Boolean}
   */
  hasTimedout () {
    return this._internal.timedout
  }
})

module.exports = Response
