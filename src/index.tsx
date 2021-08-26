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
  
  let onSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    sendMessage(message)
  }

  return <div><ul>
    {messages.map(m => <li key={m.time}>{m.text}</li>)}
    </ul>
    <form onSubmit={onSend}>
      <input autoFocus onChange={e => setMessage(e.target.value)} defaultValue={message} />
      <button type="submit">Send</button>
    </form>
   </div>
}

let client: Client<chat.Room> | undefined;

function App() {
  let [ roomName, setRoomName ]= useState('')
  let [ messages, setMessages ] = useState<chat.Message[]>([])

  let ref = React.createRef<HTMLInputElement>()

  function sendMessage(text: string) {
    if (!client) throw new Error('You have to join a room first.')
    let newDoc = chat.sendMessage(client.document, text)
    client.localChange(newDoc)
  }

  useEffect(() => {
    let onpop = () => {
      let newRoomName = window.location.hash.replace('#', '')
      if (roomName !== newRoomName) {
        setRoomName(newRoomName)
      }
    }
    window.addEventListener('popstate', onpop) 
    onpop()
    return () => {
      window.removeEventListener('popstate', () => onpop)
    }
  }, [roomName])

  // Effect is triggered every time roomName changes
  useEffect(() => {
    if (client) client.close()

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

  function onJoinRoomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    let newRoomName = ref.current?.value;
    if (!newRoomName) return
    window.location.hash = newRoomName
  }

  return (
    <div className="App">
      <header className="App-header">
          <h1>{roomName}</h1>
        <div>
          {roomName.length ?
            <Chat messages={messages} sendMessage={sendMessage} /> :
            <form onSubmit={onJoinRoomSubmit}>
              <input autoFocus ref={ref} ></input>
              <button type="submit">Join room</button>
            </form>
          }
        </div>
      </header>
    </div>
  );
}

export default App;
