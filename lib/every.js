// Simple interface for firing an event every specified number of
// minutes. References actual times, to avoid setInterval drift.

// n.b., This has been designed for relatively long periods. Shorter
// periods may be used, but the accuracy must be refined accordingly.

// Constructor:
//   minutes   Minutes between tick
//   accuracy  Seconds between check (optional; defaults to 1)

// Events:
//   tick      At each tick, with tick count and drift (in ms)
//   start     When timer starts; won't start until tick listener is added
//   stop      When timer stops

// Functions:
//   start     (Re)start the timer; starts automatically when tick listener added
//   stop      Stop the timer

(function() {
  var emitter = require('events').EventEmitter,
      util    = require('util');

  var constructor = function(schedule, resolution) {
    var me = this,
        timer, start, lastTick, ticks;

    this.start = function() {
      start = new Date();
      lastTick = null;
      ticks = 0;
      
      // We use the global timers to check the time difference
      timer = setInterval(function() {
        var now = new Date(), drift;

        if (now - lastTick > 2 * resolution) {
          drift = (now - start) % schedule;
          if (drift > schedule / 2) drift -= schedule;

          if (Math.abs(drift) < resolution) {
            lastTick = now;
            me.emit('tick', ++ticks, drift);
          }
        }
      }, resolution);

      me.emit('start');
    };

    this.stop = function() {
      clearInterval(timer);
      timer = null;
      me.emit('stop');
    };

    this.toString = function() {
      return '<Timer ' + [
               start.toISOString(),
               schedule / 60000,
               ticks,
               timer ? 'Running' : 'Stopped'
             ].join(' ') + '>';
    };

    // Start automatically when a tick listener is added (and the timer
    // isn't already running)
    this.on('newListener', function(event) {
      if (event == 'tick' && !timer) me.start();
    });
  };
  util.inherits(constructor, emitter);

  module.exports = function(minutes, accuracy) {
    // Convert to ms and default: schedule 10m; accuracy 1s
    return new constructor((minutes || 10) * 60000, (accuracy || 1) * 1000);
  };
})();
