#!/usr/bin/env node

var config = require('./lib/configure')
    daemon = require('daemon');

config.on('ready', function() {
  var emitter = require('events').EventEmitter,
      util    = require('util'),
      every   = require('./lib/every');

  // Setup IP address resolver
  var resolve = require('./lib/resolve')(config);

  // Setup DynDNS
  var dyndns = require('./lib/dyndns')(config);
  
  dyndns.on('complete', function() {
    // TODO
    // Completion handler

  }).on('success', function(status) {
    // TODO
    // Success handler

  }).on('error', function(status) {
    // TODO
    // Error handler

  });

  // This is basically an event aggregator
  var ipAggregator = function() {
    var me = this;

    this.local = null;
    this.host  = null;

    this.update = function(type) {
      return function(ip) {
        me[type] = ip;

        if (me.local && me.host) {

          if (me.local != me.host) {
            me.emit('change', me.local);

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
  every(config.settings.refresh).on('tick', function() {
    // Setup IP comparator
    // This triggers the update :)
    var comparator = new ipAggregator();

    comparator.on('change', function(ip) {
      // TODO
      dyndns.update(ip);

    }).on('noop', function() {
      // TODO
      // Do nothing

    }).on('fail', function() {
      // TODO
      // Error handler

    });

    // Setup IP resolver listeners
    resolve.local.once('done', comparator.update('local'));
    resolve.local.once('fail', comparator.fail);

    resolve.host.once('done', comparator.update('host'));
    
    // Resolve IPs
    resolve.getAll();
  });
});
