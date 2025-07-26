import type { Logger } from 'pino';
import type { SearcherBuilder } from '../domain/searcher/builder.ts';
import { addDays, differenceInDays } from 'date-fns';
import type { RetrieveResult } from './interfaces.ts';
import type { PopulatorConfig } from '../config/populator.config.ts';
import { __ } from '../utility.ts';

class Populator {
  constructor(
    private readonly config: PopulatorConfig,
    private readonly logger: Logger,
    private readonly builder: SearcherBuilder,
  ) {}

  async Retrieve(from: Date, to: Date): Promise<RetrieveResult[]> {
    const searcher = await this.builder.BuildLoaded();

    const ret: RetrieveResult[] = [];

    // Calculate the number of days between the two dates
    const totalDays = differenceInDays(to, from);

    this.logger.info({ totalDays }, 'Retrieving schedule for days');
    // Iterate over each day
    for (let i = 0; i <= totalDays; i++) {
      // Create a new date by adding i days to the initial date
      const currentDate = addDays(from, i);

      this.logger.info({ currentDate, progress: `${i}/${totalDays}` }, 'Retrieving schedule for date');

      try {
        const j2w = await searcher.Search('JToW', currentDate);
        const w2j = await searcher.Search('WToJ', currentDate);

        const j2wR = j2w.map(s => `${s.departure_time}:00`);
        const w2jR = w2j.map(s => `${s.departure_time}:00`);

        ret.push({
          date: currentDate,
          jToW: j2wR,
          wToJ: w2jR,
        });
      } catch (e) {
        this.logger.error({ error: e }, 'Failed to retrieve schedule');
        break;
      }
      await __(this.config.delay);
    }
    return ret;
  }
}

export { Populator };
