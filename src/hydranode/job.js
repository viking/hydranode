var sys = require('sys');
var dbClient = require('../../vendor/mysql/mysql/client');
var dbPool = require('../../vendor/mysql/mysql/pool');

function spawnDbConnection() {
  var db = dbClient.createTCPClient();
  db.auto_prepare = true;
  db.auth('hydranode', 'hydranode', 'hydranode');
  return(db);
}
var pool = new dbPool.pool(spawnDbConnection);

var Job = function(attribs) {
  this.attribs = typeof(attribs) == 'undefined' ? {} : attribs;
}

Job.all = function(callback) {
  var records = [];
  pool.get(function(db) {
    var cmd = db.execute("SELECT COUNT(*) FROM jobs");
    cmd.addListener('row', function(r) {
      var count = r[0];
      cmd = db.execute("SELECT id, program, arguments, description, owner_ip FROM jobs");
      cmd.addListener('row', function(r) {
        records.push(new Job({
          id: r[0],
          program: r[1],
          arguments: r[2],
          description: r[3],
          owner_ip: r[4]
        }));
        if (records.length == count) {
          callback(records);
        }
      });
    });
  });
}

Job.find = function(id, callback) {
  pool.get(function(db) {
    var cmd = db.execute("SELECT COUNT(*) FROM jobs WHERE id = ?", [id]);
    cmd.addListener('row', function(r) {
      if (r[0] == 0) {
        callback(null);
        return;
      }

      cmd = db.execute("SELECT id, program, arguments, description, owner_ip FROM jobs WHERE id = ?", [id]);
      cmd.addListener('row', function(r) {
        var record = new Job({
          id: r[0],
          program: r[1],
          arguments: r[2],
          description: r[3],
          owner_ip: r[4]
        });
        callback(record);
      });
    });
  });
}

Job.prototype = {
  save: function() {
    var self = this;
    pool.get(function(db) {
      var values = [
        self.attribs.program,
        self.attribs.arguments || '',
        self.attribs.description || '',
        self.attribs.owner_ip
      ];
      db.execute("INSERT INTO jobs (program, arguments, description, owner_ip, created_at) VALUES(?, ?, ?, ?, NOW())", values);
    });
  }
}

exports.Job = Job;
