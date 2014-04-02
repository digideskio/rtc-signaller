var createPeers = require('./helpers/createPeers');
var peers = createPeers(3);
var messenger = peers.shift();

// test signalling logic
// require('./to')(messenger, peers);

require('./announce-concurrent');
require('./announce-debounce');
require('./peer-filter');
require('./set-id');
require('./events');

// inspect generated messages
require('./announce-raw')(messenger, peers);
// require('./custom-metadata');

if (typeof window != 'undefined') {
  // test primus loading
  require('./load-primus');

  // test automatic messenger implementation
  require('./auto-primus');

  // test native browser websocket support
  require('./browser-websockets');
}
