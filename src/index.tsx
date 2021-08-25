import React, {useState, useEffect} from 'react';
import Client from './WebSocketClient'
import ReactDOM from 'react-dom';
import './App.css';
import * as chat from './chat'
import Automerge from 'automerge'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

function Chat(props: { messages: chat.Message[], sendMessage: Function } ) {
  let [ message, setMessage ] = useState('hi')

  let { messages, sendMessage } = props

  return <div><ul>
    {messages.map(m => <li key={m.time}>{m.text}</li>)}
    </ul>
    <input onChange={e => setMessage(e.target.value)} defaultValue={message} />
    <button onClick={() => sendMessage(message)}>Send</button>
   </div>
}

let client: Client<chat.Room> | undefined;

function App() {
  let [ roomName, setRoomName ]= useState('')
  let [ messages, setMessages ] = useState<chat.Message[]>([])

  let ref = React.createRef<HTMLInputElement>()

  function joinRoom(roomName: string) {
    if (client) {
      client.close()
    }
    setRoomName(roomName)
    window.location.hash = roomName
  }

  function sendMessage(text: string) {
    if (!client) throw new Error('You have to join a room first.')
    let newDoc = chat.sendMessage(client.document, text)
    client.localChange(newDoc)
  }

  // Effect is triggered every time roomName changes
  useEffect(() => {
    let maybeRoom = window.location.hash.replace('#', '')
    if (maybeRoom.length && maybeRoom !== roomName) return joinRoom(maybeRoom)
    if (!roomName.length) return

    // TODO: This should be lower level... 
    // I don't want to listen to the websocket client to see when the document changes
    // The Automerge document should give me a listener or callback or stream 
    // that can be used to update the UI every time there is a change added.
    function onupdate (changes?: Automerge.BinaryChange[]) {
      if (!client) throw new Error('You have to join a room first.')
      setMessages(client.document.messages || [])
      if (changes) chat.save(client.document, changes)
    }

    chat.load(roomName).then((room: chat.Room) => {
      client = new Client<chat.Room>(room.name, room)
      client.on('update', onupdate)
      onupdate()
    })
    return () => {
      client?.removeListener('update', onupdate)
    }
  }, [roomName])


  return (
    <div className="App">
      <header className="App-header">
          <h1>{roomName}</h1>
        <div>
          {roomName ?
            <Chat messages={messages} sendMessage={sendMessage} /> :
            <div>
              <input ref={ref} ></input>
              <button onClick={() => {
                let newRoomName = ref.current?.value;
                if (!newRoomName) return
                joinRoom(newRoomName)
              }}>Join room</button>
            </div>
          }
        </div>
      </header>
    </div>
  );
}

export default App;
