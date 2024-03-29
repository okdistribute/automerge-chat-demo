import events from 'events';
import { createHash } from 'crypto';
import Automerge from 'automerge'

export default class Client<T> extends events.EventEmitter {
  open: boolean = false;
  syncState: Automerge.SyncState;
  client: WebSocket;
  documentId: string;
  document: Automerge.Doc<T>

  constructor(documentId: string, document: Automerge.Doc<T>, publish: boolean = false) {
    super()
    if (!document) throw new Error('document required')
    this.document = document;

    if (publish) {
      this.documentId = documentId
    } else {
      // documentId is hidden from server
      let hash = createHash('sha256')
      hash.update(documentId)
      this.documentId = hash.digest('hex')
    } 

    this.syncState = Automerge.initSyncState()
    this.client = this._createClient()
  }

  _createClient(): WebSocket {
    this.syncState = Automerge.initSyncState()
    // TODO: add peerId /documentId/peerId
    this.client = new WebSocket(`ws://${window.location.hostname}:8080/${this.documentId}`, 'echo-protocol');
    this.client.binaryType = 'arraybuffer';

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
      setTimeout(() => {
        this._createClient()
      }, 100)
    };

    this.client.onmessage = (e) => {
      //@ts-ignore
      let msg = new Uint8Array(e.data);
      //@ts-ignore
      let [ newDoc, newSyncState,  ] = Automerge.receiveSyncMessage(this.document, this.syncState, msg)
      this.document = newDoc;
      this.syncState = newSyncState;
      // I shouldn't have to listen to the websocket to know when to update..
      this.updatePeers()
    }; 
    return this.client;
  }

  localChange(newDoc: Automerge.Doc<T>) {
    this.document = newDoc
    if (!this.open) {
      this.once('open', () => this.updatePeers())
      return
    }
    this.updatePeers()
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
    console.log('Websocket client closed.')
    this.client.close()
  }
}
