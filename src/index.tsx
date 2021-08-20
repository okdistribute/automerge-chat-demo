import React, {useState, useEffect} from 'react';
import ReactDOM from 'react-dom';
import './App.css';
import * as chat from './chat'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

function Chat(props: { room: chat.Room } ) {
  let [ message, setMessage ] = useState('hi')

  let { room } = props

  return <div><ul>
    {room.messages.map(m => <li key={m.time}>{m.text}</li>)}
    </ul>
    <input onChange={e => setMessage(e.target.value)} defaultValue={message} />
    <button onClick={() => chat.sendMessage(room.name, message)}>Send</button>
   </div>
}

function App() {
  let [ roomName, setRoomName ]= useState('')
  let [ room, setRoom ]  = useState<chat.Room>()

  let ref = React.createRef<HTMLInputElement>()

  function joinRoom(roomName: string) {
    setRoomName(roomName)
    let old = chat.get(roomName)
    if (old && roomName) {
      old.close()
    }
  }

  function addRoom() {
    let newRoomName = ref.current?.value;
    if (!newRoomName) return
    joinRoom(newRoomName)
  }

  useEffect(() => {
    if (!roomName.length) return
    let client = chat.get(roomName) || chat.create(roomName)
    function onupdate () {
      setRoom(client.document)
    }
    client.on('update', onupdate)

    onupdate()
    return () => {
      client.removeListener('update', onupdate)
    }
  }, [roomName])


  return (
    <div className="App">
      <header className="App-header">
        <div>
          {chat.list().map(roomName => 
            <div onClick={() => joinRoom(roomName)}>{roomName}</div>
          )}
          <div>
            <input ref={ref} ></input>
            <button onClick={addRoom}>+</button>
          </div>
        </div>
        <div>
          {room ? <Chat room={room} /> : null }
        </div>
      </header>
    </div>
  );
}

export default App;
