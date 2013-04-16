// Get interface/external IP

(function() {
  var emitter = require('events').EventEmitter,
      util    = require('util'),
      os      = require('os'),
      net     = require('net'),
      http    = require('http');

  var defaultService = 'http://ipecho.net/plain';

  module.exports = function(interface) {
    var me = this,
        lastKnownIP;

    // Default to web service
    interface = interface || defaultService;
    
    this.address = null;

    this.check = function() {
      var ip, nics = os.networkInterfaces();

      // Check NICs, if appropriate
      if (nics.hasOwnProperty(interface)) {
        ip = nics[interface].filter(function(nic) {
               return net.isIPv4(nic.address) &&
                      nic.family   == 'IPv4'  &&
                      nic.internal == false;
             })[0];

        if (ip) { this.emit('got', ip.address); }
      }

      // Otherwise, fallback to web
      // We assume interface is a valid URL
      if (!ip) {
        http.get(interface, function(response) {
          response.on('data', function(data) {
            data = data.toString();

            if (net.isIPv4(data)) { me.emit('got', data); }
            else { me.emit('error', new Error('Web IP service status: ' + this.statusCode)); }
          });
        });
      }
    };

    // Check for changes
    this.on('got', function(ip) {
      if (ip != lastKnownIP) {
        me.address = lastKnownIP = ip;
        me.emit('change', ip);
      }
    });

    // Only update once there's someone listening for changes
    this.on('newListener', function(event) { if (event == 'change') me.check(); });
  };
  util.inherits(module.exports, emitter);
})();
