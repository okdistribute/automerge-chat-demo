import { w3cwebsocket as W3CWebSocket } from 'websocket';
import events from 'events';
import Automerge from 'automerge'

export default class Client<T> extends events.EventEmitter {
  open: boolean = false;
  syncState: Automerge.SyncState;
  client: W3CWebSocket;
  documentId: string;
  document: Automerge.Doc<T>

  constructor(documentId: string, document: Automerge.Doc<T>) {
    super()
    this.document = document;
    this.documentId = documentId;
    this.syncState = Automerge.initSyncState()

    this.client = new W3CWebSocket(`ws://localhost:8080/${documentId}`, 'echo-protocol');
    this.client.binaryType = 'arraybuffer';
    console.log('Joining', documentId)

    this.client.onerror = () => {
      console.log('Connection Error');
    };

    this.client.onopen = () => {
      console.log('WebSocket Client Connected');
      if (this.client.readyState === this.client.OPEN) {
        this.open = true
        this.emit('open')
      }
    };

    this.client.onclose = () => {
      console.log('echo-protocol Client Closed');
      this.emit('close')
    };

    this.client.onmessage = (e) => {
      console.log('got message')
      //@ts-ignore
      let msg = new Uint8Array(e.data);
      //@ts-ignore
      let [ newDoc, newSyncState, patch ] = Automerge.receiveSyncMessage(this.document, this.syncState, msg)
      this.document = newDoc;
      this.syncState = newSyncState;
    }; 
  }

  update(document: Automerge.Doc<T>) {
    if (!this.open) {
      this.once('open', () => this.update(document))
      return
    }
    this.document = document
    this.updatePeer()

  }

  updatePeer() {
    let [nextSyncState, msg] = Automerge.generateSyncMessage(
      this.document,
      this.syncState
    );
    this.syncState = nextSyncState
    if (msg) {
      console.log('sending sync state')
      this.client.send(msg)
    }
  }

  close() {
    this.client.close()
  }
}