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

Job.columns = ["id", "program", "arguments", "description", "created_by", "taken_by", "result"];

function instantiate(row) {
  var attribs = {};
  for (var i = 0; i < Job.columns.length; i++) {
    attribs[Job.columns[i]] = row[i];
  }
  return new Job(attribs);
}

Job.untaken = function(callback) {
  var records = [];
  Job.db(function(db) {
    var cmd = db.execute("SELECT COUNT(*) FROM jobs WHERE taken_by IS NULL");
    cmd.addListener('row', function(r) {
      var count = r[0];
      if (count == 0) {
        callback([]);
        return;
      }
      cmd = db.execute("SELECT "+Job.columns.join(", ")+" FROM jobs WHERE taken_by IS NULL");
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
  save: function(attribs) {
    var self = this;
    if (typeof(attribs) == 'undefined')
      attribs = self.attribs;

    Job.db(function(db) {
      var i, values = [], insert = !self.attribs.id;
      var sql = insert ?
        "INSERT INTO jobs SET created_at = NOW()" :
        "UPDATE jobs SET updated_at = NOW()";

      var col;
      for (col in attribs) {
        var val = attribs[col];
        if (col == "id")
          continue;

        if (typeof(val) != 'undefined') {
          sql += ", " + col + " = ";
          if (val == null) {
            sql += "NULL";
          }
          else if (val.match(/\(\)$/)) {
            sql += val;
          }
          else {
            sql += "?";
            values.push(val);
          }
        }
      }
      if (!insert) {
        sql += " WHERE id = ?";
        values.push(self.attribs.id);
      }
      sys.puts(sys.inspect(sql));
      sys.puts(values);
      db.execute(sql, values);
    });
  },
  take: function(taker) {
    this.save({
      taken_by: taker,
      taken_at: "NOW()"
    });
  }
};

exports.Job = Job;
