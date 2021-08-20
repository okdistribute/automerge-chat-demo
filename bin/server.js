var WebSocketServer = require('websocket').server
var request = require('websocket').request
var http = require('http');
var crypto = require('crypto');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
	// put logic here to detect whether the specified origin is allowed.
	return true;
 }

const documents = new Map() 

class Peer {
	constructor (connection) {
		this.id = crypto.randomBytes(16).toString('hex')
		this.connection = connection
	}
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
	connection = request.accept('echo-protocol', request.origin);
	let peers = documents.get(request.resource) || []
    connection.on('close', function(reasonCode, description) {
		let newPeers = peers.filter(p => {
			return p.id !== me.id
		})
		documents.set(request.resource, newPeers)
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
	let me = new Peer(connection)
	peers.forEach(p => {
		console.log('piping', p.id, me.id)
		pipeSockets(p.connection, me.connection)
	})
	peers.push(me)
	documents.set(request.resource, peers)

});

const pipeSockets = (socket1, socket2) => {
	const pipeOneWay = (A, B) => {
	  const cleanup = () => {
		A.close()
		B.close()
	  }
	  A.on('message', data => {
		B.sendBytes(data.binaryData);
	  })
	  A.on('error', cleanup)
	  A.on('close', cleanup)
	}
	pipeOneWay(socket1, socket2)
	pipeOneWay(socket2, socket1)
  }