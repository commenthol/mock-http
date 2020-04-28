'use strict'

/* globals describe, it */

var assert = require('assert')
var Readable = require('stream').Readable
var Through = require('streamss').Through

var Request = require('../lib/request')

describe('#Request', function () {
  it('is instanceof Readable Stream', function () {
    var req = new Request()
    assert.ok(req instanceof Readable)
  })
  it('has url "/"', function () {
    var req = new Request()
    assert.strictEqual(req.url, '/')
  })
  it('can set url', function () {
    var url = '/path/?kh=-1&q=node'
    var req = new Request(url)
    assert.strictEqual(req.url, url)
  })
  it('has httpVersion 1.0', function () {
    var req = new Request()
    assert.strictEqual(req.httpVersion, '1.0')
    assert.strictEqual(req.httpVersionMajor, 1)
    assert.strictEqual(req.httpVersionMinor, 0)
  })
  it('can set httpVersion', function () {
    var req = new Request({ httpVersion: '2.1' })
    assert.strictEqual(req.httpVersion, '2.1')
    assert.strictEqual(req.httpVersionMajor, 2)
    assert.strictEqual(req.httpVersionMinor, 1)
  })
  it('can set options', function () {
    var options = {
      url: '/path/?kh=-1&q=node',
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Awesome; rv:1.0)'
      }
    }
    var req = new Request(options)
    assert.strictEqual(req.url, options.url)
    assert.strictEqual(req.method, options.method)
    assert.deepStrictEqual(req.headers, { 'user-agent': 'Mozilla/5.0 (Awesome; rv:1.0)' })
    assert.deepStrictEqual(req.rawHeaders, ['User-Agent', 'Mozilla/5.0 (Awesome; rv:1.0)'])
  })
  it('can set rawHeaders', function () {
    var options = {
      url: '/path/?kh=-1&q=node',
      method: 'post',
      rawHeaders: ['User-Agent', 'Mozilla/5.0 (Awesome; rv:1.0)']
    }
    var req = new Request(options)
    assert.strictEqual(req.url, options.url)
    assert.strictEqual(req.method, options.method)
    assert.deepStrictEqual(req.headers, { 'user-agent': 'Mozilla/5.0 (Awesome; rv:1.0)' })
    assert.deepStrictEqual(req.rawHeaders, ['User-Agent', 'Mozilla/5.0 (Awesome; rv:1.0)'])
  })
  it('can set remoteAddress', function () {
    var options = {
      connection: {
        remoteAddress: '10.0.0.0'
      }
    }
    var req = new Request(options)
    assert.deepStrictEqual(req.connection, {
      remoteAddress: '10.0.0.0',
      remotePort: 51501
    })
  })
  it('can set remotePort', function () {
    var options = {
      connection: {
        remotePort: 80
      }
    }
    var req = new Request(options)
    assert.deepStrictEqual(req.connection, {
      remoteAddress: '127.0.0.1',
      remotePort: 80
    })
  })
  it('can set a request header', function () {
    var req = new Request()
    var header = ['User-Agent', 'Mozilla/5.0 (Awesome; rv:1.0)']
    req.setHeader(header[0], header[1])
    assert.strictEqual(req.getHeader(header[0]), header[1])
  })
  it('can remove a request header', function () {
    var req = new Request({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Awesome; rv:1.0)',
        'Content-Type': 'application/json'
      }
    })
    req.removeHeader('content-type')
    assert.deepStrictEqual(req.headers, { 'user-agent': 'Mozilla/5.0 (Awesome; rv:1.0)' })
    assert.deepStrictEqual(req.rawHeaders, ['User-Agent', 'Mozilla/5.0 (Awesome; rv:1.0)'])
  })
  it('can set a url instead of options', function () {
    var url = '/path/?kh=-1&q=node'
    var req = Request(url)
    assert.strictEqual(req.url, url)
    assert.strictEqual(req.method, 'GET')
  })
  it('can set a timeout', function (done) {
    var url = '/path/?kh=-1&q=node'
    var req = Request(url)
    req.setTimeout(20)
    setTimeout(function () {
      assert.ok(req._internal.timedout)
      done()
    }, 30)
  })
  it('can not set a timeout of 0ms', function (done) {
    var url = '/path/?kh=-1&q=node'
    var req = Request(url)
    req.setTimeout(0)
    setTimeout(function () {
      assert.ok(!req._internal.timedout)
      done()
    }, 10)
  })
  it('can stream', function (done) {
    var buf = ''
    var query = 'name=node&stream=version2'
    var req = new Request({ highWaterMark: 5 })

    req.method = 'POST'
    req.setBuffer(query)
    req.pipe(new Through(function (data) {
      buf += data.toString()
    }, function () {
      assert.strictEqual(buf, query)
      done()
    })
    )
  })
  it('can stream with close event', function (done) {
    var buf = ''
    var query = 'name=node&stream=version2'
    var req = new Request({
      highWaterMark: 5,
      buffer: Buffer.from(query),
      emitClose: 12
    })

    req.method = 'POST'
    req.pipe(new Through(function (data) {
      buf += data.toString()
    }, function () {
      assert.strictEqual(buf, 'name=node&strea')
      done()
    })
    )
  })
  it('repects lowercase headers in .headers', function () {
    var headers = { Authorization: 'Bearer 552d9922b59dd27b383d9674' }
    var req = new Request({ url: '/', method: 'get', headers: headers })

    assert.strictEqual(req.getHeader('Authorization'), headers.Authorization)
    assert.strictEqual(req.headers.authorization, headers.Authorization)
    assert.strictEqual(req.headers.Authorization, undefined)

    assert.deepStrictEqual(req.rawHeaders, ['Authorization', 'Bearer 552d9922b59dd27b383d9674'])
  })
})
