import React, {useEffect, useState} from 'react';
import './App.css';
import Client from './client'
import Automerge from 'automerge';
import { createHash } from 'crypto';

let rooms = new Map<string, Room>()
let clients = new Map<string, Client<Room>>()

function createRoom(name: string): Automerge.Doc<Room> {
  let doc = Automerge.change(Automerge.init<Room>('0000'), { time: 0 }, (doc: Room) => {
    doc.name = name;
    doc.messages = []
  });
  return doc;
}

function getRoom(name: string): Room {
  let room = rooms.get(name) || createRoom(name)
  rooms.set(name, room)

  // room name is hidden from server
  let hash = createHash('sha256') 
  hash.update(room.name)
  let documentId = hash.digest('hex')

  let client = new Client<Room>(documentId, room)
  clients.set(name, client)

  return room;
}

function updateRoom(room: Automerge.Doc<Room>) {
  rooms.set(room.name, room)
  let client = clients.get(room.name)
  if (!client) throw new Error('client doesnt exist what?')
  client.update(room)
}

function sendMessage(roomName: string, text: string) {
  let room = rooms.get(roomName)
  if (!room) throw new Error('Room with naame ' + roomName + ' does not exist.')
  let newDoc = Automerge.change(room, (doc) => {
    doc.messages.push({
      text,
      time: Date.now()
    })
  })
  console.log('sending message', roomName, text)
  updateRoom(newDoc)
}

type Room = {
  name: string,
  messages: Message[]
}

type Message = {
  text: string,
  time: number
}

function Chat(props: { room: Room } ) {
  let [ message, setMessage ] = useState('hi')

  let { room } = props

  return <div><ul>
    {room.messages.map(m => <li>{m.text}</li>)}
    </ul>
    <input onChange={e => setMessage(e.target.value)} defaultValue={message} />
    <button onClick={() => sendMessage(room.name, message)}>Send</button>
   </div>
}

function App() {
  let [ roomName, setRoomName ]= useState('default')
  let [ room, setRoom ]  = useState<Room>()

  function joinRoom() {
    let room = getRoom(roomName)
    setRoom(room)
  }

  useEffect(() => {
    joinRoom()
  })

  return (
    <div className="App">
      <header className="App-header">
        {room ? <Chat room={room} /> :  <div>Join a room!</div> }
        <input onChange={e => setRoomName(e.target.value)} defaultValue={roomName}></input>
        <button onClick={joinRoom}>Join</button>
      </header>
    </div>
  );
}

export default App;
