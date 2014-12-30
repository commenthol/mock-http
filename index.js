'use strict';

/**
 * @module mock-http
 * @copyright 2014- commenthol
 * @license MIT
 */

var util = require('util');
var assign = require('./lib/assign');
var Request = require('./lib/request');
var Response = require('./lib/response');

/**
 * mock middleware
 * @param {Object} req - request which gets extended by Request
 * @param {Object} res - request which gets extended by Response
 * @param {Function} next - next middleware function
 */
var M = function(req, res, next) {
    assign(req, new Request());
    assign(res, new Response());
    next && next();
};

/** @exports lib/Request */
M.Request = Request;
/** @exports lib/Response */
M.Response = Response;

module.exports = M;
