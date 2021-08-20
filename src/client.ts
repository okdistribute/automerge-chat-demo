import events from 'events';
import Automerge from 'automerge'

export default class Client<T> extends events.EventEmitter {
  open: boolean = false;
  syncState: Automerge.SyncState;
  client: WebSocket;
  documentId: string;
  document: Automerge.Doc<T>

  constructor(documentId: string, document: Automerge.Doc<T>) {
    super()
    this.document = document;
    this.documentId = documentId;
    this.syncState = Automerge.initSyncState()
    this.client = this._createClient()
  }

  _createClient(): WebSocket {
    this.syncState = Automerge.initSyncState()
    this.client = new WebSocket(`ws://localhost:8080/${this.documentId}`, 'echo-protocol');
    this.client.binaryType = 'arraybuffer';
    console.log('Joining', this.documentId)

    this.client.onerror = () => {
      console.log('Connection Error');
    };

    this.client.onopen = () => {
      console.log('WebSocket Client Connected');
      if (this.client.readyState === this.client.OPEN) {
        this.open = true
        this.emit('open')
        this.updatePeers()
      }
    };

    this.client.onclose = () => {
      console.log('echo-protocol Client Closed');
      setTimeout(() => {
        this._createClient()
      }, 100)
    };

    this.client.onmessage = (e) => {
      //@ts-ignore
      let msg = new Uint8Array(e.data);
      console.log('got message', msg)
      //@ts-ignore
      let [ newDoc, newSyncState, patch ] = Automerge.receiveSyncMessage(this.document, this.syncState, msg)
      this.document = newDoc;
      this.syncState = newSyncState;
      console.log(patch)
      this.emit('update')
      this.updatePeers()
    }; 
    return this.client;
  }

  update() {
    if (!this.open) {
      this.once('open', () => this.update())
      return
    }
    this.updatePeers()
    this.emit('update')
  }

  updatePeers() {
    let [nextSyncState, msg] = Automerge.generateSyncMessage(
      this.document,
      this.syncState
    );
    this.syncState = nextSyncState
    if (msg) {
      console.log('sending sync msg')
      this.client.send(msg)
    } else {
      console.log('no sync message to send')
    }
  }

  close() {
    this.client.close()
  }
}