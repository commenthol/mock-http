'use strict';

/**
 * @module lib/assign
 * @copyright 2014- commenthol
 * @license MIT
 */

/**
 * Assigns properties of obj1 to objn to `target`.
 * `target` needs to an object.
 * If a property already exists in `target` it will **NOT** get overwritten!
 *
 * Example:
 *
 *     var target = {three: 3, one: 1};
 *     assign(target, {one: 0}, {two: 2});
 *     //> target = {one: 1, two: 2, three: 3}
 *
 * @param {Object} target - target obj where props get appended
 * @param {Object} obj1...objn - 1 to n objects
 * @return {Object} modified `target`
 */
function assign(target /*, obj1 ... objn */) {
	var i, j;
	var args = Array.prototype.slice.call(arguments);
	target = args.shift();
	for (j=0; j<args.length; j++) {
		for (i in args[j]) {
			if (!target[i]) {
				target[i] = args[j][i];
			}
		}
	}
	return target;
}

module.exports = assign;
