import { PeerServer } from "peer";

const peerServer = PeerServer({
  port: 9000,
  path: "/peer"
});

console.log("🔥 Peer server running on 9000");