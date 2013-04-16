// Get the master cipher from the crypto file. If this doesn't exist, we
// create a new one as root, so access is appropriately restricted.

// Events:
//   new    A new master cipher was created
//   ready  Ready to go
//
// Functions:
//   encrypt(plaintext, callback)
//   decrypt(ciphertext, callback)

(function() {
  if (process.getuid()) { throw new Error('Permission denied: Must be run as root!'); }

  var fs       = require('fs'),
      path     = require('path').join,
      emitter  = require('events').EventEmitter;
      crypto   = require('crypto'),
      uuid     = require('node-uuid'),
      uuidOpts = { rng: uuid.nodeRNG };

  // We generate a random AES256 key, but the user can edit the
  // crypto file manually to use different algorithms.
  var defaults = {
        file:      path(__dirname, '../config/crypto.json'),
        algorithm: 'aes256',
        keySize:   256,
      },

      user = {},
      output = module.exports = new emitter();

  fs.exists(defaults.file, function(exists) {
    if (exists) {
      var cryptoOpts = require(defaults.file),
          user       = { algorithm: cryptoOpts.algorithm,
                         key:       new Buffer(cryptoOpts.key, 'base64') };
    } else {
      var octets = defaults.keySize / 8,
          user   = { algorithm: defaults.algorithm,
                     key:       new Buffer(octets) };

      // Create new key
      while (octets--) { uuid.v4(uuidOpts, user.key, octets * 16); }

      // Write to file
      fs.writeFile(
        defaults.file,

        JSON.stringify({
          algorithm: user.algorithm,
          key:       user.key.toString('base64')
        }),

        {
          encoding: 'utf-8',
          flag:     'w',
          mode:     0660 // Only root has +rw
        },

        function(err) {
          if (err) { throw new Error('Couldn\'t create new master cipher.'); }
          output.emit('new');
        }
      );
    }

    // Make sure the cipher algorithm is available
    if (crypto.getCiphers().indexOf(user.algorithm) == -1) {
      throw new Error('Invalid cipher algorithm: ' + user.algorithm);

    } else {
      // Crypto wrapper functions
      user.crypto = function(encrypt) {
        var method = encrypt ? crypto.createCipher : crypto.createDecipher,
            encIn  = encrypt ? 'utf-8'  : 'base64',
            encOut = encrypt ? 'base64' : 'utf-8';
  
        return function(data, callback) {
          var cipher = method(user.algorithm, user.key)

          cipher.end(new Buffer(data, encIn), function() {
            callback(cipher.read().toString(encOut));
          });
        };
      };
  
      output.encrypt = user.crypto(true);
      output.decrypt = user.crypto(false);

      output.emit('ready');
    }
  });
})();
