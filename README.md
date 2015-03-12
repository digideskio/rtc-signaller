# rtc-signaller

The `rtc-signaller` module provides a transportless signalling
mechanism for WebRTC.


[![NPM](https://nodei.co/npm/rtc-signaller.png)](https://nodei.co/npm/rtc-signaller/)

[![Build Status](https://img.shields.io/travis/rtc-io/rtc-signaller.svg?branch=master)](https://travis-ci.org/rtc-io/rtc-signaller) [![stable](https://img.shields.io/badge/stability-stable-green.svg)](https://github.com/dominictarr/stability#stable) 
[![Gitter chat](https://badges.gitter.im/rtc-io.png)](https://gitter.im/rtc-io)



## Purpose

The signaller provides set of client-side tools that assist with the setting up an `PeerConnection` and helping them communicate. All that is required for the signaller to operate is a [suitable messenger](https://github.com/DamonOehlman/messenger-archetype).  A messenger is simply a function that is able to create a [pull-stream](https://github.com/dominictarr/pull-stream) `Source` and/or `Sink`.  From version `5.0.0` the `rtc-signaller` package will use pull-streams to ensure robust delivery of messages.

By using this approach, we can conduct signalling over any number of mechanisms:

- local, [in memory](https://github.com/DamonOehlman/messenger-memory) message passing
- via [WebSockets](https://github.com/DamonOehlman/messenger-ws) and higher level abstractions (such as [primus](https://github.com/primus/primus))

In the event that you want to implement a signaller without using pull-streams, then you can work from a base signaller using the [`rtc-signal/signaller`](https://github.com/rtc-io/rtc-signal/blob/master/signaller.js) implementation.


## Getting Started

While the signaller is capable of communicating by a number of different
messengers (i.e. anything that can send and receive messages over a wire)
it comes with support for understanding how to connect to an
[rtc-switchboard](https://github.com/rtc-io/rtc-switchboard) out of the box.

The following code sample demonstrates how:

```js
// create a new signaller, connecting to the target switchboard
var messenger = require('rtc-switchboard-messenger');
var signaller = require('rtc-signaller')(messenger('//switchboard.rtc.io/'));

// when a new peer is announced, log it
signaller.on('peer:announce', function(data) {
 console.log('new peer found in room: ', data);
});

// for our sanity, pop a message once we are connected
signaller.once('connected', function() {
  console.log('we have successfully connected');
});

// send through an announce message
// this will occur once the websocket has been opened and active
signaller.announce({ room: 'signaller-getting-started' });

```

## Signaller Events

There are a number of events that are generating throughout the lifecycle of a signaller.

### Events regarding local state

The following events are generated by the signaller in response to updates n it's own state:

- `connected`

  A connection has been established via the underlying messenger to a signalling server (or equivalent).

- `disconnected`

  The connection has been lost (possibly temporarily) with the signalling server (or transport).  It is possible that the connection will be re-established so this does not necessarily mean the end.

- `local:announce`

  This event is trigged when an `/announce` message is sent via the messenging channel.  The event includes a single `data` argument which contains the object data that has been sent.

### Events regarding peer state

The following events relate to information that has been relayed to this signaller about other peers:

- `peer:filter`

  The `peer:filter` event is triggered prior to the `peer:announce` or `peer:update` events being fired and provides an application the opportunity to reject a peer.  The handler for this event is passed the id of the peer that has connected to the room and a JS `data` object for the announce data. This data only differs from the `peer:announce` (or `peer:update`) data in that an `allow` attribute is included and controls whether we will acknowledge the presence of this new peer.

  Due to the way event emitters behave in node, the last handler invoked is the authority on whether the peer is accepted or not (so make sure to check the previous state of the allow flag):

  ```js
  // only accept connections from Bob
  signaller.on('peer:filter', function(id, data) {
    data.allow = data.allow && (data.name === 'Bob');
  });
  ```

- `peer:connected`

  If a peer has passed the `peer:filter` test (either no filtering has been applied, or the allow flag is set to true in the filter events) then a `peer:connected` event will be emitted:

  ```js
  signaller.on('peer:connected', function(id) {
    console.log('peer ' + id + ' has connected');
  });
  ```

  This event can be useful if you wish to know when a peer has connected to the signalling server, and don't care whether it is a new peer (generating a `peer:announce` event) or known peer (generating a `peer:update` event).

- `peer:announce`

  While the `peer:connected` event is triggered each time a peer reconnects and announces to the signalling server, a `peer:announce` event is only emitted by your local signaller if this is considered a new connection from a peer.

  If you are writing a WebRTC application, then this event is the best place to start creating `RTCPeerConnection` objects between the local machine and your remote, announced counterpart.  You will then be able to [couple](https://github.com/rtc-io/rtc#rtccouple) those connections together using the signaller.

  ```js
  signaller.on('peer:announce', function(data) {
    console.log('discovered new peer: ' + data.id, data);

    // TODO: create a peer connection with our new friend :)
  });
  ```

- `peer:update`

  An existing peer in the system has been "re-announced" possibly with some data changes:

  ```js
  signaller.on('peer:update', function(data) {
    console.log('data update from peer: ' + data.id, data);
  });
  ```


## Signal Flow Diagrams

Displayed below are some diagrams how the signalling flow between peers behaves.  In each of the diagrams we illustrate three peers (A, B and C) participating discovery and coordinating RTCPeerConnection handshakes.

In each case, only the interaction between the clients is represented not how a signalling server (such as [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard)) would pass on broadcast messages, etc.  This is done for two reasons:

  1. It is out of scope of this documentation.
  2. The `rtc-signaller` has been designed to work without having to rely on any intelligence in the server side signalling component.  In the instance that a signaller broadcasts all messages to all connected peers then `rtc-signaller` should be smart enough to make sure everything works as expected.

### Peer Discovery / Announcement

This diagram illustrates the process of how peer `A` announces itself to peers `B` and `C`, and in turn they announce themselves.

![](https://raw.github.com/rtc-io/rtc-signaller/master/docs/announce.png)

### Editing / Updating the Diagrams

Each of the diagrams has been generated using [mscgen](http://www.mcternan.me.uk/mscgen/index.html) and the source for these documents can be found in the `docs/` folder of this repository.


## Reference

The `rtc-signaller` module is designed to be used primarily in a functional
way and when called it creates a new signaller that will enable
you to communicate with other peers via your messaging network.

```js
// create a signaller from something that knows how to send messages
var signaller = require('rtc-signaller')(messenger);
```

As demonstrated in the getting started guide, you can also pass through
a string value instead of a messenger instance if you simply want to
connect to an existing `rtc-switchboard` instance.

### `signaller.connect()`

Manually connect the signaller using the supplied messenger.

__NOTE:__ This should never have to be called if the default setting
for `autoconnect` is used.

### announce(data?)

The `announce` function of the signaller will pass an `/announce` message
through the messenger network.  When no additional data is supplied to
this function then only the id of the signaller is sent to all active
members of the messenging network.

#### Joining Rooms

To join a room using an announce call you simply provide the name of the
room you wish to join as part of the data block that you annouce, for
example:

```js
signaller.announce({ room: 'testroom' });
```

Signalling servers (such as
[rtc-switchboard](https://github.com/rtc-io/rtc-switchboard)) will then
place your peer connection into a room with other peers that have also
announced in this room.

Once you have joined a room, the server will only deliver messages that
you `send` to other peers within that room.

#### Providing Additional Announce Data

There may be instances where you wish to send additional data as part of
your announce message in your application.  For instance, maybe you want
to send an alias or nick as part of your announce message rather than just
use the signaller's generated id.

If for instance you were writing a simple chat application you could join
the `webrtc` room and tell everyone your name with the following announce
call:

```js
signaller.announce({
  room: 'webrtc',
  nick: 'Damon'
});
```

#### Announcing Updates

The signaller is written to distinguish between initial peer announcements
and peer data updates (see the docs on the announce handler below). As
such it is ok to provide any data updates using the announce method also.

For instance, I could send a status update as an announce message to flag
that I am going offline:

```js
signaller.announce({ status: 'offline' });
```

### leave()

Tell the signalling server we are leaving.  Calling this function is
usually not required though as the signalling server should issue correct
`/leave` messages when it detects a disconnect event.

## License(s)

### Apache 2.0

Copyright 2013 - 2014 National ICT Australia Limited (NICTA)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
