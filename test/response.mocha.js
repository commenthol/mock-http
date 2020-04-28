'use strict'

/* globals describe, it, before */

var assert = require('assert')
var Writable = require('stream').Writable
var Readable = require('stream').Readable

var Response = require('../lib/response')

var headers = {
  userAgent: ['User-Agent', 'Mozilla/5.0'],
  cacheControl: ['Cache-Control', 'max-age=300'],
  setCookie: ['Set-Cookie', ['session=dadadada', 'token=fefufefu']],
  connection: ['Connection', 'keep-alive']
}

describe('#Response', function () {
  describe('constructor', function () {
    var res

    before(function () {
      res = new Response()
    })
    it('is instanceof Writable Stream', function () {
      assert.ok(res instanceof Writable)
    })
    it('headersSent is false', function () {
      assert.strictEqual(res.headersSent, false)
    })
    it('statusCode is undefined', function () {
      assert.strictEqual(res.statusCode, undefined)
    })
  })

  describe('#writeContinue', function () {
    var res

    before(function () {
      res = new Response()
      res.writeContinue()
    })
    it('sets statusCode to 100', function () {
      assert.strictEqual(res.statusCode, 100)
    })
    it('sets headersSent to true', function () {
      assert.strictEqual(res.headersSent, true)
    })
  })

  describe('#writeHead', function () {
    it('with statusCode only', function () {
      var res = new Response()
      res.writeHead(200)
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
    })
    it('with statusCode and setting headers', function () {
      var res = new Response()
      res.writeHead(200, {
        'Set-Cookie': headers.setCookie[1],
        'Cache-Control': headers.cacheControl[1]
      })
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
      assert.deepStrictEqual(res.getHeader('Set-Cookie'), headers.setCookie[1])
      assert.deepStrictEqual(res.getHeader('Cache-Control'), headers.cacheControl[1])
    })
    it('with statusCode and reasonPhrase', function () {
      var res = new Response()
      res.writeHead(200, 'OK')
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
      assert.strictEqual(res._internal.reasonPhrase, 'OK')
    })
    it('with statusCode, reasonPhrase and setting headers', function () {
      var res = new Response()
      res.writeHead(200, 'OK', {
        'Set-Cookie': headers.setCookie[1],
        'Cache-Control': headers.cacheControl[1]
      })
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
      assert.strictEqual(res.statusMessage, 'OK')
      assert.strictEqual(res._internal.reasonPhrase, 'OK')
      assert.deepStrictEqual(res.getHeader('Set-Cookie'), headers.setCookie[1])
      assert.deepStrictEqual(res.getHeader('Cache-Control'), headers.cacheControl[1])
    })
  })

  describe('#setHeader', function () {
    var h = headers.cacheControl
    it('set user-agent', function () {
      var res = new Response()
      res.setHeader(h[0], h[1])
      res.setHeader(headers.connection[0], headers.connection[1])

      assert.strictEqual(res._internal.headers[h[0].toLowerCase()], h[1])
      assert.strictEqual(res.getHeader(h[0]), h[1])

      assert.deepStrictEqual(res._headers, { 'cache-control': 'max-age=300', connection: 'keep-alive' })
      assert.deepStrictEqual(res._headerNames, { 'cache-control': 'Cache-Control', connection: 'Connection' })
    })
    it('set, get and remove user-agent', function () {
      var res = new Response()
      res.setHeader(h[0], h[1])
      assert.strictEqual(res.getHeader(h[0]), h[1])
      res.removeHeader(h[0])
      assert.strictEqual(res.getHeader(h[0]), undefined)
    })
    it('setHeader after writeHead throws', function (done) {
      var res = new Response()
      res.writeHead(200)
      try {
        res.setHeader(h[0], h[1])
      } catch (e) {
        assert.strictEqual(e.message, "Can't set headers after they are sent.")
        assert.strictEqual(res._internal.headers[h[0].toLowerCase()], undefined)
        done()
      }
    })
  })

  describe('#getHeaders', function () {
    it('hasHeader user-agent', function () {
      var h = headers.userAgent
      var res = new Response()
      res.setHeader(h[0], h[1])
      assert.strictEqual(res.hasHeader(h[0]), true)
      res.removeHeader(h[0])
      assert.strictEqual(res.hasHeader(h[0]), false)
      assert.strictEqual(res.hasHeader('Content-Type'), false)
    })
    it('getHeaders', function () {
      var res = new Response()
      res.setHeader(headers.userAgent[0], headers.userAgent[1])
      res.setHeader(headers.cacheControl[0], headers.cacheControl[1])
      res.setHeader(headers.setCookie[0], headers.setCookie[1])
      assert.deepStrictEqual(res.getHeaders(), {
        'user-agent': 'Mozilla/5.0',
        'cache-control': 'max-age=300',
        'set-cookie': [
          'session=dadadada',
          'token=fefufefu'
        ]
      })
    })
    it('getHeaderNames', function () {
      var res = new Response()
      res.setHeader(headers.userAgent[0], headers.userAgent[1])
      res.setHeader(headers.cacheControl[0], headers.cacheControl[1])
      res.setHeader(headers.setCookie[0], headers.setCookie[1])
      assert.deepStrictEqual(res.getHeaderNames(), [
        'user-agent',
        'cache-control',
        'set-cookie'
      ])
    })
  })

  describe('#removeHeader', function () {
    it('removeHeader on undefined header', function () {
      var res = new Response()
      res.removeHeader(headers.cacheControl[0])
      assert.strictEqual(res._internal.headers[headers.cacheControl[0]], undefined)
    })
    it('removeHeader after writeHead throws', function (done) {
      var res = new Response()
      res.writeHead(200, {
        'Cache-Control': headers.cacheControl[1]
      })
      try {
        res.removeHeader(headers.cacheControl[0])
      } catch (e) {
        assert.strictEqual(e.message, "Can't remove headers after they are sent.")
        assert.strictEqual(res._internal.headers[headers.cacheControl[0].toLowerCase()], headers.cacheControl[1])
        done()
      }
    })
  })

  describe('#setTimeout', function () {
    it('call without callback', function (done) {
      var res = new Response({
        onEnd: function () {
          assert.strictEqual('shall never reach', 'here')
        }
      })
      res.setTimeout(5)
      setTimeout(function () {
        res.end()
        assert.strictEqual(res._internal.timedout, true)
        assert.strictEqual(res._internal.ended, true)
        assert.strictEqual(res.headersSent, false)
        done()
      }, 10)
    })
    it('call with callback', function (done) {
      var steps = []
      var res = new Response({
        onEnd: function () {
          steps.push(2)
        }
      })
      res.setTimeout(5, function () {
        steps.push(1)
      })
      setTimeout(function () {
        res.end()
        assert.strictEqual(steps.length, 2)
        assert.strictEqual(res._internal.timedout, true)
        assert.strictEqual(res._internal.ended, true)
        assert.strictEqual(res.headersSent, true)
        done()
      }, 10)
    })
  })

  describe('#addTrailers', function () {
    it('with sending "Trailer" header', function () {
      var res = new Response()
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        Trailer: 'Content-MD5'
      })
      res.write('fileData')
      res.addTrailers({ 'Content-MD5': '7895bf4b8828b55ceaf47747b4bca667' })
      res.end()
      assert.strictEqual(res._internal.trailers['Content-MD5'], '7895bf4b8828b55ceaf47747b4bca667')
    })
    it('without sending "Trailer" header', function () {
      var res = new Response()
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.write('fileData')
      res.addTrailers({ 'Content-MD5': '7895bf4b8828b55ceaf47747b4bca667' })
      res.end()
      assert.strictEqual(res._internal.trailers['Content-MD5'], undefined)
    })
  })

  describe('#write', function () {
    var str = 'push it baby'

    it('string', function () {
      var res = new Response()
      res.write(str)
      assert.strictEqual(res._internal.buffer.toString(), str)
    })
    it('buffered data', function () {
      var res = new Response()
      res.write(Buffer.from(str))
      assert.strictEqual(res._internal.buffer.toString(), str)
    })
  })

  describe('#end', function () {
    var h = headers.cacheControl
    var str = 'push it baby'

    it('call end', function () {
      var res = new Response()
      res.end()
      assert.strictEqual(res._internal.ended, true)
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
    })
    it('call end using onEnd', function (done) {
      var res = new Response({
        onEnd: function () {
          assert.strictEqual(res._internal.ended, true)
          assert.strictEqual(res.headersSent, true)
          assert.strictEqual(res.statusCode, 200)
          done()
        }
      })
      res.end()
    })
    it('write and call end with some data', function () {
      var res = new Response()
      res.write(str)
      res.end(str)
      assert.strictEqual(res._internal.buffer.toString(), str + str)
      assert.strictEqual(res._internal.ended, true)

      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
    })
    it('call end with some data', function () {
      var res = new Response()
      res.end(str)
      assert.strictEqual(res._internal.buffer.toString(), str)
      assert.strictEqual(res._internal.ended, true)
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
    })
    it('call end with some buffered data', function () {
      var res = new Response()
      res.end(Buffer.from(str))
      assert.strictEqual(res._internal.buffer.toString(), str)
      assert.strictEqual(res._internal.ended, true)
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
    })
    it('can stream', function (done) {
      var steps = []
      var readable = new Readable()
      var res = new Response()

      readable.push(str)
      readable.push(null)

      readable
        .pipe(res)
        .on('end', function () {
          steps.push(1) // check that only called once
        })
        .on('finish', function () {
          steps.push(2) // check that only called once
          assert.strictEqual(steps.length, 2)
          assert.strictEqual(res._internal.buffer.toString(), str)
          assert.strictEqual(res._internal.ended, true)
          assert.strictEqual(res.headersSent, true)
          assert.strictEqual(res.statusCode, 200)
          done()
        })
    })
    it('can stream using onFinish', function (done) {
      var steps = []
      var readable = new Readable()
      var res = new Response({
        onEnd: function () {
          steps.push(1) // check that only called once
        },
        onFinish: function () {
          steps.push(2) // check that only called once
          assert.strictEqual(steps.length, 2)
          assert.strictEqual(res._internal.buffer.toString(), str)
          assert.strictEqual(res._internal.ended, true)
          assert.strictEqual(res.headersSent, true)
          assert.strictEqual(res.statusCode, 200)
          done()
        }
      })
      readable.push(str)
      readable.push(null)

      readable.pipe(res)
    })
    it('call setHeader after end throws', function (done) {
      var res = new Response()
      res.end()
      try {
        res.setHeader(h[0], h[1])
      } catch (e) {
        assert.strictEqual(e.message, "Can't set headers after they are sent.")
        assert.strictEqual(res._internal.ended, true)
        assert.strictEqual(res.headersSent, true)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(res._internal.headers[h[0]], undefined)
        done()
      }
    })
  })
})
