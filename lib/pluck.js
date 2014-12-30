'use strict';

/**
 * @module lib/pluck
 * @copyright 2014- commenthol
 * @license MIT
 */

/**
 * Pluck properties to a new object
 *
 * @param {String} props - properties as String separated by space
 * @param {Object} obj - object to pluck properties from
 * @return {Object} new object with `props` properties
 */
function pluck(props, obj){
	var ret = {};
	(props||'').split(/\s+/).forEach(function(p){
		if (obj[p] !== undefined) {
			ret[p] = obj[p];
		}
	});
	return ret;
}

module.exports = pluck;