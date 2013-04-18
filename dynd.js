#!/usr/bin/env node

var config = require('./lib/configure')
    daemon = require('daemon');

config.on('ready', function() {
  var emitter = require('events').EventEmitter,
      util    = require('util'),
      every   = require('./lib/every'),
      log     = require('./lib/logger')(config.settings.log);

  // Daemonise
  // TODO
  log('all', 'Daemon started with PID ' + process.pid);

  // Setup IP address resolver
  var resolve = require('./lib/resolve')(config);

  // Setup DynDNS
  var dyndns = require('./lib/dyndns')(config);
  
  dyndns.on('complete', function() {
    log('all', 'DynDNS update cycle completed.');

  }).on('success', function(status) {
    log('dyn', 'DynDNS: ' + status);

  }).on('error', function(status, fatal) {
    log('fail', 'DynDNS: ' + status);
    if (fatal) { scheduler.stop(); }
  });

  // This is basically an event aggregator
  var ipAggregator = function() {
    var me    = this,
        addrs = { local: null, host: null };

    this.update = function(type) {
      return function(ip) {
        addrs[type] = ip;

        if (addrs.local && addrs.host) {
          if (addrs.local != addrs.host) {
            me.emit('change', addrs.local);
          } else {
            me.emit('noop');
          }
        }
      };
    };

    this.fail = function() { me.emit('fail'); };
  };
  util.inherits(ipAggregator, emitter);

  // Schedule
  var scheduler = every(config.settings.refresh).on('tick', function() {
    log('all', 'Scheduled check initialised...');

    // Setup IP comparator
    // This triggers the update :)
    var comparator = new ipAggregator();

    comparator.on('change', function(ip) {
      log('all', 'DynDNS update initialised...');
      dyndns.update(ip);

    }).on('noop', function() {
      log('all', 'No update required.');

    }).on('fail', function() {
      log('fail', 'Could not resolve external IP address. Cannot update DynDNS.');
    });

    // Setup IP resolver listeners
    resolve.local.once('done', comparator.update('local'));
    resolve.local.once('fail', comparator.fail);

    resolve.host.once('done', comparator.update('host'));
    
    // Resolve IPs
    resolve.getAll();

  }).on('stop', function() {
    // Scheduler forcibly stopped => Fatal error :(
    log('fail', 'Fatal error! Shutting down daemon...');
    process.exit(1);
  });
});
