var sys = require('sys');
var commands = require('./commands');

var Session = function(parent, stream) {
  var self = this;
  stream.setEncoding('binary');
  stream.addListener('data', function(data) { self.process(data) });

  this.parent = parent;
  this.stream = stream;
  this.command = null;
}

Session.prototype = {
  error: function(msg) {
    this.command = null;
    this.stream.write("ERROR: "+msg+"\n");
  },
  process: function(data) {
    var message = data.replace(/[\r\n]*$/, "");
    if (this.command) {
      /* command in progress */
      if (!this.command.process(message)) {
        return this.error(this.command.error);
      }
    }
    else {
      var parts = message.split(/\s+/);
      var name = parts.shift().toUpperCase();
      if (commands.include(name)) {
        this.command = new commands.Command(name);
        if (!this.command.addInlineArgs(parts)) {
          return this.error(this.command.error);
        }
      }
      else {
        for (key in commands) {
          if (key.match(/^[A-Z]$/))
            this.stream.write(key + "\n");
        }
        return this.error("Invalid command: "+name);
      }
    }
    if (this.command.status == "ready") {
      this.command.run(this);
      this.command = null;
    }
  }
}

exports.Session = Session;
