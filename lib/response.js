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
var pluck = require('./pluck');

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

	options = options || {};
	Writable.call(this, pluck('highWaterMark', options));

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
			headersSent: false,             /** @see http://nodejs.org/api/http.html#http_response_headerssent */
			sendDate: true,                 /** @see http://nodejs.org/api/http.html#http_response_senddate */
		}
	);

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
	self.headersSent = true;
	clearTimeout(self._internal.timer);
	self.emit('end');
	Writable.prototype.end.call(self, data, encoding, cb);
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
