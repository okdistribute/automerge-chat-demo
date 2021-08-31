import React, {useState, useEffect} from 'react';
import Client from './WebSocketClient'
import ReactDOM from 'react-dom'
import './App.css';
import * as chat from './chat'
import Automerge from 'automerge'
import events from 'events'

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

// TODO: one could track the hydrated instance of multiple Automerge documents &
// websocket clients here
class ChatRoomState extends events.EventEmitter {
  client: Client<chat.Room> | undefined;
  watcher: Function | undefined;

  constructor() {
    super()
    this.onDocumentChanged = this.onDocumentChanged.bind(this)
  }

  watch(watcher: Function) {
    this.watcher = watcher
  }

  unwatch() {
    this.watcher = undefined
  }


  load(roomName: string, cb: Function) {
    if (this.client) {
      this.client.removeListener('update', this.onDocumentChanged)
      this.client.close()
    }

    chat.load(roomName).then((room: chat.Room) => {
      this.client = new Client<chat.Room>(roomName, room)

      // TODO: I don't want to listen to the websocket client to see when the document changes
      // The Automerge document should give me a listener or callback or stream 
      // that can be used to update the UI every time there is a change added.
      this.client.on('update', this.onDocumentChanged)
      this.onDocumentChanged()
      cb()
    })
  }

  onDocumentChanged (changes?: Automerge.BinaryChange[]) {
    if (!this.client) return console.error('no room')
    if (changes) chat.save(this.client.document, changes)
    if (this.watcher) this.watcher()
  }

  sendMessage(text: string) {
    if (!this.client) return console.error('no room')
    let newDoc = chat.sendMessage(this.client.document, text)
    this.client.localChange(newDoc)
  }

  getMessages(): chat.Message[] {
    if (!this.client) return []
    return this.client.document.messages
  }
}

let state = new ChatRoomState();

function App() {
  let [ roomName, setRoomName ]= useState('')
  let [ messages, setMessages ] = useState<chat.Message[]>([])

  let ref = React.createRef<HTMLInputElement>()

  function sendMessage(text: string) {
    state.sendMessage(text)
  }

  // Effect is triggered every time roomName changes
  useEffect(() => {
    let checkHashForRoomName = () => {
      let newRoomName = window.location.hash.replace('#', '')
      if (roomName !== newRoomName) setRoomName(newRoomName)
    }
    if (roomName.length) {
      let updateMessages = () => {
        setMessages(state.getMessages())
      }
      state.watch(updateMessages)
      state.load(roomName, updateMessages)
    }

    window.addEventListener('popstate', checkHashForRoomName) 
    checkHashForRoomName()

    return () => {
      setMessages([])
      window.removeEventListener('popstate', () => checkHashForRoomName)
      state.unwatch()
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
            <Chat messages={messages || []} sendMessage={sendMessage} /> :
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
