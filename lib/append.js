'use strict';

/**
 * @module lib/append
 * @copyright 2014- commenthol
 * @license MIT
 */

/**
 * Append a buffer/ string to an buffer
 *
 * @param {Buffer} buffer - buffer to append to
 * @param {Buffer|String} data - data to append
 * @param {String} [encoding] - encoding to use. Default='utf8'
 * @return {Buffer}
 */
function append (buffer, data, encoding) {
	if (data === undefined) {
		return buffer;
	}
	return Buffer.concat([
		buffer || new Buffer(''),
		(data instanceof Buffer ? data : new Buffer(data.toString(encoding||'utf8')))
	]);
}

module.exports = append;