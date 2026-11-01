export * from './types.js';
export * from './parser/book-names.js';
export * from './parser/reference-parser.js';
export * from './versification/psalms-mapper.js';
export * from './db/sqlite-adapter.js';
export * from './config/registry.js';
export * from './config/downloader.js';
export * from './utils/text-cleaner.js';
export * from './formatters/output.js';

import { ModuleRegistry } from './config/registry.js';
import { parseReference } from './parser/reference-parser.js';
import type {
  BibleVerse,
  CleanTextOptions,
  CommentaryEntry,
  DictionaryEntry,
  ModuleMetadata,
  OutputFormat,
  ParsedReference,
  PassageQueryResult,
  PsalmConversionResult,
  VersificationTradition,
} from './types.js';
import {
  convertPsalmReference,
  describePsalmVersification,
  mapSinglePsalmVerse,
} from './versification/psalms-mapper.js';

export interface GetPassageOptions {
  trans?: string;
  format?: OutputFormat;
  info?: boolean;
  keepStrongs?: boolean;
  keepNotes?: boolean;
  rawNumbers?: boolean;
  sourceTradition?: VersificationTradition;
}

export interface ComparePassageOptions {
  translations?: string[];
  format?: OutputFormat;
  info?: boolean;
  keepStrongs?: boolean;
  keepNotes?: boolean;
  rawNumbers?: boolean;
}

export class MyBibleService {
  public readonly registry: ModuleRegistry;

  constructor(registryOrDirs?: ModuleRegistry | string[]) {
    if (registryOrDirs instanceof ModuleRegistry) {
      this.registry = registryOrDirs;
    } else {
      this.registry = new ModuleRegistry(registryOrDirs ?? []);
    }
  }

  private resolveDefaultBibleModuleId(requestedTrans?: string): string {
    if (requestedTrans && requestedTrans.trim()) {
      return requestedTrans.trim();
    }
    const bibles = this.registry.listModules('bible');
    const preferred = ['ubt', 'ubio', 'ubio88', 'utt', 'npu', 'rst', 'kjv', 'esv'];
    for (const pref of preferred) {
      const hit = bibles.find((m) => m.id.toLowerCase() === pref);
      if (hit) {
        return hit.id;
      }
    }
    if (bibles.length > 0) {
      return bibles[0].id;
    }
    return 'ubt';
  }

  /**
   * Fetches a Bible passage from a single translation, automatically converting
   * LXX <-> MT Psalm numbering when appropriate (unless `rawNumbers: true`).
   */
  public getPassage(
    passage: string,
    options: GetPassageOptions = {},
  ): PassageQueryResult {
    const parsedRef = parseReference(passage);
    const transId = this.resolveDefaultBibleModuleId(options.trans);
    const { db, metadata } = this.registry.openDatabase(transId, 'bible');

    try {
      const targetTradition: VersificationTradition = metadata.tradition ?? 'MT';
      const sourceTradition: VersificationTradition =
        options.sourceTradition ??
        parsedRef.inputTraditionHint ??
        targetTradition;

      let effectiveReference: ParsedReference[] = [parsedRef];
      let versificationInfo: PsalmConversionResult | undefined;

      if (parsedRef.bookNumber === 190) {
        if (!options.rawNumbers && sourceTradition !== targetTradition) {
          versificationInfo = convertPsalmReference(
            parsedRef,
            sourceTradition,
            targetTradition,
          );
          effectiveReference = versificationInfo.targetReferences;
        } else {
          // Same tradition or --raw-numbers: still populate versificationInfo for --info inspection
          versificationInfo =
            sourceTradition !== targetTradition
              ? convertPsalmReference(parsedRef, targetTradition, targetTradition)
              : describePsalmVersification(parsedRef, targetTradition);
          if (options.rawNumbers || sourceTradition === targetTradition) {
            versificationInfo = {
              ...versificationInfo,
              isChanged: false,
            };
          }
        }
      }

      const cleanOpts: CleanTextOptions = {
        keepStrongs: options.keepStrongs,
        keepNotes: options.keepNotes,
        markdownItalics: options.format === 'md',
      };

      const verses: BibleVerse[] = [];
      for (const effRef of effectiveReference) {
        const fetched = db.getVerses(effRef, cleanOpts, metadata.id);
        for (const v of fetched) {
          if (
            parsedRef.bookNumber === 190 &&
            !options.rawNumbers &&
            sourceTradition !== targetTradition
          ) {
            const backMapped = mapSinglePsalmVerse(
              v.chapter,
              v.verse,
              targetTradition,
              sourceTradition,
            );
            v.mappedFrom = {
              tradition: sourceTradition,
              chapter: backMapped.chapter,
              verse: backMapped.verse,
            };
          }
          verses.push(v);
        }
      }

      return {
        query: passage,
        parsedReference: parsedRef,
        effectiveReference,
        module: metadata,
        verses,
        ...(versificationInfo ? { versificationInfo } : {}),
      };
    } finally {
      db.close();
    }
  }

  /**
   * Compares a Bible passage across multiple translations, automatically aligning
   * LXX and MT Psalm coordinates across translations.
   */
  public comparePassage(
    passage: string,
    options: ComparePassageOptions = {},
  ): PassageQueryResult[] {
    const parsedRef = parseReference(passage);

    let translations = options.translations?.filter((t) => t.trim()) ?? [];
    if (translations.length === 0) {
      const installedBibles = this.registry.listModules('bible');
      const preferredOrder = ['ubt', 'ubio', 'npu', 'rst', 'kjv', 'esv'];
      const ordered: string[] = [];
      for (const pref of preferredOrder) {
        if (installedBibles.some((m) => m.id.toLowerCase() === pref)) {
          ordered.push(pref);
        }
      }
      for (const m of installedBibles) {
        if (!ordered.includes(m.id.toLowerCase())) {
          ordered.push(m.id);
        }
      }
      translations = ordered.slice(0, 6);
    }

    if (translations.length === 0) {
      throw new Error(
        'No Bible modules found to compare. Run "mybible setup" to download default translations.',
      );
    }

    // Determine source tradition from input hint or first module
    let sourceTradition: VersificationTradition | undefined =
      parsedRef.inputTraditionHint;
    if (!sourceTradition && translations.length > 0) {
      try {
        const firstMeta = this.registry.resolveModule(translations[0], 'bible');
        sourceTradition = firstMeta.tradition ?? 'LXX';
      } catch {
        sourceTradition = 'LXX';
      }
    }

    return translations.map((trans) =>
      this.getPassage(passage, {
        trans,
        format: options.format,
        info: options.info,
        keepStrongs: options.keepStrongs,
        keepNotes: options.keepNotes,
        rawNumbers: options.rawNumbers,
        sourceTradition,
      }),
    );
  }

  /**
   * Queries commentaries for a passage from a specified or default `.cmt.mybible` module.
   */
  public getCommentaries(
    passage: string,
    options: { mod?: string; format?: OutputFormat; keepNotes?: boolean } = {},
  ): { reference: ParsedReference; module: ModuleMetadata; entries: CommentaryEntry[] } {
    const parsedRef = parseReference(passage);
    let modId = options.mod?.trim();
    if (!modId) {
      const cmts = this.registry.listModules('commentary');
      if (cmts.length === 0) {
        throw new Error(
          'No commentary modules (.cmt.mybible) installed. Run "mybible setup" to install sample commentary.',
        );
      }
      modId = cmts[0].id;
    }

    const { db, metadata } = this.registry.openDatabase(modId, 'commentary');
    try {
      const entries = db.getCommentaries(
        parsedRef,
        {
          keepNotes: options.keepNotes,
          markdownItalics: options.format === 'md',
        },
        metadata.id,
      );
      return { reference: parsedRef, module: metadata, entries };
    } finally {
      db.close();
    }
  }

  /**
   * Queries dictionary definitions for a topic from a specified or default `.dct.mybible` module.
   */
  public getDictionary(
    topic: string,
    options: { mod?: string; format?: OutputFormat } = {},
  ): { query: string; module: ModuleMetadata; entries: DictionaryEntry[] } {
    let modId = options.mod?.trim();
    if (!modId) {
      const dcts = this.registry.listModules('dictionary');
      if (dcts.length === 0) {
        throw new Error(
          'No dictionary modules (.dct.mybible) installed. Run "mybible setup" to install sample dictionary.',
        );
      }
      modId = dcts[0].id;
    }

    const { db, metadata } = this.registry.openDatabase(modId, 'dictionary');
    try {
      const entries = db.getDictionaryDefinition(
        topic,
        { markdownItalics: options.format === 'md' },
        metadata.id,
      );
      return { query: topic, module: metadata, entries };
    } finally {
      db.close();
    }
  }
}
