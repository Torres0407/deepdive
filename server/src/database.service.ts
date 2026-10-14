import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface ScoreRecord {
  id: number;
  name: string;
  maxDepth: number;
  createdAt: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: sqlite3.Database;

  async onModuleInit() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'deepdive.sqlite');

    await new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Failed to connect to SQLite database:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await this.initSchema();
  }

  private async initSchema() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        max_depth REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.run(createTableQuery);

    // Check if table is empty; if so, populate initial pioneer scores
    const countRow = await this.get<{ count: number }>('SELECT COUNT(*) as count FROM scores');
    if (countRow && countRow.count === 0) {
      const initialDivers = [
        { name: 'Victor Vescovo', maxDepth: 6000 },
        { name: 'Don Walsh', maxDepth: 5920 },
        { name: 'James Cameron', maxDepth: 5880 },
        { name: 'Jacques Cousteau', maxDepth: 4250 },
        { name: 'Sylvia Earle', maxDepth: 3820 },
        { name: 'Nautilus Submersible', maxDepth: 2900 },
        { name: 'Trieste Bathyscaphe', maxDepth: 1800 },
      ];

      for (const diver of initialDivers) {
        await this.run(
          'INSERT INTO scores (name, max_depth) VALUES (?, ?)',
          [diver.name, diver.maxDepth]
        );
      }
    }
  }

  run(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close();
    }
  }
}
