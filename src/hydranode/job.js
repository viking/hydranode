var sys = require('sys');
var dbClient = require('../../vendor/mysql/mysql/client');
var dbPool = require('../../vendor/mysql/mysql/pool');

var Job = function(attribs) {
  this.attribs = typeof(attribs) == 'undefined' ? {} : attribs;
};

function spawnDbConnection() {
  var db = dbClient.createTCPClient();
  db.auto_prepare = true;
  db.auth('hydranode', 'hydranode', 'hydranode');
  return(db);
}

Job.db = function(callback) {
  if (!Job.pool) {
    Job.pool = new dbPool.pool(spawnDbConnection, 0);
  }
  Job.pool.get(callback);
};

Job.columns = ["id", "program", "arguments", "description", "owner_ip"];

function instantiate(row) {
  var attribs = {};
  for (var i = 0; i < Job.columns.length; i++) {
    attribs[Job.columns[i]] = row[i];
  }
  return new Job(attribs);
}

Job.all = function(callback) {
  var records = [];
  Job.db(function(db) {
    var cmd = db.execute("SELECT COUNT(*) FROM jobs");
    cmd.addListener('row', function(r) {
      var count = r[0];
      cmd = db.execute("SELECT "+Job.columns.join(", ")+" FROM jobs");
      cmd.addListener('row', function(r) {
        records.push(instantiate(r));
        if (records.length == count) {
          callback(records);
        }
      });
    });
  });
};

Job.find = function(id, callback) {
  Job.db(function(db) {
    var cmd = db.execute("SELECT COUNT(*) FROM jobs WHERE id = ?", [id]);
    cmd.addListener('row', function(r) {
      if (r[0] == 0) {
        callback(null);
        return;
      }

      cmd = db.execute("SELECT "+Job.columns.join(", ")+" FROM jobs WHERE id = ?", [id]);
      cmd.addListener('row', function(r) {
        var record = instantiate(r);
        callback(record);
      });
    });
  });
};

Job.prototype = {
  save: function() {
    var self = this;
    Job.db(function(db) {
      var values = [
        self.attribs.program,
        self.attribs.arguments || '',
        self.attribs.description || '',
        self.attribs.owner_ip
      ];
      db.execute("INSERT INTO jobs (program, arguments, description, owner_ip, created_at) VALUES(?, ?, ?, ?, NOW())", values);
    });
  }
};

exports.Job = Job;
