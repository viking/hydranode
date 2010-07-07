var sys = require('sys');
var job = require('./job');
var ObjectID = require('mongodb').ObjectID;

exports.SCHEDULE = {
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
};
exports.LIST = {
  callback: function() {
    var self = this;
    job.Job.find({ taker: null }).all(function(records) {
      for (var i = 0; i < records.length; i++) {
        self.stream.write(records[i]._id.toHexString()+"\n");
      }
      self.stream.write(".\n");
    });
  }
};
exports.JOB = {
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
};
exports.TAKE = {
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
};
exports.FINISH = {
  attachment: 'result',
  arguments: {
    job_id: { type: 'string', required: true },
  },
  callback: function(data) {
    // TODO
  }
};
exports.QUIT = {
  callback: function() {
    this.stream.end();
  }
};

exports.include = function(name) {
  return typeof(exports[name]) != 'undefined';
};

exports.Command = function(name) {
  this.name = name;
  this.error = null;
  this.arguments = {};
  this.numArgs = 0;
  this.status = "new";
};
exports.Command.prototype = {
  addInlineArgs: function(args) {
    /* validate arguments */
    if (exports[this.name].multiline) {
      if (args.length > 0) {
        this.error = "Incorrect number of arguments ("+args.length+" for 0)";
        return false;
      }
      this.status = "waiting for arguments";
    }
    else {
      /* single-line command */
      var index = 0;
      var invalid = false;
      for (key in (exports[this.name].arguments || {})) {
        if (index >= args.length) {
          invalid = true;
        }
        else {
          this.arguments[key] = args[index];
          this.numArgs++;
        }
        index++;
      }

      if (invalid) {
        this.error = "Incorrect number of arguments ("+args.length+" for "+index+")";
        return false;
      }

      if (exports[this.name].attachment) {
        /* wait for binary data */
        this.status = "waiting for attachment";
      }
      else {
        this.status = "ready";
      }
    }
    return true;
  },
  process: function(data) {
    if (data.match(/^.$/)) {
      /* command finished; check for required */
      var errors = [];
      for (key in exports[this.name].arguments) {
        var opts = exports[this.name].arguments[key];
        if (opts.required && (!this.arguments[key] || this.arguments[key] == "")) {
          errors.push(key + " is required.");
        }
      }
      if (errors.length > 0) {
        this.error = errors.join("\n  ");
        return false;
      }
      this.status = "ready";
      return true;
    }
    else {
      var md = data.match(/^\s*(\w+):\s*(.+)$/);
      if (!md) {
        this.error = "Invalid argument format.";
        return false;
      }

      var key = md[1].toLowerCase();
      var value = md[2];
      if (!exports[this.name].arguments[key]) {
        this.error = "Invalid key: "+key;
        return false;
      }

      this.arguments[key] = value;
      this.numArgs++;
      return true;
    }
  },
  run: function(context) {
    exports[this.name].callback.apply(context, (this.numArgs == 0 ? [] : [this.arguments]));
  }
};
