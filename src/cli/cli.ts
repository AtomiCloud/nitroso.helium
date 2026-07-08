import { program } from 'commander';
import type { Logger } from 'pino';
import { trace } from '@opentelemetry/api';
import type { RootConfig } from '../config/root.config.ts';
import type { ZincDate } from '../util/zinc_date.ts';
import type { Watcher } from '../lib/watcher.ts';
import type { Get } from '../lib/get.ts';
import { AsciiTable3 } from 'ascii-table3';
import type { Updater } from '../lib/updater.ts';
import type { Refunder } from '../lib/refunder.ts';
import type { Reverter } from '../lib/reverter.ts';
import type { Streamer, WatchEntry } from '../lib/streamer.ts';
import type { Authenticator } from '../lib/authenticator.ts';
import type { From, StreamSpec } from '../domain/interface.ts';

class Cli {
  constructor(
    private readonly logger: Logger,
    private readonly cfg: RootConfig,
    private readonly zincDate: ZincDate,
    private readonly watcher: Watcher,
    private readonly getter: Get,
    private readonly updater: Updater,
    private readonly refunder: Refunder,
    private readonly reverter: Reverter,
    private readonly streamer: Streamer,
    private readonly authenticator: Authenticator,
  ) {}

  err(message: string): never {
    this.logger.error(message);
    return process.exit(1);
  }

  // -d targets: array of {date, from}. The "what to poll".
  private parseTargets(raw: string): { d: Date; from: From }[] {
    let source: unknown;
    try {
      source = JSON.parse(raw);
    } catch {
      this.err('Targets (-d) must be valid JSON');
    }
    if (!Array.isArray(source)) this.err('Targets (-d) must be a JSON array of {date, from}');
    return source.map((r, idx) => {
      if (typeof r !== 'object' || r == null) this.err(`Target #${idx} must be an object`);
      const o = r as Record<string, unknown>;
      if (typeof o.date !== 'string') this.err(`Target #${idx}: 'date' is required (dd-mm-yyyy)`);
      if (o.from !== 'JToW' && o.from !== 'WToJ') this.err(`Target #${idx}: 'from' must be 'JToW' or 'WToJ'`);
      return { d: this.zincDate.from(o.date), from: o.from };
    });
  }

  // -s settings: array of poll configs (no date/from). The "how to poll".
  private parseSettings(raw: string): StreamSpec[] {
    let source: unknown;
    try {
      source = JSON.parse(raw);
    } catch {
      this.err('Settings (-s) must be valid JSON');
    }
    if (!Array.isArray(source)) this.err('Settings (-s) must be a JSON array');
    return source.map((r, idx) => this.validateSetting(r, idx));
  }

  private validateSetting(r: unknown, idx: number): StreamSpec {
    if (typeof r !== 'object' || r == null) this.err(`Setting #${idx} must be an object`);
    const o = r as Record<string, unknown>;

    const mode = o.mode ?? 'web';
    if (mode !== 'web' && mode !== 'mobile') this.err(`Setting #${idx}: mode must be 'web' or 'mobile'`);
    const type = o.type ?? 'stateless';
    if (type !== 'stateless' && type !== 'held') this.err(`Setting #${idx}: type must be 'stateless' or 'held'`);
    const delay = o.delay ?? 1000;
    if (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 0)
      this.err(`Setting #${idx}: delay must be a non-negative number (milliseconds)`);
    if (o.proxy != null && typeof o.proxy !== 'string' && typeof o.proxy !== 'boolean')
      this.err(`Setting #${idx}: proxy must be a URL string, true (pool), or false/omitted (direct)`);
    if (o.token != null && typeof o.token !== 'string') this.err(`Setting #${idx}: token must be a string`);
    if (o.spoofIp != null && typeof o.spoofIp !== 'boolean') this.err(`Setting #${idx}: spoofIp must be a boolean`);
    if (mode === 'mobile' && (typeof o.token !== 'string' || o.token.length === 0))
      this.err(`Setting #${idx}: mobile settings require a 'token' (userData)`);

    return {
      mode,
      type,
      delay,
      proxy: o.proxy as string | boolean | undefined,
      token: o.token as string | undefined,
      spoofIp: o.spoofIp as boolean | undefined,
    };
  }

  async start(): Promise<void> {
    this.logger.debug(this.cfg, 'Starting CLI');
    const a = this.cfg.app;
    const tracer = trace.getTracer(`${a.platform}.${a.service}.${a.module}`);
    program.name('nitroso-helium').description('Nitroso Helium - Pollee Job').version('0.0.0');

    program
      .command('schedule')
      .description('Poll Schedules to update database on which schedules are available')
      .action(async () => {
        this.logger.info('Starting updating schedule');
        await this.updater.Update();
        this.logger.info('Completed updating schedule');
        process.exit(0);
      });

    program
      .command('wait')
      .description('Wait indefinitely')
      .action(async () => {
        process.on('SIGINT', () => {
          console.log('Received SIGINT signal. Terminating...');
          process.exit();
        });
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      });

    program
      .command('refunder')
      .description('Initiate Refund Process')
      .action(async () => {
        await this.refunder.Refund();
        process.exit(0);
      });

    program
      .command('reverter')
      .description('Initiate Reverting Process')
      .action(async () => {
        await this.reverter.Revert();
        process.exit(0);
      });

    program
      .command('get <date> <from>')
      .description('Get schedule for a fixed day and direction')
      .action(async (date: string, from: string) => {
        if (date == null) this.err('Date is required');
        if (from == null) this.err('From is required');
        if (from !== 'JToW' && from !== 'WToJ') this.err("From must be either 'JToW' or 'WToJ'");

        const d = this.zincDate.from(date);
        const f = from as 'JToW' | 'WToJ';

        const out = await this.getter.Get(d, f);

        this.logger.info({ length: out.length }, 'Length obtained');

        if (out.length > 0) {
          const table = new AsciiTable3().setAlignCenter(2).addRowMatrix(out);
          console.log(table.toString());
        } else {
          console.log('No data found');
        }
        process.exit(0);
      });

    program
      .command('multi-watch')
      .description(
        'Poll targets × settings. -d targets [{date,from}], -s settings [{mode,type,delay,proxy,spoofIp,token}]',
      )
      .option('-d, --data <data>', 'JSON array of targets: [{date, from}]')
      .option('-s, --settings <settings>', 'JSON array of poll settings (cross-producted with targets)')
      .option('-i, --interval <interval>', 'Total run duration in seconds')
      .option('--dry-run', 'Log fetched schedules instead of publishing to redis')
      .action(
        async ({
          data,
          settings,
          interval,
          dryRun,
        }: {
          data: string;
          settings: string;
          interval: string;
          dryRun?: boolean;
        }) => {
          await tracer.startActiveSpan('multi-watch', async span => {
            if (data == null) this.err('Targets are required, -d \'[{"date":..,"from":..}]\'');
            if (settings == null) this.err('Settings are required, -s \'[{"mode":..}]\'');
            if (interval == null) this.err('Interval is required, -i <seconds>');

            const i = Number.parseInt(interval);
            if (Number.isNaN(i)) this.err('Interval must be a number');

            const targets = this.parseTargets(data);
            const specs = this.parseSettings(settings);
            if (targets.length === 0) this.err('No targets provided (-d)');
            if (specs.length === 0) this.err('No settings provided (-s)');

            // commutative cross product: every target polled by every setting
            const entries: WatchEntry[] = targets.flatMap(t => specs.map(spec => ({ d: t.d, from: t.from, spec })));

            const now = Date.now();
            this.logger.info(
              {
                targets: targets.length,
                settings: specs.length,
                streams: entries.length,
                interval,
                dryRun: dryRun ?? false,
              },
              'Starting multi-watch',
            );
            await this.streamer.Run(entries, now, i * 1000, dryRun ?? false);
            span.end();
          });
          process.exit(0);
        },
      );

    program
      .command('watch')
      .description('Start repeatedly poll and watch for changes for a fixed day and direction')
      .option('-d, --date <date>', 'Date to poll')
      .option('-f, --from <from>', "Direction to poll, either 'JToW' or 'WToJ'")
      .option('-i, --interval <interval>', 'Interval to poll in seconds, default 180')
      .action(async ({ date, from, interval }: { date: string; from: string; interval: string }) => {
        await tracer.startActiveSpan('watch', async span => {
          if (date == null) this.err('Date is required, -d <dd-mm-yyyy>');
          if (from == null) this.err('From is required, -f <JToW|WToJ>');
          if (interval == null) this.err('Interval is required, -i <seconds>');

          const d = this.zincDate.from(date);
          const i = Number.parseInt(interval);
          const f = from as 'JToW' | 'WToJ';

          if (Number.isNaN(i)) this.err('Interval must be a number');
          if (from !== 'JToW' && from !== 'WToJ') this.err("From must be either 'JToW' or 'WToJ'");
          const now = Date.now();
          this.logger.info({ date, from, interval }, 'Starting watch');
          await this.watcher.Watch(d, now, i, f);
          span.end();
        });
        process.exit(0);
      });

    program
      .command('login')
      .description('Log in to KTMB mobile API and write the userData token to a file')
      .option('-e, --email <email>', 'KTMB account email')
      .option('-p, --password <password>', 'KTMB account password')
      .option('-o, --out <out>', 'Output token file, default ktmb.token')
      .option('--proxy <proxy>', 'Proxy to log in through')
      .action(
        async ({
          email,
          password,
          out,
          proxy,
        }: {
          email?: string;
          password?: string;
          out?: string;
          proxy?: string;
        }) => {
          if (email == null) this.err('Email is required, -e <email>');
          if (password == null) this.err('Password is required, -p <password>');
          const outFile = out ?? 'ktmb.token';
          try {
            await this.authenticator.Login(email, password, outFile, proxy);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            if (/multiple login/i.test(message)) {
              this.err(
                'Login failed: this account already has an active KTMB session (only one session per ' +
                  'account is allowed). Release the existing session (log it out, or use KTMB "Forget ' +
                  `Password" to reset) and then re-login — or use a different account. Detail: ${message}`,
              );
            }
            this.err(`Login failed: ${message}`);
          }
          process.exit(0);
        },
      );

    await program.parseAsync(process.argv);
  }
}

export { Cli };
