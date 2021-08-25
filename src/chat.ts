import Automerge from 'automerge';
import { DB } from './db';

export type Room = {
  name: string,
  messages: Message[]
}

export type Message = {
  text: string,
  time: number
}

let idb = new DB('dbname')

function create(name: string): Room {
  console.log('creating room')
  let head = Automerge.change(Automerge.init<Room>('0000'), { time: 0 }, (doc: Room) => {
    doc.name = name;
    doc.messages = []
  });
  let change = Automerge.Frontend.getLastLocalChange(head)
  let empty = Automerge.init<Room>();
  const [room, ] = Automerge.applyChanges(empty, [change])

  /*
    TODO: For persistence, I want to be able to listen to the document here and respond when it changes 
    OR provide some backend to automerge 

    let backend = {
      saveSnapshot: (id: string, doc: Automerge.Doc<T>) => void,
      loadSnapshot: (id: string) => Automerge.Doc<T>,
      saveChange: (change: Automerge.BinaryChange) => void,
      saveChanges: (changes: Automerge.BinaryChange[]) => void,
      getChanges: (id: string) => Automerge.BinaryChanges[]
    }

    let empty = Automerge.init<Room>(backend)
    const [room, patch] = Automerge.applyChanges(empty, [change])


  */
  return room;
}

export async function save(room: Room, changes: Automerge.BinaryChange[]) {
  let tasks: Promise<string>[] = [];
  changes.forEach((change) => {
    tasks.push(idb.storeChange(room.name, change))
  })
  return Promise.all(tasks)
}

export async function load (name: string): Promise<Room> {
  let doc = await idb.getDoc(name);
  if (!doc) return create(name)
  let state = doc.serializedDoc
  ? Automerge.load<Room>(doc.serializedDoc)
  : create(name)
  const [room, ] = Automerge.applyChanges(state, doc.changes);
  return room
}

export function sendMessage(room: Room, text: string): Room {
  let newDoc = Automerge.change(room, (doc) => {
    doc.messages.push({
      text,
      time: Date.now()
    })
  })
  return newDoc
}
