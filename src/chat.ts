import { createHash } from 'crypto';
import Automerge from 'automerge';
import Client from './WebSocketClient'

export type Room = {
  name: string,
  messages: Message[]
}

export type Message = {
  text: string,
  time: number
}

let rooms = new Map<string, Client<Room>>()

export function create(name: string): Client<Room> {
  console.log('creating room')
  let head = Automerge.change(Automerge.init<Room>('0000'), { time: 0 }, (doc: Room) => {
    doc.name = name;
    doc.messages = []
  });

  let room = Automerge.load<Room>(Automerge.save(head))
  // room name is hidden from server
  let hash = createHash('sha256') 
  hash.update(room.name)
  let documentId = hash.digest('hex')

  let client = new Client<Room>(documentId, room)
  rooms.set(name, client)
  return client;

}

export function get(name: string): Client<Room> | undefined {
  return rooms.get(name)
}

export function update(client: Client<Room>, newDoc: Room) {
  client.document = newDoc
  client.update()
}

export function sendMessage(roomName: string, text: string) {
  let client = rooms.get(roomName)
  if (!client) throw new Error('Room with name ' + roomName + ' does not exist.')
  let newDoc = Automerge.change(client.document, (doc) => {
    doc.messages.push({
      text,
      time: Date.now()
    })
  })
  console.log(newDoc.messages)
  console.log('sending message', roomName, text)
  update(client, newDoc)
}
