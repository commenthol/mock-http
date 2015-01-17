'use strict';

/* globals describe, it */

var assert = require('assert'),
	append = require('../lib/append');

describe('#append', function(){
	it ('append only data', function(){
		var res = append(undefined, 'append this');
		var exp = new Buffer('append this');
		assert.deepEqual(res, exp);
	});
	it ('append string to buffer', function(){
		var res = append(new Buffer('do '), 'append this');
		var exp = new Buffer('do append this');
		assert.deepEqual(res, exp);
	});
	it ('append buffer to buffer', function(){
		var res = append(new Buffer('do '), new Buffer('append this'));
		var exp = new Buffer('do append this');
		assert.deepEqual(res, exp);
	});
	it ('no append', function(){
		var res = append(new Buffer('append this'));
		var exp = new Buffer('append this');
		assert.deepEqual(res, exp);
	});
	it ('append to buffer with base64', function(){
		var res = append(undefined, 'append this', 'base64');
		var exp = new Buffer('append this'.toString('base64'));
		assert.deepEqual(res, exp);
	});
});
