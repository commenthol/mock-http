'use strict'

/**
 * @module lib/assign
 * @copyright 2014- commenthol
 * @license MIT
 */

/**
 * Assigns properties of obj1 to objn to `target`.
 * `target` needs to an object.
 *
 * If `overwrite` is set to false a property that already exists in
 * `target` it will **NOT** get overwritten!
 *
 * Example:
 *
 *     var target = {three: 3, one: 1};
 *     assign(target, {one: 0}, {two: 2}, false);
 *     //> target = {one: 1, two: 2, three: 3}
 *
 * @param {Object} target - target obj where props get appended
 * @param {Object} obj1...objn - 1 to n objects
 * @param {Boolean} overwrite - if false then respect target properties. Default=true
 * @return {Object} modified `target`
 */
function assign (target /*, obj1 ... objn, [overwrite] */) {
  var i, j
  var args = Array.prototype.slice.call(arguments)
  var overwrite = true

  if (typeof args[args.length - 1] === 'boolean') {
    overwrite = args.pop()
  }

  target = args.shift()
  for (j = 0; j < args.length; j++) {
    for (i in args[j]) {
      if (overwrite || !target[i]) {
        target[i] = args[j][i]
      }
    }
  }
  return target
}

module.exports = assign
