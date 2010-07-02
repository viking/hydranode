var net = require('net');
var sys = require('sys');

var Client = function(host, port, callback) {
  var self = this;

  this.stream = net.createConnection(port, host);
  this.stream.setEncoding('utf8');
  this.stream.addListener('connect', function() { callback.call(self); });
  this.stream.addListener('end', function() { this.end(); });
}

Client.prototype = {
  execute: function(cmd) {
    this.stream.write(cmd+"\n");
  },
  quit: function() {
    this.execute("QUIT");
  }
}

exports.Client = Client;
