var sys = require('sys');
var job = require('./job');
var ObjectID = require('mongodb').ObjectID

var Session = function(parent, stream) {
  var self = this;
  stream.setEncoding('utf8');
  stream.addListener('data', function(data) { self.process(data) });

  this.parent = parent;
  this.stream = stream;
  this.command = null;
  this.data = null;
}

Session.prototype = {
  commands: {
    SCHEDULE: {
      multiline: true,
      arguments: {
        program:     { type: 'string', required: true },
        arguments:   { type: 'string' },
        description: { type: 'string' }
      },
      callback: function(data) {
        data.owner = this.stream.remoteAddress;
        var record = new job.Job(data);
        record.save();
        this.stream.write("OK\n");
      }
    },
    LIST: {
      callback: function() {
        var self = this;
        job.Job.find({ taker: null }).all(function(records) {
          for (var i = 0; i < records.length; i++) {
            self.stream.write(records[i]._id.toHexString()+"\n");
          }
          self.stream.write(".\n");
        });
      }
    },
    JOB: {
      arguments: {
        job_id: { type: 'string', required: true }
      },
      callback: function(data) {
        var self = this;
        var _id = ObjectID.createFromHexString(data.job_id);
        job.Job.findById(_id, function(record) {
          if (record == null)
            return self.error("Invalid job.");

          /*
            var lines = [
              "Program: " + record.program,
              "Arguments: " + record.arguments,
            ];
            if (record.description)
              lines.push("Description: " + record.description);
            lines.push('.', '');
            self.stream.write(lines.join("\n"));
          */
          self.stream.write(record.toJSON()+"\n");
        });
      }
    },
    TAKE: {
      arguments: {
        job_id: { type: 'string', required: true }
      },
      callback: function(data) {
        var self = this;
        var _id = ObjectID.createFromHexString(data.job_id);
        job.Job.findById(_id, function(record) {
          if (record == null)
            return self.error("Invalid job.");
          if (record.taker)
            return self.error("Job already taken.");

          record.taker = self.stream.remoteAddress;
          record.started_at = new Date();
          record.save();
          self.stream.write("OK\n");
        });
      }
    },
    FINISH: {
      multiline: true,
      arguments: {
        job_id: { type: 'string', required: true },
        length: { type: 'integer', required: true },
        output: { type: 'binary', required: true }
      },
      callback: function(data) {
        // TODO
      }
    },
    QUIT: {
      callback: function() {
        this.stream.end();
      }
    }
  },
  error: function(msg) {
    this.command = null;
    this.data = null;
    this.stream.write("ERROR: "+msg+"\n");
  },
  process: function(data) {
    var message = data.replace(/[\r\n]*$/, "");
    if (this.command) {
      /* multi-line command in progress */
      if (message.match(/^.$/)) {
        /* command finished; check for required */
        var errors = [];
        for (key in this.command.arguments) {
          var opts = this.command.arguments[key];
          if (opts.required && (!this.data[key] || this.data[key] == "")) {
            errors.push(key + " is required.");
          }
        }
        if (errors.length > 0) {
          return this.error(errors.join("\n  "));
        }

        this.command.callback.call(this, this.data);
        this.command = null;
        this.data = null;
        return;
      }

      var md = message.match(/^\s*(\w+):\s*(.+)$/);
      if (!md)
        return this.error("Invalid argument format.");

      var key = md[1].toLowerCase();
      var value = md[2];
      if (!this.command.arguments[key])
        return this.error("Invalid key: "+key);

      this.data[key] = value;
    }
    else {
      var parts = message.split(/\s+/);
      this.command = this.commands[parts[0].toUpperCase()];
      if (this.command) {
        parts.shift();
        /* validate arguments */
        if (this.command.multiline) {
          if (parts.length > 0) {
            return this.error("Incorrect number of arguments ("+parts.length+" for 0)");
          }
          this.data = {};
        }
        else {
          /* single-line command */
          var args = {};
          var index = 0;
          var invalid = false;
          for (key in (this.command.arguments || {})) {
            if (index >= parts.length) {
              invalid = true;
            }
            else {
              args[key] = parts[index];
            }
            index++;
          }

          if (invalid) {
            return this.error("Incorrect number of arguments ("+parts.length+" for "+index+")");
          }
          this.command.callback.apply(this, (index == 0 ? [] : [args]));
          this.command = null;
        }
      }
      else {
        for (key in this.commands) {
          this.stream.write(key + "\n");
        }
        this.stream.write("Invalid command: "+parts[0]+"\n");
      }
    }
  }
}

exports.Session = Session;
