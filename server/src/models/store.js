import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../.data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonCollection {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]), 'utf8');
    }
  }

  _read() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(content || '[]');
    } catch (err) {
      return [];
    }
  }

  _write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`Failed writing to ${this.filePath}`, err);
    }
  }

  generateId() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  find(query = {}) {
    const items = this._read();
    return items.filter(item => {
      for (const [key, val] of Object.entries(query)) {
        if (typeof val === 'object' && val !== null) {
          if (val.$in && Array.isArray(val.$in)) {
            if (!val.$in.includes(item[key])) return false;
          }
        } else if (item[key] !== val) {
          return false;
        }
      }
      return true;
    });
  }

  findOne(query = {}) {
    const results = this.find(query);
    return results.length > 0 ? { ...results[0] } : null;
  }

  findById(id) {
    return this.findOne({ _id: id });
  }

  create(doc) {
    const items = this._read();
    const newDoc = {
      _id: doc._id || this.generateId(),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(newDoc);
    this._write(items);
    return { ...newDoc };
  }

  findByIdAndUpdate(id, updates, options = { new: true }) {
    const items = this._read();
    const idx = items.findIndex(item => item._id === id);
    if (idx === -1) return null;

    items[idx] = {
      ...items[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this._write(items);
    return { ...items[idx] };
  }

  updateOne(query, updates) {
    const items = this._read();
    const idx = items.findIndex(item => {
      for (const [key, val] of Object.entries(query)) {
        if (item[key] !== val) return false;
      }
      return true;
    });
    if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };
    items[idx] = {
      ...items[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this._write(items);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  findByIdAndDelete(id) {
    let items = this._read();
    const existing = items.find(item => item._id === id);
    if (!existing) return null;
    items = items.filter(item => item._id !== id);
    this._write(items);
    return existing;
  }

  countDocuments(query = {}) {
    return this.find(query).length;
  }
}

export const usersStore = new JsonCollection('users');
export const projectsStore = new JsonCollection('projects');
export const teamMembersStore = new JsonCollection('team_members');
export const repoDataStore = new JsonCollection('repository_data');
export const snapshotsStore = new JsonCollection('metric_snapshots');
export const announcementsStore = new JsonCollection('announcements');
export const notificationsStore = new JsonCollection('notifications');
export const logsStore = new JsonCollection('activity_logs');
