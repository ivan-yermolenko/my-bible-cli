export type VersificationTradition = 'LXX' | 'MT';

export type ModuleType = 'bible' | 'commentary' | 'dictionary';

export type OutputFormat = 'pretty' | 'md' | 'raw' | 'json';

export interface BookInfo {
  bookNumber: number;
  canonicalCode: string;
  shortNameUa: string;
  longNameUa: string;
  shortNameEn: string;
  longNameEn: string;
  shortNameRu: string;
  longNameRu: string;
  aliases: string[];
}

export interface VerseRange {
  start: number;
  end: number;
}

export interface ParsedReference {
  raw: string;
  bookNumber: number;
  bookName: string;
  chapter: number;
  /** If empty/undefined, means the entire chapter */
  ranges?: VerseRange[];
  /** Detected language/tradition hint from the input reference */
  inputTraditionHint?: VersificationTradition;
}

export interface VerseCoordinate {
  bookNumber: number;
  chapter: number;
  verse: number;
}

export interface PsalmMappingSegment {
  sourceTradition: VersificationTradition;
  targetTradition: VersificationTradition;
  sourceChapter: number;
  sourceVerseStart?: number;
  sourceVerseEnd?: number;
  targetChapter: number;
  targetVerseStart?: number;
  targetVerseEnd?: number;
  note: string;
}

export interface PsalmConversionResult {
  originalReference: ParsedReference;
  sourceTradition: VersificationTradition;
  targetTradition: VersificationTradition;
  isChanged: boolean;
  /** Target references in the destination tradition (can be 1 or 2 chapters if split, e.g. LXX Ps 9 -> MT Ps 9 & 10) */
  targetReferences: ParsedReference[];
  mappingNotes: string[];
  segments: PsalmMappingSegment[];
}

export interface ModuleMetadata {
  id: string;
  filePath: string;
  type: ModuleType;
  language?: string;
  description?: string;
  isStrong?: boolean;
  tradition?: VersificationTradition;
}

export interface BibleVerse {
  bookNumber: number;
  bookShortName?: string;
  bookLongName?: string;
  chapter: number;
  verse: number;
  rawText: string;
  cleanText: string;
  translation: string;
  tradition?: VersificationTradition;
  /** Original coordinate in the source tradition when cross-mapped */
  mappedFrom?: {
    tradition: VersificationTradition;
    chapter: number;
    verse: number;
  };
}

export interface CommentaryEntry {
  bookNumber: number;
  chapterFrom: number;
  verseFrom: number;
  chapterTo: number;
  verseTo: number;
  rawText: string;
  cleanText: string;
  moduleId: string;
}

export interface DictionaryEntry {
  topic: string;
  rawDefinition: string;
  cleanDefinition: string;
  moduleId: string;
}

export interface CleanTextOptions {
  keepStrongs?: boolean;
  keepNotes?: boolean;
  markdownItalics?: boolean;
  highlightJesusWords?: boolean;
}

export interface PassageQueryResult {
  query: string;
  parsedReference: ParsedReference;
  effectiveReference: ParsedReference[];
  module: ModuleMetadata;
  verses: BibleVerse[];
  versificationInfo?: PsalmConversionResult;
  /** Helpful message when the requested book is absent from the module */
  missingBookHint?: string;
}

/**
 * Universal synchronous/isomorphic SQL storage driver interface.
 * Can be implemented by Node.js DatabaseSync, sql.js, better-sqlite3, OPFS, or in-memory mocks.
 */
export interface SqlStorageDriver {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined;
  close(): void;
}

/**
 * Universal module resolution and provider interface.
 */
export interface ModuleProvider {
  listModules(type?: ModuleType): ModuleMetadata[];
  resolveModule(idOrPath: string, expectedType?: ModuleType): ModuleMetadata;
  openModule(idOrPath: string, expectedType?: ModuleType): { driver: SqlStorageDriver; metadata: ModuleMetadata };
}

/**
 * Book navigation summary for Web UIs.
 */
export interface ModuleBookSummary {
  bookNumber: number;
  canonicalBookNumber: number;
  shortName: string;
  longName: string;
  chapterCount: number;
  isNewTestament: boolean;
}

/**
 * Chapter navigation summary for Web UIs.
 */
export interface ChapterSummary {
  bookNumber: number;
  chapter: number;
  verseCount: number;
}

/**
 * Bible full-text search options.
 */
export interface BibleSearchOptions {
  trans?: string;
  limit?: number;
  bookNumber?: number;
  testament?: 'ot' | 'nt' | 'all';
  caseSensitive?: boolean;
}

/**
 * Bible full-text search result.
 */
export interface BibleSearchResult {
  query: string;
  module: ModuleMetadata;
  totalMatches: number;
  verses: BibleVerse[];
}

/**
 * Item in MyBible Extra Registry (e.g. from http://mybible.infoo.pro/extra.registry.json).
 */
export interface ExtraRegistryItem {
  url?: string;
  download_url?: string;
  file_name: string;
  language?: string;
  description?: string;
  version?: string;
  size?: number;
  abbreviation?: string;
  type?: string;
}

/**
 * Manifest containing modules from a MyBible Extra Registry.
 */
export interface ExtraRegistryManifest {
  registry_url?: string;
  name?: string;
  description?: string;
  modules: ExtraRegistryItem[];
}

