//var toPull = require('stream-to-pull-stream')
//interfaces[0] = Stream(toPull.source (process.stdin))
//interfaces[1] = Stream(toPull.sink   (process.stdout))
//interfaces[2] = Stream(toPull.sink   (process.stderr))

module.exports = function (createInstance, service_request) {
  var interfaces = {}
  var memory, i_exports

  function updateMem() {
    //check if we need to reset the memory buffer, because
    //the instance has grown the memory.
    if(!memory || memory.length !== instance.memory.buffer)
      memory = Buffer.from(instance.memory.buffer)
  }

  function write(buffer, start, id) {
    var _buffer = buffer.slice(0, bytes)
    var length = Math.min(buffer.length, bytes)
    updateMem()
    buffer.copy(memory, start, 0, length)
    if(length < buffer.length)
      queue.push(buffer.slice(length))
    return length
  }

  function slice (start, bytes) {
    updateMem()
    return memory.slice(start, start+bytes)
  }

  var instance = createInstance({
    system: {
      //a wasm instance requesting to read data from the outside world.
      //they have allocated `bytes` at `start`.
      //the data read can be written into here.
      //it may not fill the available space up the whole way.
      //if the data was immediately available
      //read_request returns length, the number of bytes available.
      //else, when it's ready instance.read_ready (id, start, length)
      //bytes will always be 0 <= bytes < length
      //if it's 0 that means the stream has ended.

      read_request: function (id, start, bytes) {
        if(!interfaces[id])
          throw new Error('interface:'+id+' does not exist')
        if(queue[id].length)
          return write(queue.shift(), start, bytes, id)
        else {
          var async = false, length = 0
          interface[id].read_request(
            function (err, buffer) {
              if(err) instance.read_close(err.code || 1)
              else {
                length = write(buffer, start, bytes, id)
                if(async) interface[id].read_ready(id, start, length)
              }
            })
          async = true
          return length
        }
      },
      //write to a stream.
      //here the wasm instance makes puts the data they wish
      //to write into memory at start, and then informs the system
      //it's there. it's then passed to the interface.
      //when it's been processed, write_request(id) is called.
      //if you make want to write a lot of bytes, it just waits
      //until it's processed them all before calling back.
      //
      //if something goes wrong, write_close(code) is called.
      write_ready : function (id, start, bytes) {
        updateMem()
        if(!interfaces[id])
          throw new Error('interface:'+id+' does not exist')
        var async = false, length = 0
        interfaces[id].write_ready(slice(start, bytes), function (err) {
          if(err) instance.write_close(err)
          else {
            if(async) instance.write_request(id)
            else length = buffer.length
          }
        })
        async = true
        return 1
      },

      //open a new interface. the instance may choose
      //the id they will use. how it works is their internal
      //detail.
      //like with the other methods, there are bytes associated.
      //in open_request these bytes describe the service
      //to be opened. the read_request, write_ready, read_close,
      //write_close methods can then be used.

      //services can be provided by other wasm instances.
      //or by the system we are running on.

      //then there is some protocol for choosing the meaning
      //of those bytes. having trouble deciding between
      //protocol: string or a binary magic number. I guess
      //if the first 4 bytes are a-zA-Z0-9_- then we can
      //interpret it as a protocol. we can always move to binary
      //version later.

      service_request: function (id, start, bytes) {
        var async = false
        service_request(slice(start, bytes), function (err, interface) {
          if(err)
            return instance.service_close(id, err)
          interfaces[id] = interface
          if(async) instance.service_ready(id)
          else      result = 1
        }
        async = true
        if(result) return result
      }
    }
  })

  if(!instance.memory) throw new Error('instance must export memory')

  if(instance.exports.ready)
    i_exports.ready()

  return { interfaces, queue, instance }
}
