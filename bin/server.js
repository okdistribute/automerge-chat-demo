const WebSocketServer = require('websocket').server
const http = require('http')
const crypto = require('crypto')

const server = http.createServer(function (request, response) {
  console.log((new Date()) + ' Received request for ' + request.url)
  response.writeHead(404)
  response.end()
})

server.listen(8080, function () {
  console.log((new Date()) + ' Server is listening on port 8080')
})

let wsServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false
})

function originIsAllowed (origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true
}

class Peer {
  constructor (connection) {
    this.id = crypto.randomBytes(16).toString('hex')
    this.connection = connection
    this.stale = false
  }
}

const pipeOneWay = (A, B) => {
  const onmessage = data => {
    B.sendBytes(data.binaryData)
  }
  const cleanup = () => {
    A.close()
    B.close()
    A.removeListener('message', onmessage)
    A.removeListener('error', cleanup)
    A.removeListener('close', cleanup)
  }
  A.on('message', onmessage)
  A.on('error', cleanup)
  A.on('close', cleanup)
}

const documents = new Map()

wsServer.on('request', function (request) {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject()
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.')
    return
  }
  const connection = request.accept('echo-protocol', request.origin)
  const peers = documents.get(request.resource) || []
  console.log('get peers', peers.length)
  const me = new Peer(connection)
  peers.forEach(p => {
    if (!p.stale) {
      pipeOneWay(p.connection, me.connection)
      pipeOneWay(me.connection, p.connection)
    }
  })
  peers.push(me)
  connection.on('close', function (reasonCode, description) {
    me.stale = true
    documents.set(request.resource, peers.filter(p => !p.stale))
    console.log(documents.get(request.resource).length)
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.')
  })
  documents.set(request.resource, peers)
})
