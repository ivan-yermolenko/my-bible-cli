import http from 'node:http';
import {
  formatCommentaryEntries,
  formatComparisonResults,
  formatDictionaryEntries,
  formatPassageResult,
} from '../formatters/output.js';
import type { MyBibleService } from '../index.js';
import type {
  BibleSearchOptions,
  ModuleType,
  OutputFormat,
  VersificationTradition,
} from '../types.js';

export interface ApiServerOptions {
  port?: number;
  host?: string;
}

export interface ApiServerInstance {
  server: http.Server;
  port: number;
  host: string;
  url: string;
  close: () => Promise<void>;
}

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function sendText(
  res: http.ServerResponse,
  statusCode: number,
  text: string,
  contentType = 'text/plain; charset=utf-8',
): void {
  const body = text;
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

/**
 * Starts a built-in lightweight REST JSON API server for MyBible modules.
 */
export async function startApiServer(
  service: MyBibleService,
  options: ApiServerOptions = {},
): Promise<ApiServerInstance> {
  const port = options.port ?? 3333;
  const host = options.host ?? '127.0.0.1';

  const server = http.createServer((req, res) => {
    // Set default CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed. Only GET is supported.' });
      return;
    }

    try {
      const parsedUrl = new URL(
        req.url ?? '/',
        `http://${req.headers.host ?? `${host}:${port}`}`,
      );
      const pathname = parsedUrl.pathname;
      const q = parsedUrl.searchParams;

      // 1. GET /api/health
      if (pathname === '/api/health') {
        sendJson(res, 200, { status: 'ok', version: '1.0.0' });
        return;
      }

      // 2. GET /api/modules?type=bible
      if (pathname === '/api/modules') {
        const typeParam = q.get('type') as ModuleType | null;
        const modules = service.registry.listModules(typeParam ?? undefined);
        sendJson(res, 200, modules);
        return;
      }

      // 3. GET /api/books?trans=ubt
      if (pathname === '/api/books') {
        const trans = q.get('trans') ?? undefined;
        const result = service.getBooks(trans);
        sendJson(res, 200, result);
        return;
      }

      // 4. GET /api/chapters?book=Пс&trans=ubt
      if (pathname === '/api/chapters') {
        const book = q.get('book');
        if (!book) {
          sendJson(res, 400, { error: "Missing required query parameter 'book'" });
          return;
        }
        const trans = q.get('trans') ?? undefined;
        const result = service.getChapters(book, trans);
        sendJson(res, 200, result);
        return;
      }

      // 5. GET /api/passage?q=Пс+22:1-6&trans=ubt&info=true&format=json
      if (pathname === '/api/passage') {
        const queryPassage = q.get('q') ?? q.get('passage');
        if (!queryPassage) {
          sendJson(res, 400, { error: "Missing required query parameter 'q'" });
          return;
        }
        const trans = q.get('trans') ?? undefined;
        const format = (q.get('format') ?? 'json').toLowerCase() as OutputFormat;
        const info = q.get('info') === 'true' || q.get('info') === '1';
        const keepStrongs = q.get('strongs') === 'true' || q.get('strongs') === '1';
        const keepNotes = q.get('notes') === 'true' || q.get('notes') === '1';
        const rawNumbers = q.get('rawNumbers') === 'true' || q.get('rawNumbers') === '1';
        const sourceTradition = q.get('tradition') as VersificationTradition | null;

        const result = service.getPassage(queryPassage, {
          trans,
          format,
          info,
          keepStrongs,
          keepNotes,
          rawNumbers,
          sourceTradition: sourceTradition ?? undefined,
        });

        if (format === 'md') {
          sendText(res, 200, formatPassageResult(result, { format: 'md', info }), 'text/markdown; charset=utf-8');
          return;
        }
        if (format === 'raw') {
          sendText(res, 200, formatPassageResult(result, { format: 'raw', info }));
          return;
        }
        if (format === 'pretty') {
          sendText(res, 200, formatPassageResult(result, { format: 'pretty', info }));
          return;
        }

        sendJson(res, 200, result);
        return;
      }

      // 6. GET /api/compare?q=Пс+9:22-25&trans=ubt,rst,ubio,kjv
      if (pathname === '/api/compare') {
        const queryPassage = q.get('q') ?? q.get('passage');
        if (!queryPassage) {
          sendJson(res, 400, { error: "Missing required query parameter 'q'" });
          return;
        }
        const transParam = q.get('trans');
        const translations = transParam
          ? transParam.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
        const format = (q.get('format') ?? 'json').toLowerCase() as OutputFormat;
        const info = q.get('info') === 'true' || q.get('info') === '1';
        const verseByVerse = q.get('verseByVerse') === 'true' || q.get('verseByVerse') === '1';

        const results = service.comparePassage(queryPassage, {
          translations,
          format,
          info,
        });

        if (format === 'md') {
          sendText(res, 200, formatComparisonResults(results, { format: 'md', info, verseByVerse }), 'text/markdown; charset=utf-8');
          return;
        }
        if (format === 'raw' || format === 'pretty') {
          sendText(res, 200, formatComparisonResults(results, { format, info, verseByVerse }));
          return;
        }

        sendJson(res, 200, results);
        return;
      }

      // 7. GET /api/search?q=Господь&trans=ubt&limit=20&testament=all
      if (pathname === '/api/search') {
        const queryText = q.get('q') ?? q.get('query');
        if (!queryText) {
          sendJson(res, 400, { error: "Missing required query parameter 'q'" });
          return;
        }
        const trans = q.get('trans') ?? undefined;
        const limit = q.get('limit') ? Number.parseInt(q.get('limit')!, 10) : undefined;
        const testament = (q.get('testament') ?? undefined) as BibleSearchOptions['testament'];
        const bookNumber = q.get('bookNumber')
          ? Number.parseInt(q.get('bookNumber')!, 10)
          : undefined;

        const result = service.search(queryText, {
          trans,
          limit,
          testament,
          bookNumber,
        });
        sendJson(res, 200, result);
        return;
      }

      // 8. GET /api/commentaries?q=Пс+22:1-6&mod=sample
      if (pathname === '/api/commentaries') {
        const queryPassage = q.get('q') ?? q.get('passage');
        if (!queryPassage) {
          sendJson(res, 400, { error: "Missing required query parameter 'q'" });
          return;
        }
        const mod = q.get('mod') ?? undefined;
        const format = (q.get('format') ?? 'json').toLowerCase() as OutputFormat;
        const keepNotes = q.get('notes') === 'true' || q.get('notes') === '1';

        const result = service.getCommentaries(queryPassage, {
          mod,
          format,
          keepNotes,
        });

        if (format === 'md') {
          sendText(res, 200, formatCommentaryEntries(result.reference, result.entries, 'md'), 'text/markdown; charset=utf-8');
          return;
        }
        if (format === 'raw' || format === 'pretty') {
          sendText(res, 200, formatCommentaryEntries(result.reference, result.entries, format));
          return;
        }

        sendJson(res, 200, result);
        return;
      }

      // 9. GET /api/dictionary?q=Благодать&mod=sample
      if (pathname === '/api/dictionary') {
        const topic = q.get('q') ?? q.get('topic');
        if (!topic) {
          sendJson(res, 400, { error: "Missing required query parameter 'q'" });
          return;
        }
        const mod = q.get('mod') ?? undefined;
        const format = (q.get('format') ?? 'json').toLowerCase() as OutputFormat;

        const result = service.getDictionary(topic, {
          mod,
          format,
        });

        if (format === 'md') {
          sendText(res, 200, formatDictionaryEntries(result.query, result.entries, 'md'), 'text/markdown; charset=utf-8');
          return;
        }
        if (format === 'raw' || format === 'pretty') {
          sendText(res, 200, formatDictionaryEntries(result.query, result.entries, format));
          return;
        }

        sendJson(res, 200, result);
        return;
      }

      // 404 Not Found
      sendJson(res, 404, { error: `Not found: ${pathname}` });
    } catch (err) {
      sendJson(res, 500, { error: (err as Error).message });
    }
  });

  return new Promise<ApiServerInstance>((resolve, reject) => {
    server.listen(port, host, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      const url = `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${actualPort}`;
      resolve({
        server,
        port: actualPort,
        host,
        url,
        close: () =>
          new Promise<void>((res, rej) =>
            server.close((err) => (err ? rej(err) : res())),
          ),
      });
    });
    server.on('error', reject);
  });
}
