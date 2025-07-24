import { Logger } from 'pino';
import { Api } from './zinc/Api.ts';
import { Utility } from '../utility.ts';
import { Res } from './core/result.ts';
import { BookingPrincipalRes } from './zinc/data-contracts.ts';
import { ProblemDetails } from '../errors/problem_details.ts';
import { AggregatedError } from '../errors/v1/aggregate_error.ts';

class Reverter {
  constructor(
    private readonly logger: Logger,
    private readonly zinc: Api,
    private readonly utility: Utility,
  ) {}

  async Revert(): Promise<void> {
    this.logger.info('Starting reverting');

    await this.utility
      .toResult(
        () =>
          this.zinc.vBookingDetail('1.0', {
            Status: 'Buying',
          }),
        'Failed to list of bookings that is in the buying state',
      )
      .map(async tix => {
        const res: (['err', ProblemDetails] | ['ok', BookingPrincipalRes])[] = [];

        for (const ticket of tix) {
          const r = await this.utility
            .toResult(async () => {
              this.logger.info({ ticket: ticket.id }, 'Reverting ticket');
              return await this.zinc.vBookingRevertCreate(ticket.id, '1.0');
            }, `Failed to revert ticket ${ticket.id}`)
            .serial();
          res.push(r);
        }

        const results = Res.all(...res.map(x => Res.fromSerial(x)));

        return results.mapErr(
          x =>
            ({
              data: new AggregatedError(
                'Failed to revert tickets',
                x.map(y => y),
              ),
              detail: 'Failed to some revert tickets, see sub-problems',
              type: 'aggregate_error',
              status: 400,
              title: 'Failed to revert tickets',
              traceId: 'see sub-problems',
            }) satisfies ProblemDetails,
        );
      })
      .match({
        err: e => this.logger.error({ error: e }, 'Failed to revert tickets'),
        ok: ok => this.logger.info({ result: ok }, 'Completed reverting'),
      });
    this.logger.info('Completed reverting');
  }
}

export { Reverter };
