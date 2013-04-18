// DynDNS RESTful update interface

// Constructor:
//   config      Configuration object

// Events:
//   complete    When update has completed
//   success     When update was successful, with return string
//   error       When update failed, with return string and fatal flag

// Functions:
//   update(ip)  Update account with IP address

(function() {
  var emitter    = require('events').EventEmitter,
      util       = require('util'),
      httpStatus = require('http').STATUS_CODES;

  // DynDNS update service
  var dynService = function(config) {
    var output = { 
      hostname: 'members.dyndns.org',
      headers:  {
                  'User-Agent': (function() {
                    var package = require('../package.json');
                    return [package.author, package.name, package.version].join(' - ');
                  })()
                },
      auth:     '{username}:{password}'
    };

    // Set tokens with appropriate values
    output.port = config.settings.secure ? 443 : 80;
    output.auth = output.auth.replace('{username}', config.account.username)
                             .replace('{password}', config.account.password);

    return function(ip) {
      output.path = '/nic/update?hostname={hosts}&myip={ip}'
                      .replace('{hosts}', config.account.hosts.join())
                      .replace('{ip}', ip);

      return output;
    };
  };
  
  var statusCodes = (function() {
    var codes = {
      success: {
        'good':     'Account updated successfully.',
        'nochg':    'No change to account necessary. Do not abuse the service!'
      },
      failure: {
        '!donator': 'Account does not have access to premium features.',
        'badagent': 'Malformed update request to service.',
        'dnserr':   'Unspecified DNS error.',
        '911':      'Service is down or undergoing maintenance. Try again later.'
      },
      fatal: {
        'badauth':  'Could not authenticate account credentials. Please check your username and password.',
        'notfqdn':  'Host is not a fully qualified domain name. Please check your settings.',
        'nohost':   'Cannot update host that is not hosted under this account. Please check your settings.',
        'numhost':  'Too many hosts specified for update. Please check your settings.',
        'abuse':    'Service is blocked due to abuse.',
        '_unknown': 'An unknown error occurred.'
      }
    };

    // Flatten the above
    var output = {};
    for(var type in codes) {
      for(var code in codes[type]) {
        output[code] = { status: codes[type][code],
                         event:  type == 'success' ? type : 'error',
                         fatal:  type == 'fatal' }
      }
    }

    return output;
  })();

  var constructor = function(config) {
    var client = require(config.settings.secure ? 'https' : 'http'),
        me     = this,
        dyn    = dynService(config);

    var done = function(event, status, fatal) {
      me.emit(event, status, fatal);
      me.emit('complete');
    };

    this.update = function(ip) {
      client.get(dyn(ip), function(rest) {
        if (rest.statusCode != 200) {
          // HTTP problem
          done('error', 'HTTP ' + rest.statusCode + ': ' + httpStatus[rest.statusCode], true);

        } else {
          // Process returned data
          rest.on('data', function(data) {
            var code  = data.toString().split(' ')[0],
                state = statusCodes[code] || statusCodes['_unknown'];

            done(state.event, state.status, state.fatal);
          });
        }
      });
    };
  };
  util.inherits(constructor, emitter);

  module.exports = function(config) { return new constructor(config); };
})();
