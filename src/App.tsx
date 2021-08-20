import React, {useEffect, useState} from 'react';
import './App.css';
import Client from './client'
import Automerge from 'automerge';
import { createHash } from 'crypto';

let rooms = new Map<string, Client<Room>>()

function createRoom(name: string): Client<Room> {
  let room = Automerge.change(Automerge.init<Room>('0000'), { time: 0 }, (doc: Room) => {
    doc.name = name;
    doc.messages = []
  });
  // room name is hidden from server
  let hash = createHash('sha256') 
  hash.update(room.name)
  let documentId = hash.digest('hex')

  let client = new Client<Room>(documentId, room)
  rooms.set(name, client)
  return client;

}

function getRoom(name: string): Client<Room> {
  return rooms.get(name) || createRoom(name)
}

function updateRoom(client: Client<Room>, newDoc: Room) {
  client.document = newDoc
  client.update()
}

function sendMessage(roomName: string, text: string) {
  let client = rooms.get(roomName)
  if (!client) throw new Error('Room with name ' + roomName + ' does not exist.')
  let newDoc = Automerge.change(client.document, (doc) => {
    doc.messages.push({
      text,
      time: Date.now()
    })
  })
  console.log('sending message', roomName, text)
  updateRoom(client, newDoc)
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

  let r = React.createRef<HTMLInputElement>()

  function joinRoom() {
    let roomName = r.current?.value;
    if (!roomName) return
    let client = getRoom(roomName)
    setRoom(client.document)
    console.log('joining room')
  }

  useEffect(() => {
    let client = getRoom(roomName)
    console.log('creating listener')
    client.on('update', () => {
      setRoom(client.document)
    })
  }, [roomName])


  return (
    <div className="App">
      <header className="App-header">
        {room ? <Chat room={room} /> :  <div>Join a room!</div> }

        <input ref={r} defaultValue={roomName}></input>
        <button onClick={joinRoom}>Join</button>
      </header>
    </div>
  );
}

export default App;