// Simple interface for firing an event after a specified number of
// minutes. References actual times, to avoid setInterval drift.

// n.b., This has been designed for relatively long periods. Shorter
// periods may be used, but the accuracy must be refined accordingly.

(function() {
  var emitter = require('events').EventEmitter,
      util    = require('util');

  module.exports = function(minutes, accuracy) {
    var me = this,
        timer, start, lastTick, ticks;

    // Convert to ms and default accuracy to 1s
    accuracy = (accuracy || 1) * 1000;
    minutes *= 60000;
    
    this.start = function() {
      start = new Date();
      lastTick = null;
      ticks = 0;
      
      // We use the global timers to check the time difference
      timer = setInterval(function() {
        var now = new Date(), drift;

        if (now - lastTick > 2 * accuracy) {
          drift = (now - start) % minutes;
          if (drift > minutes / 2) drift -= minutes;

          if (Math.abs(drift) < accuracy) {
            lastTick = now;
            me.emit('tick', ++ticks, drift);
          }
        }
      }, accuracy);

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
               minutes / 60000,
               ticks,
               timer ? 'Running' : 'Stopped'
             ].join(' ') + '>';
    };

    // Don't start until someone's watching for ticks
    this.on('newListener', function(event) {
      if (event == 'tick' && !timer) me.start();
    });
  };
  util.inherits(module.exports, emitter);
})();
