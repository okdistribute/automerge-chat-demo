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

function create(name: string, initOptions?: Automerge.InitOptions<Room>): Room {
  let head = Automerge.change(Automerge.init<Room>('0000'), { time: 0 }, (doc: Room) => {
    doc.name = name;
    doc.messages = []
  });
  let change = Automerge.Frontend.getLastLocalChange(head)
  let empty = Automerge.init<Room>(initOptions);
  const [room, ] = Automerge.applyChanges(empty, [change])
  return room;
}

export async function save(room: Room, changes: Automerge.BinaryChange[]) {
  let tasks: Promise<string>[] = [];
  changes.forEach((change) => {
    tasks.push(idb.storeChange(room.name, change))
  })
  return Promise.all(tasks)
}

export async function load (name: string, initOptions?: Automerge.InitOptions<Room>): Promise<Room> {
  let doc = await idb.getDoc(name);
  if (!doc) return create(name, initOptions)
  let state = create(name, initOptions)
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
