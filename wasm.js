
module.exports = function (wasm) {
  return function (imports) {
    var m = new WebAssembly.Module(buf)
    var i = new WebAssembly.Instance(m, imports)
    return i.exports
  }
}

file:
stdo:
stdi:
stde:
net :
dgra:
https:
