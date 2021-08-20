import { createHash } from 'crypto';
import Automerge from 'automerge';
import Client from './WebSocketClient'
import { DB } from './db';

export type Room = {
  name: string,
  messages: Message[]
}

export type Message = {
  text: string,
  time: number
}

let rooms = new Map<string, Client<Room>>()
let idb = new DB('dbname')

export function list(): string[] {
  return Array.from(rooms.keys())
}

export async function create(name: string): Client<Room> {
  console.log('creating room')
  let head = Automerge.change(Automerge.init<Room>('0000'), { time: 0 }, (doc: Room) => {
    doc.name = name;
    doc.messages = []
  });
  let change = Automerge.Frontend.getLastLocalChange(head)
  idb.storeChange(name, change);
  let room = load(name)

  // room name is hidden from server
  let hash = createHash('sha256') 
  hash.update(room.name)
  let documentId = hash.digest('hex')

  let client = new Client<Room>(documentId, room)
  rooms.set(name, client)
  return client;
}

async function save(name: string, doc: Promise<Room>) {

}

function load (name: string): Promise<Room> {
  let doc = await idb.getDoc(name);
  let state = doc.serializedDoc
  ? Automerge.load<Room>(doc.serializedDoc)
  : Automerge.init<Room>();
  const [room, patch] = Automerge.applyChanges(state, doc.changes);
  return room
}

export function get(name: string): Client<Room> | undefined {
  return rooms.get(name)
}

export function update(client: Client<Room>, newDoc: Room): void {
  let oldDoc = client.document
  let changes = Automerge.getChanges(oldDoc, newDoc)
  changes.forEach(async (c) => {
    await idb.storeChange(newDoc.name, c);
  });
  client.document = newDoc
  client.update()
}

export function sendMessage(roomName: string, text: string): void {
  let client = rooms.get(roomName)
  if (!client) throw new Error('Room with name ' + roomName + ' does not exist.')
  let newDoc = Automerge.change(client.document, (doc) => {
    doc.messages.push({
      text,
      time: Date.now()
    })
  })
  update(client, newDoc)
}
