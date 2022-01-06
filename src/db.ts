import Dexie from 'dexie';
import Automerge from 'automerge';
import debug from 'debug';

interface SavedChange {
  docId: string;
  change: Automerge.BinaryChange;
  timestamp: number;
}

export interface Doc {
  changes: Automerge.BinaryChange[];
}

export class DB extends Dexie {
  changes: Dexie.Table<SavedChange, string>;
  private log;

  constructor(dbname: string) {
    super(dbname);
    this.version(3).stores({
      changes: 'id++,docId',
      states: 'id++, [docId+actorId]', // compound index 
      blobs: 'id',
    });
    this.changes = this.table('changes');
    this.log = debug('bc:automerge:db');
  }

  async storeChange(docId: string, change: Automerge.BinaryChange) {
    return this.changes.add({ docId, change, timestamp: Date.now() });
  }

  async getDoc(docId: string): Promise<Doc> {
    let changes = await this.changes.where({ docId }).toArray();
    return {
      changes: changes.map((c) => c.change),
    };
  }

  async destroy() {
    await this.changes.clear();
  }
}