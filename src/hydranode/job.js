require.paths.unshift(__dirname + '/../../vendor/mongoose');
var mongoose = require('mongoose').Mongoose;

mongoose.model('Job', {
  properties: [ '_id', 'program', 'version', 'arguments', 'description', 'owner', 'taker', 'created_at', 'updated_at', 'started_at', 'finished_at' ],
  cast: {
    program: String,
    version: String,
    arguments: String,
    description: String,
    owner: String,
    taker: String,
    created_at: Date,
    updated_at: Date,
    started_at: Date,
    finished_at: Date
  },
});

var db = mongoose.connect('mongodb://localhost/hydranode');
exports.Job = db.model('Job');
