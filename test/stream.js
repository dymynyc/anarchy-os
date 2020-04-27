var tape   = require('tape')
var Stream = require('../stream')
var pull   = require('pull-stream')

var a = Buffer.alloc(1024).fill('a')
var b = Buffer.alloc(1024).fill('b')
var c = Buffer.alloc(1024).fill('c')

var input = [a,b,c]

//includes a normal end
tape('source', function (t) {
  var api = Stream(pull.values(input))
  api.read_request((err, buffer) => {
    t.equal(buffer, a)
    api.read_request((err, buffer) => {
      t.equal(buffer, b)
      api.read_request((err, buffer) => {
        t.equal(buffer, c)
        api.read_request((err, buffer) => {
          t.equal(err, true)
          t.equal(buffer, null) //EOF
          t.end()
        })
      })
    })
  })
})

tape('source - abort', function (t) {
  var called = false
  var api = Stream(function (abort, cb) {
    t.equal(abort, 1)
    called = true
    cb()
  })

  api.read_close(1, function () {
    t.equal(called, true)
    t.end()
  })
})

// really it should be possible for the source stream
// to error on the reader without waiting for their call
// but pull streams cannot do that.

tape('source - abort 2', function (t) {
  var called = false
  var api = Stream(function (abort, cb) {
    if(abort) {
      t.equal(abort, 1)
      called = true
      cb()
    }
  })

  api.read_request(null)
  api.read_close(1, function () {
    t.equal(called, true)
    t.end()
  })
})

tape('sink', function (t) {
  var output = [], ended = false
  var api = Stream(function (read) {
    read(null, function next (err, buffer) {
      if(err)
        ended = err
      else if(buffer) {
        output.push(buffer)
        read(null, next)
      }
      else
        throw new Error('expected buffer')
    })
  })

  api.write_ready(a, function () {
    t.deepEqual(output, [a])
    api.write_ready(b, function () {
      t.deepEqual(output, [a, b])
      api.write_ready(c, function () {
        t.deepEqual(output, [a, b, c])
        t.end()
      })
    })
  })
})


tape('sink2', function (t) {
  var output = [], ended = false, caller
  var api = Stream(function (read) {
    if(caller) throw new Error('read in progress already')
    caller = function () {
      caller = null
      read(null, function next (err, buffer) {
        if(err)
          ended = err
        else if(buffer) {
          output.push(buffer)
          caller = function () { caller = null; read(null, next) }
        }
        else
          throw new Error('expected buffer')
      })
    }
  })

  var called1 = false, called2 = false, called3 = false
  api.write_ready(a, function () {
    called1 = true
    t.deepEqual(output, [a])
    api.write_ready(b, function () {
      called2 = true
      t.deepEqual(output, [a, b])
      api.write_ready(c, function () {
        called3 = true
        t.deepEqual(output, [a, b, c])
      })
      t.ok(caller)
      t.equal(called3, false); caller(); t.equal(called3, true)
    })
    t.ok(caller)
    t.equal(called2, false); caller(); t.equal(called2, true)
  })
  t.ok(caller)
  t.equal(called1, false); caller(); t.equal(called1, true)

  //this test is completely sync. but simulates async,
  //because we call write, then the actual read is triggered.
  t.equal(called2, true)
  t.equal(called3, true)
  t.end()
})


tape('sink - abort', function (t) {
  var output = [], ended = false
  var api = Stream(function (read) {
    read(null, function next (err, buffer) {
      if(err)
        ended = err
      else if(buffer) {
        output.push(buffer)
        read(null, next)
      }
      else
        throw new Error('expected buffer')
    })
  })

  api.write_close(1, function () {
    t.equal(ended, 1)
    t.end()
  })
})
