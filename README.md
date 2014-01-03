# rtc-signaller

The `rtc-signaller` module provides a transportless signalling
mechanism for WebRTC.


[![NPM](https://nodei.co/npm/rtc-signaller.png)](https://nodei.co/npm/rtc-signaller/)

[![Build Status](https://travis-ci.org/rtc-io/rtc-signaller.png?branch=master)](https://travis-ci.org/rtc-io/rtc-signaller)
[![unstable](http://hughsk.github.io/stability-badges/dist/unstable.svg)](http://github.com/hughsk/stability-badges)

## Purpose

The signaller provides set of client-side tools that assist with the
setting up an `PeerConnection` and helping them communicate. All that is
required for the signaller to operate is a suitable messenger.

A messenger is a simple object that implements node
[EventEmitter](http://nodejs.org/api/events.html) style `on` events for
`open`, `close`, `message` events, and also a `send` method by which
data will be send "over-the-wire".

By using this approach, we can conduct signalling over any number of
mechanisms:

- local, in memory message passing
- via WebSockets and higher level abstractions (such as
  [primus](https://github.com/primus/primus))
- also over WebRTC data-channels (very meta, and admittedly a little
  complicated).

## Getting Started

To work with the signaller, you first need a messenger of some kind. If you
have run up a version of the
[rtc-switchboard](https://github.com/rtc-io/rtc-switchboard) somewhere then
the following example should work:

```js
// to be completed
```

While the example above demonstrates communication between two endpoints
via websockets, it does not go into detail on setting up a WebRTC peer
connection (as that is significantly more involved).  If you are looking for
an easy way to do this, I'd recommend checking out
[rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect) or
[rtc-glue](https://github.com/rtc-io/rtc-glue).

## Signal Flow Diagrams

Displayed below are some diagrams how the signalling flow between peers
behaves.  In each of the diagrams we illustrate three peers (A, B and C)
participating discovery and coordinating RTCPeerConnection handshakes.

In each case, only the interaction between the clients is represented not
how a signalling server
(such as [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard)) would
pass on broadcast messages, etc.  This is done for two reasons:

1. It is out of scope of this documentation.
2. The `rtc-signaller` has been designed to work without having to rely on
   any intelligence in the server side signalling component.  In the
   instance that a signaller broadcasts all messages to all connected peers
   then `rtc-signaller` should be smart enough to make sure everything works
   as expected.

### Peer Discovery / Announcement

This diagram illustrates the process of how peer `A` announces itself to
peers `B` and `C`, and in turn they announce themselves.

![](https://raw.github.com/rtc-io/rtc-signaller/master/docs/announce.png)

### Editing / Updating the Diagrams

Each of the diagrams has been generated using
[mscgen](http://www.mcternan.me.uk/mscgen/index.html) and the source for
these documents can be found in the `docs/` folder of this repository.

## Reference

The `rtc-signaller` module is designed to be used primarily in a functional
way and when called it creates a new signaller that will enable
you to communicate with other peers via your messaging network.

```js
// create a signaller from something that knows how to send messages
var signaller = require('rtc-signaller')(messenger);
```

### signaller#send(message, data*)

Use the send function to send a message to other peers in the current
signalling scope (if announced in a room this will be a room, otherwise
broadcast to all peers connected to the signalling server).

### signaller#announce(data?)

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

### signaller#isMaster(targetId)

A simple function that indicates whether the local signaller is the master
for it's relationship with peer signaller indicated by `targetId`.  Roles
are determined at the point at which signalling peers discover each other,
and are simply worked out by whichever peer has the lowest signaller id
when lexigraphically sorted.

For example, if we have two signaller peers that have discovered each
others with the following ids:

- `b11f4fd0-feb5-447c-80c8-c51d8c3cced2`
- `8a07f82e-49a5-4b9b-a02e-43d911382be6`

They would be assigned roles:

- `b11f4fd0-feb5-447c-80c8-c51d8c3cced2`
- `8a07f82e-49a5-4b9b-a02e-43d911382be6` (master)

### signaller#leave()

Tell the signalling server we are leaving.  Calling this function is
usually not required though as the signalling server should issue correct
`/leave` messages when it detects a disconnect event.

### signaller#lock(targetId, opts?, callback?)

Attempt to get a temporary exclusive lock on the communication
channel between the local signaller and the specified target peer id.

### signaller#to(targetId)

Use the `to` function to send a message to the specified target peer.
A large parge of negotiating a WebRTC peer connection involves direct
communication between two parties which must be done by the signalling
server.  The `to` function provides a simple way to provide a logical
communication channel between the two parties:

```js
var send = signaller.to('e95fa05b-9062-45c6-bfa2-5055bf6625f4').send;

// create an offer on a local peer connection
pc.createOffer(
  function(desc) {
    // set the local description using the offer sdp
    // if this occurs successfully send this to our peer
    pc.setLocalDescription(
      desc,
      function() {
        send('/sdp', desc);
      },
      handleFail
    );
  },
  handleFail
);
```

### signaller#unlock(targetId, opts?)

### signaller.loadPrimus(signalhost, callback)

### signaller process handling

When a signaller's underling messenger emits a `data` event this is
delegated to a simple message parser, which applies the following simple
logic:

- Is the message a `/to` message. If so, see if the message is for this
  signaller (checking the target id - 2nd arg).  If so pass the
  remainder of the message onto the standard processing chain.  If not,
  discard the message.

- Is the message a command message (prefixed with a forward slash). If so,
  look for an appropriate message handler and pass the message payload on
  to it.

- Finally, does the message match any patterns that we are listening for?
  If so, then pass the entire message contents onto the registered handler.

### signaller message handlers

#### announce

```
/announce|{"id": "...", ... }
```

When an announce message is received by the signaller, the attached
object data is decoded and the signaller emits an `announce` message.

##### Events Triggered in response to `/announce`

There are two different types of `peer:` events that can be triggered
in on peer B to calling the `announce` method on peer A.

- `peer:announce`

  The `peer:announce` event is triggered when a new peer has been
  discovered.  The data for the new peer (as an JS object) is provided
  as the first argument of the event handler.

- `peer:update`

  If a peer "reannounces" then a `peer:update` event will be triggered
  rather than a `peer:announce` event.

#### leave

```
/leave|{"id":"..."}
```

When a leave message is received from a peer, we check to see if that is
a peer that we are managing state information for and if we are then the
peer state is removed.

##### Events triggered in response to `/leave` messages

The following event(s) are triggered when a `/leave` action is received
from a peer signaller:

- `peer:leave`

  The `peer:leave` event is emitted once a `/leave` message is captured
  from a peer.  Prior to the event being dispatched, the internal peers
  data in the signaller is removed but can be accessed in 2nd argument
  of the event handler.

#### lock

```
/lock
```

A `/lock` request can only be sent within the context of a `/to` message
and thus must contain source data to be processed correctly.  The `/lock`
message is used to coordinate betwen two remote peers in the case that
both peers which to commence renegotiation at the same time.

In the case that two peers attempt to renegotiate with each other at the
same time, then the peer that has been identified as party `a` in the peer
relationship will take on the role of the initiator in the negotiation and
party `b` will respond to the offer sdp.

#### unlock

```
/unlock|label
```

Clear a remote lock

## License(s)

### Apache 2.0

Copyright 2014 National ICT Australia Limited (NICTA)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
