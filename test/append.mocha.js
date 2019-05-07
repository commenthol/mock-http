'use strict'

/* globals describe, it */

var assert = require('assert')
var append = require('../lib/append')

describe('#append', function () {
  it('append only data', function () {
    var res = append(undefined, 'append this')
    var exp = Buffer.from('append this')
    assert.deepStrictEqual(res, exp)
  })
  it('append string to buffer', function () {
    var res = append(Buffer.from('do '), 'append this')
    var exp = Buffer.from('do append this')
    assert.deepStrictEqual(res, exp)
  })
  it('append buffer to buffer', function () {
    var res = append(Buffer.from('do '), Buffer.from('append this'))
    var exp = Buffer.from('do append this')
    assert.deepStrictEqual(res, exp)
  })
  it('no append', function () {
    var res = append(Buffer.from('append this'))
    var exp = Buffer.from('append this')
    assert.deepStrictEqual(res, exp)
  })
  it('append to buffer with base64', function () {
    var res = append(undefined, 'append this', 'base64')
    var exp = Buffer.from('append this'.toString('base64'))
    assert.deepStrictEqual(res, exp)
  })
})
