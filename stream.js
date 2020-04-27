function isFunction (f) {
  return 'function' === typeof f
}
module.exports = function (stream, name) {
  var source, sink, waiting, ready, write_cb
  if(isFunction(stream) && stream.length == 2)
    source = stream
  else if(isFunction(stream) && stream.length == 1)
    sink = stream
  else
    source = stream.source, sink = stream.sink

  var ready, ended

  if(sink)
    sink(function (abort, cb) {
      if(abort)
        write_close(abort)
      else if(ready) {
          var _ready = ready
          ready = null
          var _write_cb = write_cb; write_cb = null
          cb(null, _ready) //immediately call stream to say they can read again
          _write_cb(_ready)
      }
      else {
        waiting = cb
      }
    })

  return {
    read_request: function (cb) {
      if(source) source(null, function (e, b) { cb(e, b || null) })
      else cb(new Error((name || 'unnamed stream') + ' is not a source'))
    },
    read_close: function (code, cb) {
      if(source) source(code, function (e, b) { cb(e, b || null) })
      else cb(new Error((name || 'unnamed stream') + ' is not a source'))
    },
    write_close: function (code, _cb) {
      if(waiting) {
        var _w = waiting; waiting = null
        cb = _cb; _cb = null
        //call the sink stream, and give it data.
        _w(code, null)
        //callback to the reader
        cb()
      }
      else {
        ended = code || true
        write_cb = _cb
      }
    },
    write_ready: function (buffer, _cb) {
      if(waiting) {
        var _w = waiting; waiting = null
        cb = _cb; _cb = null
        //call the sink stream, and give it data.
        _w(null, buffer || null)
        //callback to the reader
        cb()
      }
      else {
        ready = buffer
        write_cb = _cb
      }
    }
  }
}
