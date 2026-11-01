import { Command } from 'commander';
import pc from 'picocolors';
import {
  downloadModuleBundle,
  REMOTE_MODULES_CATALOG,
  resolveTargetModulesDir,
} from './config/downloader.js';
import {
  formatCommentaryEntries,
  formatComparisonResults,
  formatDictionaryEntries,
  formatPassageResult,
} from './formatters/output.js';
import { MyBibleService } from './index.js';
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

  // 3. mybible modules
  program
    .command('modules')
    .description('List locally installed MyBible modules or available remote catalog modules')
    .option('-r, --remote', 'List all downloadable modules from the remote catalog')
    .option('-f, --format <type>', 'Output format: pretty | json', 'pretty')
    .action((opts) => {
      const format = normalizeFormat(opts.format);
      const installed = service.registry.listModules();
      const installedIds = new Set(installed.map((m) => m.id.toLowerCase()));

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
          const idPad = item.id.padEnd(8);
          const langPad = item.language.toUpperCase().padEnd(3);
          const tradPad = (item.tradition ?? '-').padEnd(4);
          const presetTag = item.defaultPreset ? pc.cyan('[preset]') : '        ';
          console.log(
            `${status}  ${pc.bold(idPad)} ${pc.yellow(langPad)} ${pc.magenta(tradPad)} ${presetTag} ${item.name}`,
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
        const idPad = m.id.padEnd(10);
        const typePad = m.type.padEnd(11);
        const langPad = (m.language ?? '-').toUpperCase().padEnd(4);
        const tradPad = (m.tradition ?? '-').padEnd(4);
        const desc = m.description ?? m.filePath;
        console.log(
          `  ${pc.bold(pc.green(idPad))} ${pc.dim(typePad)} ${pc.yellow(langPad)} ${pc.magenta(tradPad)} ${desc}`,
        );
      }
    });

  // 4. mybible download [modules...]
  program
    .command('download')
    .description('Download and compile Bible modules from the remote catalog')
    .argument('[modules...]', 'Module IDs to download (e.g., ubt ubio npu rst kjv esv)')
    .option('-a, --all', 'Download all 19 modules from the catalog')
    .option('-p, --preset', 'Download the default preset bundle of 13 translations')
    .option('-g, --global', 'Install into ~/.local/share/mybible/modules instead of ./modules')
    .option('-d, --dir <path>', 'Custom target directory for downloaded modules')
    .option('--overwrite', 'Re-download and overwrite existing module files')
    .action(async (moduleIds: string[], opts) => {
      try {
        const targetDir = resolveTargetModulesDir({
          targetDir: opts.dir,
          global: Boolean(opts.global),
        });
        console.log(pc.bold(pc.cyan(`Цільова папка модулів: ${targetDir}`)));
        const results = await downloadModuleBundle({
          moduleIds,
          all: Boolean(opts.all),
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

  // 5. mybible setup
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

  // 6. mybible comment <passage>
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

  // 7. mybible dict <topic>
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
