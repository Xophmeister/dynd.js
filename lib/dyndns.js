// DynDNS RESTful update interface

// Constructor:
//   config      Configuration object

// Events:
//   complete    When update has completed
//   success     When update was successful, with return string
//   error       When update failed, with return string

// Functions:
//   update(ip)  Update account with IP address

(function() {
  var emitter = require('events').EventEmitter,
      util    = require('util');

  // Update return codes
  var statusCodes = {
    success: {
      'good':     'Account updated successfully.',
      'nochg':    'No change to account necessary. Do not abuse the service!'
    },
    failure: {
      'badauth':  'Could not authenticate account credentials. Please check your username and password.',
      '!donator': 'Account does not have access to premium features.',
      'notfqdn':  'Not a fully qualified domain name: {hosts}',
      'nohost':   'Not hosted under this account: {hosts}',
      'numhost':  'Too many hosts specified for update.',
      'abuse':    'Service is blocked due to abuse.',
      'badagent': 'Malformed update request to service.',
      'dnserr':   'Unspecified DNS error.',
      '911':      'Service is down or undergoing maintenance. Try again later.'
    }
  };

  var constructor = function(config) {
    this.update = function(ip) {
      // TODO
    };
  };
  util.inherits(constructor, emitter);

  module.exports = function(config) { return new constructor(config); };
})();
