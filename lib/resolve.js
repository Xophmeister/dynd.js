// Resolve IP address of local and host 

// Requires configuration object, returns object with two emitters:
//   local   Local IP resolver
//   host    Host IP resolver

// Resolver Events:
//   done    IP returned
//   fail    No IP returned (can be suppressed)

// Resolver Functions:
//   get     Fetch IP address

// Global Functions:
//   getAll  Runs local.get and host.get

(function() {
  var emitter = require('events').EventEmitter,
      util    = require('util');

  // Check IPv4 address is valid and not in a reserved subnet
  var goodIP = (function() {
    var net     = require('net'),
        netmask = require('netmask').Netmask;

    var reservedSubnets = [ '0.0.0.0/8',
                            '127.0.0.0/8',
                            '192.0.2.0/24',
                            '10.0.0.0/8',
                            '172.16.0.0/12',
                            '192.168.0.0/16',
                            '169.254.0.0/16',
                            '192.88.99.0/24',
                            '224.0.0.0/4',
                            '240.0.0.0/4'
                          ].map(function(subnet) { return new netmask(subnet); });

    return function(ip) {
      return net.isIPv4(ip) &&
             !reservedSubnets.some(function(subnet) { return subnet.contains(ip); });
    };
  })();

  // Generic resolver
  // IP validation is done by getters
  var generic = function(getFn, suppressFailure) {
    var me = this;

    // By default, we don't suppress failures, which are determined
    // by null being passed through the callback
    suppressFailure = suppressFailure || false;
    
    this.get = function() {
      getFn(function(response) {
        var event = (suppressFailure || response) ? 'done' : 'fail';
        me.emit(event, response);
      });
    };
  };
  util.inherits(generic, emitter);

  // Default web service for local IP
  var defaultService = 'http://ipecho.net/plain';

  module.exports = function(config) {
    // Local IP resolver
    var getLocalIP = function(callback) {
      var nics = require('os').networkInterfaces(),
          http = require('http');

      var method  = config.settings.network || defaultService,
          goodURL = function(url) { return /^http:\/\//i.test(url); },
          ip;

      // Check NICs, if appropriate
      if (!goodURL(method) && nics.hasOwnProperty(method)) {
        ip = nics[method].filter(function(nic) {
               return goodIP(nic.address)  &&
                      nic.family == 'IPv4' &&
                      !nic.internal;
             })[0];

        if (ip) { callback(ip.address); }
        else    { method = defaultService; }
      }

      // Otherwise, fallback to web service
      if (!ip) {
        if (goodURL(method)) {
          http.get(method, function(response) {
            response.on('data', function(data) {
              ip = data.toString().trim();
              callback(goodIP(ip) ? ip : null);
            });
          });

        } else {
          // Can't get IP from anywhere :P
          callback(null);
        }
      }
    };

    // Host IP resolver
    var getHostIP = function(callback) {
      var dns = require('dns');

      var updateIP = function(ip) {
        // Update cache, if necessary
        if (goodIP(ip) && ip != config.account.lastKnownIP) {
          config.update('lastKnownIP', ip);
        }

        // Pass IP to callback
        callback(ip);
      };

      if (config.settings.lookup) {
        // DNS lookup: DynDNS doesn't like you doing this :P
        dns.resolve4(config.account.hosts[0], function(err, addrs) {
          var response = !err && addrs.length && goodIP(addrs[0]) ? addrs[0] : 'Unknown';
          updateIP(response);
        });

      } else {
        // Cached IP
        var response = goodIP(config.account.lastKnownIP) ? config.account.lastKnownIP : 'Unknown';
        updateIP(response);
      }
    };

    return {
      local:  new generic(getLocalIP),
      host:   new generic(getHostIP, true),

      getAll: function() {
                this.local.get();
                this.host.get();
              }
    };
  };
})();
