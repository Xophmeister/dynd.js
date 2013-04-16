#!/usr/bin/env node

var package = require('./package.json'),
    config  = require('./lib/configure')
    daemon  = require('daemon');

config.on('ready', function() {
  // Create daemon
});
