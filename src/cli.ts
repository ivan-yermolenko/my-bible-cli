import { Command } from 'commander';
import pc from 'picocolors';
import {
  DEFAULT_EXTRA_REGISTRY_URLS,
  downloadFromExtraRegistry,
  downloadModuleBundle,
  fetchExtraRegistry,
  REMOTE_MODULES_CATALOG,
  resolveTargetModulesDir,
} from './config/downloader.js';
import {
  formatBooksList,
  formatCommentaryEntries,
  formatComparisonResults,
  formatDictionaryEntries,
  formatPassageResult,
  formatSearchResult,
} from './formatters/output.js';
import { MyBibleService } from './index.js';
import { startApiServer } from './server/api-server.js';
import type { OutputFormat } from './types.js';

function normalizeFormat(fmt?: string): OutputFormat {
  const lower = (fmt ?? 'pretty').toLowerCase().trim();
  if (lower === 'md' || lower === 'markdown') return 'md';
  if (lower === 'raw' || lower === 'text' || lower === 'plain') return 'raw';
  if (lower === 'json') return 'json';
  return 'pretty';
}

export function createCliProgram(service = new MyBibleService()): Command {
  const program = new Command();

  program
    .name('mybible')
    .description(
      'Fast, standalone CLI toolkit for MyBible SQLite modules (.SQLite3, .bbl.mybible, .cmt.mybible, .dct.mybible) with LXX/MT Psalms versification mapping',
    )
    .version('1.0.0');

  // 1. mybible get <passage>
  program
    .command('get')
    .description('Fetch a Bible passage from a translation module')
    .argument('<passage>', 'Scripture reference (e.g., "Пс 9:10-15", "Ps 23:1-6", "Рим 8:28")')
    .option('-t, --trans <module>', 'Translation module ID or file path (e.g., ubt, ubio, npu, rst, kjv, esv)')
    .option('-f, --format <type>', 'Output format: pretty | md | raw | json', 'pretty')
    .option('-i, --info', 'Show detailed module metadata and LXX/MT versification mapping')
    .option('--strongs', "Keep Strong's numbers in output")
    .option('--notes', 'Keep translator notes/footnotes in output')
    .option('--raw-numbers', 'Disable automatic LXX <-> MT Psalm chapter/verse conversion')
    .action((passage: string, opts) => {
      try {
        const format = normalizeFormat(opts.format);
        const result = service.getPassage(passage, {
          trans: opts.trans,
          format,
          info: Boolean(opts.info),
          keepStrongs: Boolean(opts.strongs),
          keepNotes: Boolean(opts.notes),
          rawNumbers: Boolean(opts.rawNumbers),
        });
        console.log(
          formatPassageResult(result, {
            format,
            info: Boolean(opts.info),
          }),
        );
      } catch (err) {
        console.error(pc.red(`Помилка / Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  // 2. mybible compare <passage>
  program
    .command('compare')
    .description('Compare a Bible passage across multiple translations with automatic LXX/MT alignment')
    .argument('<passage>', 'Scripture reference (e.g., "Пс 22:1-6", "Пс 9:22-25", "Ів 1:1-5")')
    .option(
      '-t, --trans <modules>',
      'Comma-separated list of translation IDs (e.g., ubt,rst,ubio,npu,kjv)',
    )
    .option('-f, --format <type>', 'Output format: pretty | md | raw | json', 'pretty')
    .option('-i, --info', 'Show detailed LXX/MT versification mapping info')
    .option('--verse-by-verse', 'Interleave verses across translations')
    .option('--strongs', "Keep Strong's numbers in output")
    .option('--notes', 'Keep translator notes/footnotes in output')
    .option('--raw-numbers', 'Disable automatic LXX <-> MT Psalm conversion')
    .action((passage: string, opts) => {
      try {
        const format = normalizeFormat(opts.format);
        const translations = opts.trans
          ? String(opts.trans)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
        const results = service.comparePassage(passage, {
          translations,
          format,
          info: Boolean(opts.info),
          keepStrongs: Boolean(opts.strongs),
          keepNotes: Boolean(opts.notes),
          rawNumbers: Boolean(opts.rawNumbers),
        });
        console.log(
          formatComparisonResults(results, {
            format,
            info: Boolean(opts.info),
            verseByVerse: Boolean(opts.verseByVerse),
          }),
        );
      } catch (err) {
        console.error(pc.red(`Помилка / Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  // 3. mybible search <query>
  program
    .command('search')
    .description('Full-text search across Bible verses')
    .argument('<query>', 'Text or word to search for (e.g., "Господь", "Благодать", "любов")')
    .option('-t, --trans <module>', 'Translation module ID or file path')
    .option('-l, --limit <num>', 'Maximum number of results to return', '50')
    .option('--testament <type>', 'Filter by testament: ot | nt | all', 'all')
    .option('-f, --format <type>', 'Output format: pretty | md | raw | json', 'pretty')
    .action((query: string, opts) => {
      try {
        const format = normalizeFormat(opts.format);
        const testament =
          opts.testament === 'ot' || opts.testament === 'nt'
            ? opts.testament
            : 'all';
        const limit = Number.parseInt(opts.limit, 10) || 50;
        const result = service.search(query, {
          trans: opts.trans,
          limit,
          testament,
        });
        console.log(formatSearchResult(result, format));
      } catch (err) {
        console.error(pc.red(`Помилка / Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  // 4. mybible books
  program
    .command('books')
    .description('List all books available in a Bible module')
    .option('-t, --trans <module>', 'Translation module ID or file path')
    .option('-f, --format <type>', 'Output format: pretty | md | json', 'pretty')
    .action((opts) => {
      try {
        const format = normalizeFormat(opts.format);
        const { books } = service.getBooks(opts.trans);
        console.log(formatBooksList(books, format));
      } catch (err) {
        console.error(pc.red(`Помилка / Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  // 5. mybible modules
  program
    .command('modules')
    .description('List locally installed MyBible modules or available remote catalog modules')
    .option('-r, --remote', 'List all downloadable modules from the built-in remote catalog')
    .option('--extra-registry [url]', 'List modules from MyBible extra registry')
    .option('-f, --format <type>', 'Output format: pretty | json', 'pretty')
    .action(async (opts) => {
      const format = normalizeFormat(opts.format);
      const installed = service.registry.listModules();
      const installedIds = new Set(installed.map((m) => m.id.toLowerCase()));

      if (opts.extraRegistry !== undefined) {
        const url =
          typeof opts.extraRegistry === 'string' && opts.extraRegistry.trim()
            ? opts.extraRegistry.trim()
            : DEFAULT_EXTRA_REGISTRY_URLS[0];
        try {
          const manifest = await fetchExtraRegistry(url);
          if (format === 'json') {
            console.log(JSON.stringify(manifest, null, 2));
            return;
          }

          console.log(
            pc.bold(
              pc.cyan(
                `Модулі з MyBible Extra Registry (${manifest.modules.length}) [${url}]:`,
              ),
            ),
          );
          console.log(pc.dim('─'.repeat(78)));
          for (const item of manifest.modules) {
            const abbrPad = (item.abbreviation ?? '').padEnd(12);
            const langPad = (item.language ?? '').toUpperCase().padEnd(4);
            const fnamePad = item.file_name.padEnd(28);
            console.log(
              `  ${pc.bold(pc.green(abbrPad))} ${pc.yellow(langPad)} ${pc.dim(fnamePad)} ${item.description}`,
            );
          }
        } catch (err) {
          console.error(pc.red(`Помилка завантаження реєстру: ${(err as Error).message}`));
          process.exitCode = 1;
        }
        return;
      }

      if (opts.remote) {
        if (format === 'json') {
          console.log(
            JSON.stringify(
              REMOTE_MODULES_CATALOG.map((m) => ({
                ...m,
                installed: installedIds.has(m.id.toLowerCase()),
              })),
              null,
              2,
            ),
          );
          return;
        }

        console.log(
          pc.bold(
            pc.cyan(
              `Доступні модулі у віддаленому каталозі (${REMOTE_MODULES_CATALOG.length}):`,
            ),
          ),
        );
        console.log(pc.dim('─'.repeat(78)));
        for (const item of REMOTE_MODULES_CATALOG) {
          const isInst = installedIds.has(item.id.toLowerCase());
          const status = isInst ? pc.green('✔ installed') : pc.dim('  available');
          const idPad = item.id.padEnd(12);
          const typePad = item.type.padEnd(11);
          const langPad = item.language.toUpperCase().padEnd(5);
          const tradPad = (item.tradition ?? '-').padEnd(4);
          const presetTag = item.defaultPreset ? pc.cyan('[preset]') : '        ';
          console.log(
            `${status}  ${pc.bold(idPad)} ${pc.dim(typePad)} ${pc.yellow(langPad)} ${pc.magenta(tradPad)} ${presetTag} ${item.name}`,
          );
        }
        return;
      }

      if (format === 'json') {
        console.log(JSON.stringify(installed, null, 2));
        return;
      }

      if (installed.length === 0) {
        console.log(
          pc.yellow(
            'Локальні модулі не знайдено. Запустіть "mybible setup" для завантаження базового набору перекладів.',
          ),
        );
        return;
      }

      console.log(
        pc.bold(pc.cyan(`Встановлені локальні модулі MyBible (${installed.length}):`)),
      );
      console.log(pc.dim('─'.repeat(78)));
      for (const m of installed) {
        const idPad = m.id.padEnd(12);
        const typePad = m.type.padEnd(11);
        const langPad = (m.language ?? '-').toUpperCase().padEnd(4);
        const tradPad = (m.tradition ?? '-').padEnd(4);
        const desc = m.description ?? m.filePath;
        console.log(
          `  ${pc.bold(pc.green(idPad))} ${pc.dim(typePad)} ${pc.yellow(langPad)} ${pc.magenta(tradPad)} ${desc}`,
        );
      }
    });

  // 6. mybible download [modules...]
  program
    .command('download')
    .description('Download and compile Bible modules from the catalog or extra registry')
    .argument('[modules...]', 'Module IDs to download (e.g., ubt ubio npu rst kjv esv calvin ngsb strong)')
    .option('-a, --all', 'Download and compile ALL modules from the catalog')
    .option('-c, --commentaries', 'Download and compile all commentary modules (.cmt.mybible)')
    .option('--dictionaries', 'Download and compile all dictionary modules (.dct.mybible)')
    .option('-b, --bibles', 'Download and compile all Bible translation modules (.bbl.mybible)')
    .option('-p, --preset', 'Download the default preset bundle of 13 translations')
    .option('-g, --global', 'Install into ~/.local/share/mybible/modules instead of ./modules')
    .option('-d, --dir <path>', 'Custom target directory for downloaded modules')
    .option('--extra-registry [url]', 'Download from extra registry instead of default catalog')
    .option('--overwrite', 'Re-download and overwrite existing module files')
    .action(async (moduleIds: string[], opts) => {
      try {
        const targetDir = resolveTargetModulesDir({
          targetDir: opts.dir,
          global: Boolean(opts.global),
        });
        console.log(pc.bold(pc.cyan(`Цільова папка модулів: ${targetDir}`)));

        if (opts.extraRegistry !== undefined) {
          const regUrl =
            typeof opts.extraRegistry === 'string' && opts.extraRegistry.trim()
              ? opts.extraRegistry.trim()
              : DEFAULT_EXTRA_REGISTRY_URLS[0];

          if (!moduleIds || moduleIds.length === 0) {
            console.error(pc.red('Вкажіть назву або ID модуля для завантаження з Extra Registry.'));
            process.exitCode = 1;
            return;
          }

          for (const modId of moduleIds) {
            await downloadFromExtraRegistry(modId, regUrl, targetDir, {
              overwrite: Boolean(opts.overwrite),
              onProgress: (msg) => console.log(msg),
            });
          }
          console.log(pc.bold(pc.green('\nЗавантаження з Extra Registry успішно завершено!')));
          return;
        }

        const results = await downloadModuleBundle({
          moduleIds,
          all: Boolean(opts.all),
          commentaries: Boolean(opts.commentaries),
          dictionaries: Boolean(opts.dictionaries),
          bibles: Boolean(opts.bibles),
          preset: Boolean(opts.preset),
          targetDir,
          overwrite: Boolean(opts.overwrite),
          onProgress: (msg) => console.log(msg),
        });
        console.log(
          pc.bold(
            pc.green(
              `\nГотово! Оброблено модулів: ${results.length} (нових: ${results.filter((r) => !r.skipped).length}, пропущено існуючих: ${results.filter((r) => r.skipped).length}).`,
            ),
          ),
        );
      } catch (err) {
        console.error(pc.red(`Помилка завантаження / Download error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  // 7. mybible setup
  program
    .command('setup')
    .description(
      'One-command bootstrap: downloads default Ukrainian, Russian, and English Bible translations + sample commentary & dictionary',
    )
    .option('-a, --all', 'Download all 19 modules instead of the 13 default preset modules')
    .option('-g, --global', 'Install into ~/.local/share/mybible/modules instead of ./modules')
    .option('-d, --dir <path>', 'Custom target directory for downloaded modules')
    .option('--overwrite', 'Overwrite existing module files')
    .action(async (opts) => {
      try {
        const targetDir = resolveTargetModulesDir({
          targetDir: opts.dir,
          global: Boolean(opts.global),
        });
        console.log(
          pc.bold(
            pc.cyan(
              `Ініціалізація MyBible CLI: завантаження базового пакету модулів у ${targetDir}...`,
            ),
          ),
        );
        const results = await downloadModuleBundle({
          all: Boolean(opts.all),
          preset: !opts.all,
          includeSamples: true,
          targetDir,
          overwrite: Boolean(opts.overwrite),
          onProgress: (msg) => console.log(msg),
        });
        console.log(
          pc.bold(
            pc.green(
              `\nУспішно налаштовано! Встановлено/перевірено ${results.length} перекладів Біблії + словник та коментар.`,
            ),
          ),
        );
      } catch (err) {
        console.error(pc.red(`Помилка налаштування / Setup error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  // 8. mybible comment <passage>
  program
    .command('comment')
    .description('Query commentary entries (.cmt.mybible) for a Bible passage')
    .argument('<passage>', 'Scripture reference (e.g., "Пс 22:1-6", "Рим 8:28")')
    .option('-m, --mod <module>', 'Commentary module ID or file path')
    .option('-f, --format <type>', 'Output format: pretty | md | raw | json', 'pretty')
    .action((passage: string, opts) => {
      try {
        const format = normalizeFormat(opts.format);
        const { reference, entries } = service.getCommentaries(passage, {
          mod: opts.mod,
          format,
        });
        console.log(formatCommentaryEntries(reference, entries, format));
      } catch (err) {
        console.error(pc.red(`Помилка / Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  // 9. mybible dict <topic>
  program
    .command('dict')
    .description('Look up a term in a Bible dictionary module (.dct.mybible)')
    .argument('<topic>', 'Dictionary term/topic to search (e.g., "Благодать", "Завіт", "Grace")')
    .option('-m, --mod <module>', 'Dictionary module ID or file path')
    .option('-f, --format <type>', 'Output format: pretty | md | raw | json', 'pretty')
    .action((topic: string, opts) => {
      try {
        const format = normalizeFormat(opts.format);
        const { query, entries } = service.getDictionary(topic, {
          mod: opts.mod,
          format,
        });
        console.log(formatDictionaryEntries(query, entries, format));
      } catch (err) {
        console.error(pc.red(`Помилка / Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  // 10. mybible serve
  program
    .command('serve')
    .description('Start a local REST JSON API server for Web frontend integration')
    .option('-p, --port <number>', 'Port number to listen on', '3333')
    .option('--host <host>', 'Host address to bind to', '127.0.0.1')
    .action(async (opts) => {
      try {
        const port = Number.parseInt(opts.port, 10) || 3333;
        const host = opts.host || '127.0.0.1';
        const instance = await startApiServer(service, { port, host });
        console.log(pc.bold(pc.green(`🚀 MyBible REST API server running at ${instance.url}`)));
        console.log(pc.dim('  CORS enabled: *'));
        console.log(pc.dim('  Available endpoints:'));
        console.log(pc.cyan('  - GET /api/health'));
        console.log(pc.cyan('  - GET /api/modules?type=bible'));
        console.log(pc.cyan('  - GET /api/books?trans=ubt'));
        console.log(pc.cyan('  - GET /api/chapters?book=Пс&trans=ubt'));
        console.log(pc.cyan('  - GET /api/passage?q=Пс+22:1-6&trans=ubt'));
        console.log(pc.cyan('  - GET /api/compare?q=Пс+9:22-25&trans=ubt,kjv'));
        console.log(pc.cyan('  - GET /api/search?q=Господь&trans=ubt'));
        console.log(pc.cyan('  - GET /api/commentaries?q=Пс+22:1-6'));
        console.log(pc.cyan('  - GET /api/dictionary?q=Благодать'));
        console.log(pc.dim('\nPress Ctrl+C to stop the server.'));

        process.on('SIGINT', async () => {
          console.log(pc.yellow('\nShutting down server...'));
          await instance.close();
          process.exit(0);
        });
      } catch (err) {
        console.error(pc.red(`Помилка запуску сервера / Server error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });

  return program;
}

export async function runCli(argv = process.argv): Promise<void> {
  const program = createCliProgram();
  await program.parseAsync(argv);
}

// Execute automatically when invoked directly
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('/cli.ts') ||
    process.argv[1].endsWith('/cli.js') ||
    process.argv[1].endsWith('\\cli.ts') ||
    process.argv[1].endsWith('\\cli.js'));

if (isDirectExecution) {
  runCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
