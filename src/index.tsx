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
  let [ message, setMessage ] = useState('')

  let { messages, sendMessage } = props
  
  let onSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    sendMessage(message)
    setMessage('')
  }

  return <div><ul>
    {messages.map(m => <li key={m.time}>{m.text}</li>)}
    </ul>
    <form onSubmit={onSend}>
      <input autoFocus value={message} onChange={e => setMessage(e.target.value)} />
      <button type="submit">Send</button>
    </form>
   </div>
}

// One could track the hydrated instance of multiple Automerge documents &
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
      this.client.close()
    }

    let observable = new Automerge.Observable()
    chat.load(roomName, { observable }).then((room: chat.Room) => {
      this.client = new Client<chat.Room>(roomName, room)
      observable.observe(room, this.onDocumentChanged)
      if (this.watcher) this.watcher(room.messages)
      cb()
    })
  }

  onDocumentChanged(
    diff: Automerge.MapDiff | Automerge.ListDiff | Automerge.ValueDiff,
    before: chat.Room,
    after: chat.Room,
    local: boolean,
    changes: Automerge.BinaryChange[])
  {
    if (!this.client) return console.error('no room')
    if (changes) chat.save(this.client.document, changes)
    if (this.watcher) this.watcher(after.messages)
  }

  sendMessage(text: string) {
    if (!this.client) return console.error('no room')
    console.log('sending message', text)
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

  // Effect is triggered every time roomName changes
  useEffect(() => {
    let checkHashForRoomName = () => {
      let newRoomName = window.location.hash.replace('#', '')
      if (roomName !== newRoomName) setRoomName(newRoomName)
    }
    if (roomName.length) {
      let updateMessages = (messages?: chat.Message[]) => {
        if (messages) setMessages(messages)
        else setMessages(state.getMessages())
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


  function sendMessage(text: string) {
    state.sendMessage(text)
  }

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
