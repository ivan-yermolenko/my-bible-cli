import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MyBibleDatabase, NodeSqliteStorageDriver } from '../db/sqlite-adapter.js';
import type { ModuleMetadata, ModuleProvider, ModuleType, SqlStorageDriver } from '../types.js';

const MODULE_SUFFIXES: Array<{ suffix: string; defaultType: ModuleType }> = [
  { suffix: '.bbl.mybible', defaultType: 'bible' },
  { suffix: '.cmt.mybible', defaultType: 'commentary' },
  { suffix: '.dct.mybible', defaultType: 'dictionary' },
  { suffix: '.sqlite3', defaultType: 'bible' },
];

export function parseModuleFilename(
  fileName: string,
): { id: string; aliases: string[]; defaultType: ModuleType } | null {
  const lower = fileName.toLowerCase();
  for (const { suffix, defaultType } of MODULE_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      const base = fileName.slice(0, fileName.length - suffix.length);
      if (!base) {
        return null;
      }
      const id = base.toLowerCase();
      const aliases = [id];
      if (id.endsWith('+') && id.length > 1) {
        aliases.push(id.slice(0, -1));
      }
      if (id === 'ubt') {
        aliases.push('tub');
      } else if (id === 'tub') {
        aliases.push('ubt');
      }
      return { id, aliases, defaultType };
    }
  }
  return null;
}

export class ModuleRegistry implements ModuleProvider {
  private readonly customDirs: string[];

  constructor(customDirs: string[] = []) {
    this.customDirs = customDirs;
  }

  /**
   * Returns ordered search directories for MyBible modules:
   * 1. Custom directories passed in constructor or `MYBIBLE_DIR` env variable (colon/path.delimiter-separated).
   * 2. `./modules` in current working directory and package root directory (resolved via `import.meta.url`).
   * 3. `~/.local/share/mybible/modules` and `~/.config/mybible/modules`.
   */
  public getSearchDirectories(): string[] {
    const dirs: string[] = [];

    for (const d of this.customDirs) {
      if (d.trim()) {
        dirs.push(path.resolve(d.trim()));
      }
    }

    const envDir = process.env.MYBIBLE_DIR;
    if (envDir) {
      for (const part of envDir.split(path.delimiter)) {
        if (part.trim()) {
          dirs.push(path.resolve(part.trim()));
        }
      }
    }

    // Current working directory ./modules
    dirs.push(path.resolve(process.cwd(), 'modules'));

    // Package root ./modules (resolved relative to src/config/registry.ts or dist/config/registry.js -> ../..)
    try {
      const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
      const pkgRootModules = path.resolve(currentFileDir, '..', '..', 'modules');
      dirs.push(pkgRootModules);
    } catch {
      // Ignore if import.meta.url cannot be converted
    }

    // Standard user directories
    const home = os.homedir();
    if (home) {
      dirs.push(path.join(home, '.local', 'share', 'mybible', 'modules'));
      dirs.push(path.join(home, '.config', 'mybible', 'modules'));
    }

    // Deduplicate while preserving priority order
    return Array.from(new Set(dirs));
  }

  private scanCandidateFiles(): Array<{
    id: string;
    aliases: string[];
    filePath: string;
    defaultType: ModuleType;
  }> {
    const candidates: Array<{
      id: string;
      aliases: string[];
      filePath: string;
      defaultType: ModuleType;
    }> = [];
    const seenPaths = new Set<string>();

    for (const dir of this.getSearchDirectories()) {
      if (!fs.existsSync(dir)) {
        continue;
      }
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      // Sort entries alphabetically for deterministic discovery
      entries.sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of entries) {
        if (!entry.isFile() && !entry.isSymbolicLink()) {
          continue;
        }
        const parsed = parseModuleFilename(entry.name);
        if (!parsed) {
          continue;
        }
        const fullPath = path.resolve(dir, entry.name);
        if (seenPaths.has(fullPath)) {
          continue;
        }
        seenPaths.add(fullPath);
        candidates.push({
          id: parsed.id,
          aliases: parsed.aliases,
          filePath: fullPath,
          defaultType: parsed.defaultType,
        });
      }
    }

    return candidates;
  }

  private inspectFileMetadata(id: string, filePath: string): ModuleMetadata | null {
    let db: MyBibleDatabase | undefined;
    try {
      db = new MyBibleDatabase(filePath);
      return db.getMetadata(id);
    } catch {
      return null;
    } finally {
      db?.close();
    }
  }

  /**
   * Lists all discovered MyBible modules across configured search directories.
   */
  public listModules(type?: ModuleType): ModuleMetadata[] {
    const candidates = this.scanCandidateFiles();
    const results: ModuleMetadata[] = [];
    const seenIdsByType = new Set<string>();

    for (const candidate of candidates) {
      const metadata = this.inspectFileMetadata(candidate.id, candidate.filePath);
      if (!metadata) {
        continue;
      }
      if (type && metadata.type !== type) {
        continue;
      }
      const key = `${metadata.type}:${metadata.id}`;
      if (seenIdsByType.has(key)) {
        continue;
      }
      seenIdsByType.add(key);
      results.push(metadata);
    }

    return results;
  }

  /**
   * Resolves a module by its ID (e.g. `ubt`, `rst`, `kjv`, `barnes`) or a direct file path.
   */
  public resolveModule(idOrPath: string, expectedType?: ModuleType): ModuleMetadata {
    const trimmed = idOrPath.trim();
    if (!trimmed) {
      throw new Error('Module identifier or file path cannot be empty.');
    }

    // 1. Check if it is an existing direct file path
    const resolvedPath = path.resolve(trimmed);
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      const parsed = parseModuleFilename(path.basename(resolvedPath));
      const id =
        parsed?.id ??
        path.basename(resolvedPath, path.extname(resolvedPath)).toLowerCase();
      const metadata = this.inspectFileMetadata(id, resolvedPath);
      if (!metadata) {
        throw new Error(`Failed to open SQLite module at "${resolvedPath}".`);
      }
      if (expectedType && metadata.type !== expectedType) {
        throw new Error(
          `Module "${id}" at "${resolvedPath}" has type "${metadata.type}", but expected "${expectedType}".`,
        );
      }
      return metadata;
    }

    // 2. Search registered modules directory-by-directory in priority order
    const targetId = trimmed.toLowerCase();
    const candidates = this.scanCandidateFiles();

    // Group candidates by directory to preserve directory priority
    const dirsInOrder = this.getSearchDirectories();
    for (const dir of dirsInOrder) {
      const dirCandidates = candidates.filter((c) => path.dirname(c.filePath) === dir);
      // Exact ID match within this directory
      for (const candidate of dirCandidates) {
        if (candidate.id === targetId) {
          const metadata = this.inspectFileMetadata(candidate.id, candidate.filePath);
          if (metadata && (!expectedType || metadata.type === expectedType)) {
            return metadata;
          }
        }
      }
      // Alias match within this directory (e.g. 'rst' -> 'rst+')
      for (const candidate of dirCandidates) {
        if (candidate.aliases.includes(targetId)) {
          const metadata = this.inspectFileMetadata(candidate.id, candidate.filePath);
          if (metadata && (!expectedType || metadata.type === expectedType)) {
            return metadata;
          }
        }
      }
    }

    const available = this.listModules(expectedType)
      .map((m) => m.id)
      .join(', ');
    throw new Error(
      `Module "${idOrPath}"${expectedType ? ` (type: ${expectedType})` : ''} not found. Available modules: ${available || 'none'}`,
    );
  }

  /**
   * Resolves a module and returns an open `MyBibleDatabase` instance along with its `ModuleMetadata`.
   */
  public openDatabase(
    idOrPath: string,
    expectedType?: ModuleType,
  ): { db: MyBibleDatabase; metadata: ModuleMetadata } {
    const metadata = this.resolveModule(idOrPath, expectedType);
    const db = new MyBibleDatabase(metadata.filePath);
    return { db, metadata };
  }

  /**
   * Resolves a module and returns an open `SqlStorageDriver` instance along with its `ModuleMetadata`.
   * Implements `ModuleProvider.openModule`.
   */
  public openModule(
    idOrPath: string,
    expectedType?: ModuleType,
  ): { driver: SqlStorageDriver; metadata: ModuleMetadata } {
    const metadata = this.resolveModule(idOrPath, expectedType);
    const driver = new NodeSqliteStorageDriver(metadata.filePath, { readOnly: true });
    return { driver, metadata };
  }
}

