var sys = require('sys');
var net = require('net');
var session = require('./session');

exports.Server = function() {
  var self = this;
  this.server = net.createServer(function(stream) {
    new session.Session(self, stream);
  });
}

exports.Server.prototype = {
  start: function() {
    this.server.listen(8124, 'localhost');
  },
}

