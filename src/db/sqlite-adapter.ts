import { DatabaseSync } from 'node:sqlite';
import { IsomorphicBibleModule } from '../core/engine.js';
import type {
  BibleSearchOptions,
  BibleVerse,
  ChapterSummary,
  CleanTextOptions,
  CommentaryEntry,
  DictionaryEntry,
  ModuleBookSummary,
  ModuleMetadata,
  ParsedReference,
  SqlStorageDriver,
} from '../types.js';

/**
 * Node.js SQLite implementation of `SqlStorageDriver` using built-in `node:sqlite` (Node 22.5+).
 */
export class NodeSqliteStorageDriver implements SqlStorageDriver {
  public readonly db: DatabaseSync;

  constructor(
    dbOrPath: string | DatabaseSync,
    options: { readOnly?: boolean } = { readOnly: true },
  ) {
    if (typeof dbOrPath === 'string') {
      this.db = new DatabaseSync(dbOrPath, options);
    } else {
      this.db = dbOrPath;
    }
  }

  public all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    return (params && params.length > 0 ? (stmt.all as (...args: unknown[]) => unknown[])(...params) : stmt.all()) as unknown as T[];
  }

  public get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined {
    const stmt = this.db.prepare(sql);
    return (params && params.length > 0 ? (stmt.get as (...args: unknown[]) => unknown)(...params) : stmt.get()) as unknown as T | undefined;
  }

  public close(): void {
    this.db.close();
  }

  public getDatabaseSync(): DatabaseSync {
    return this.db;
  }
}

/**
 * SQLite database wrapper for MyBible modules on Node.js.
 * Delegates to `IsomorphicBibleModule` and `NodeSqliteStorageDriver`.
 */
export class MyBibleDatabase extends IsomorphicBibleModule {
  public readonly sqliteDriver: NodeSqliteStorageDriver;

  constructor(filePath: string) {
    const driver = new NodeSqliteStorageDriver(filePath, { readOnly: true });
    super(driver, 'bible', filePath);
    this.sqliteDriver = driver;
  }

  public getDriver(): SqlStorageDriver {
    return this.driver;
  }
}
