
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');

var patchwork_exports = {};

patchwork_exports.startServer = function(options, success, error) {
  exec(success, error, "patchwork", "startServer", []);
};

patchwork_exports.stopServer = function(success, error) {
	  exec(success, error, "patchwork", "stopServer", []);
};

module.exports = patchwork_exports;

