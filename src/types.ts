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
}
