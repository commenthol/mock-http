'use strict';

/**
 * @module lib/Response
 * @copyright 2014- commenthol
 * @license MIT
 */

var util = require('util');
var Writable = require('streamss-shim').Writable;
var assign = require('./assign');
var append = require('./append');
var pick = require('mergee').pick;

// from https://github.com/joyent/node/blob/master/lib/_http_server.js
var STATUS_CODES = {
	100 : 'Continue',
	101 : 'Switching Protocols',
	102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
	200 : 'OK',
	201 : 'Created',
	202 : 'Accepted',
	203 : 'Non-Authoritative Information',
	204 : 'No Content',
	205 : 'Reset Content',
	206 : 'Partial Content',
	207 : 'Multi-Status',               // RFC 4918
	300 : 'Multiple Choices',
	301 : 'Moved Permanently',
	302 : 'Moved Temporarily',
	303 : 'See Other',
	304 : 'Not Modified',
	305 : 'Use Proxy',
	307 : 'Temporary Redirect',
	308 : 'Permanent Redirect',         // RFC 7238
	400 : 'Bad Request',
	401 : 'Unauthorized',
	402 : 'Payment Required',
	403 : 'Forbidden',
	404 : 'Not Found',
	405 : 'Method Not Allowed',
	406 : 'Not Acceptable',
	407 : 'Proxy Authentication Required',
	408 : 'Request Time-out',
	409 : 'Conflict',
	410 : 'Gone',
	411 : 'Length Required',
	412 : 'Precondition Failed',
	413 : 'Request Entity Too Large',
	414 : 'Request-URI Too Large',
	415 : 'Unsupported Media Type',
	416 : 'Requested Range Not Satisfiable',
	417 : 'Expectation Failed',
	418 : 'I\'m a teapot',              // RFC 2324
	422 : 'Unprocessable Entity',       // RFC 4918
	423 : 'Locked',                     // RFC 4918
	424 : 'Failed Dependency',          // RFC 4918
	425 : 'Unordered Collection',       // RFC 4918
	426 : 'Upgrade Required',           // RFC 2817
	428 : 'Precondition Required',      // RFC 6585
	429 : 'Too Many Requests',          // RFC 6585
	431 : 'Request Header Fields Too Large',// RFC 6585
	500 : 'Internal Server Error',
	501 : 'Not Implemented',
	502 : 'Bad Gateway',
	503 : 'Service Unavailable',
	504 : 'Gateway Time-out',
	505 : 'HTTP Version Not Supported',
	506 : 'Variant Also Negotiates',    // RFC 2295
	507 : 'Insufficient Storage',       // RFC 4918
	509 : 'Bandwidth Limit Exceeded',
	510 : 'Not Extended',               // RFC 2774
	511 : 'Network Authentication Required' // RFC 6585
};

var isStream1 = (function () {
	if (/^v0\.(8|10)\./.test(process.version)) {
		return true
	}
})

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
function Response(options) {
	var self = this;

	options = options || {};
	Writable.call(this, pick(options, 'highWaterMark'));

	assign(this, {
			_internal: {
				headers: {},                /// {Object}  Response headers
				rawHeaders: {},             /// {Object}  Raw Response headers
				trailers: {},               /// {Object}  Trailing Response headers
				buffer: new Buffer(''),     /// {Buffer}  Internal buffer represents response body
				timedout: false,            /// {Boolean} If true than `Response.setTimeout` was called.
				ended: false,               /// {Boolean} If true than `Response.end` was called.
				timer: null,                /// {Timer}   The timer object used by `Response.setTimeout`
			},
			socket: {},                     /// {Object}  Dummy object for socket
			connection: {},                 /// {Object}  Dummy object for connection
			statusCode: undefined,          /** @see http://nodejs.org/api/http.html#http_response_statuscode */
			statusMessage: '',              /** @see http://nodejs.org/api/http.html#http_response_statusmessage */
			headersSent: false,             /** @see http://nodejs.org/api/http.html#http_response_headerssent */
			sendDate: true,                 /** @see http://nodejs.org/api/http.html#http_response_senddate */
		}
	);

	this._headers = this._internal.headers;

	Object.defineProperty(this, '_headerNames', {
		get: function() {
			var re = {},
				raw = self._internal.rawHeaders;
			for (var h in raw) {
				if (raw.hasOwnProperty(h)) {
					re[h.toLowerCase()] = h;
				}
			}
			return re;
		}
	});

	this.on('end', function() {
		options.onEnd && options.onEnd();
	});
	this.on('finish', function() {
		options.onFinish && options.onFinish();
	});

	return this;
}

util.inherits(Response, Writable);

/** @see http://nodejs.org/api/http.html#http_response_end_data_encoding */
Response.prototype.end = function (data, encoding, cb) {
	var self = this;
	if (self._internal.timedout && self._internal.ended) {
		// socket is already destroyed!
		return;
	}
	self._internal.ended = true;
	self.statusCode = self.statusCode || 200;
	self.statusMessage = STATUS_CODES[self.statusCode] || '';
	self.headersSent = true;
	clearTimeout(self._internal.timer);
	if (isStream1) {
		self.emit('end');
		Writable.prototype.end.call(self, data, encoding, cb);
	} else {
		Writable.prototype.end.call(self, data, encoding, cb);
		self.emit('end');
	}
};

/** @see http://nodejs.org/api/http.html#http_response_write_chunk_encoding */
Response.prototype._write = function(data, encoding, done) {
	this._internal.buffer = append(this._internal.buffer, data, encoding);
	done();
};

assign(Response.prototype, {
	/** @see http://nodejs.org/api/http.html#http_response_writecontinue */
	writeContinue: function(){
		this.headersSent = true;
		this.statusCode = 100;
		this.statusMessage = STATUS_CODES[this.statusCode];
	},
	/** @see http://nodejs.org/api/http.html#http_response_writehead_statuscode_reasonphrase_headers */
	writeHead: function(statusCode, reasonPhrase, headers){
		var i;
		if (typeof reasonPhrase === 'object') {
			headers = reasonPhrase;
			reasonPhrase = null;
		}
		if (reasonPhrase) {
			this._internal.reasonPhrase = reasonPhrase;
		}
		for (i in headers) {
			this.setHeader(i, headers[i]);
		}
		this.statusCode = statusCode;
		this.statusMessage = STATUS_CODES[this.statusCode];
		this.headersSent = true;
	},
	/** @see http://nodejs.org/api/http.html#http_response_settimeout_msecs_callback */
	setTimeout: function(msecs, callback) {
		var self = this;
		if (!msecs) return;
		this._internal.timer = setTimeout(function(){
			self._internal.timedout = true;
			if (callback) {
				callback();
			} else {
				self._internal.ended = true;
			}
		}, msecs);
	},
	/** @see http://nodejs.org/api/http.html#http_response_setheader_name_value */
	setHeader: function(name, value) {
		if (this.headersSent) {
			throw new Error('Can\'t set headers after they are sent.');
		}
		else {
			this._internal.headers[name.toLowerCase()] = value;
			this._internal.rawHeaders[name] = value;
		}
	},
	/** @see http://nodejs.org/api/http.html#http_response_getheader_name */
	getHeader: function(name) {
		return this._internal.headers[name.toLowerCase()];
	},
	/** @see http://nodejs.org/api/http.html#http_response_removeheader_name */
	removeHeader: function(name) {
		if (this.headersSent) {
			throw new Error('Can\'t remove headers after they are sent.');
		}
		else {
			name = name.toLowerCase();
			if (this._internal.headers[name]) {
				delete this._internal.headers[name];
			}
		}
	},
	/** @see http://nodejs.org/api/http.html#http_response_addtrailers_headers */
	addTrailers: function(headers) {
		if (this._internal.headers.trailer) {
			for (var i in headers) {
				this._internal.trailers[i] = headers[i];
			}
		}
	},
});

// test API - they do **NOT** exist in the "real" API
assign(Response.prototype, {
	/**
	 * Test only - get internal buffer
	 * @param {String} [encoding] - Default='utf8'
	 * @return {Buffer}
	 */
	getBuffer: function(encoding) {
		return this._internal.buffer.toString(encoding||'utf8');
	},
	/**
	 * Test only - get status if Response has ended
	 * @return {Boolean}
	 */
	hasEnded: function() {
		return this._internal.ended;
	},
	/**
	 * Test only - get status if Response has timed-out
	 * @return {Boolean}
	 */
	hasTimedout: function() {
		return this._internal.timedout;
	},
});

module.exports = Response;
