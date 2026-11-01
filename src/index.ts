export * from './types.js';
export * from './parser/book-names.js';
export * from './parser/reference-parser.js';
export * from './versification/psalms-mapper.js';
export * from './db/sqlite-adapter.js';
export * from './config/registry.js';
export * from './config/downloader.js';
export * from './utils/text-cleaner.js';
export * from './formatters/output.js';
export * from './core/engine.js';
export * from './server/api-server.js';

import { ModuleRegistry } from './config/registry.js';
import {
  type ComparePassageOptions,
  type GetPassageOptions,
  MyBibleCoreEngine,
} from './core/engine.js';

export type { ComparePassageOptions, GetPassageOptions };

/**
 * Node.js high-level MyBible service.
 * Extends `MyBibleCoreEngine` using `ModuleRegistry` as the module provider.
 */
export class MyBibleService extends MyBibleCoreEngine {
  public readonly registry: ModuleRegistry;

  constructor(registryOrDirs?: ModuleRegistry | string[]) {
    let registry: ModuleRegistry;
    if (registryOrDirs instanceof ModuleRegistry) {
      registry = registryOrDirs;
    } else {
      registry = new ModuleRegistry(registryOrDirs ?? []);
    }
    super(registry);
    this.registry = registry;
  }
}
