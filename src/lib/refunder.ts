import { Logger } from "pino";
import { Api } from "./zinc/Api.ts";
import { Utility } from "../utility.ts";
import { Res } from "./core/result.ts";
import { BookingPrincipalRes } from "./zinc/data-contracts.ts";
import { ProblemDetails } from "../errors/problem_details.ts";
import { AggregatedError } from "../errors/v1/aggregate_error.ts";

class Refunder {
  constructor(
    private readonly logger: Logger,
    private readonly zinc: Api,
    private readonly utility: Utility,
  ) {}

  async Refund(): Promise<void> {
    this.logger.info("Starting refunding");

    await this.utility
      .toResult(
        () => this.zinc.vBookingRefundDetail("1.0"),
        "Failed to retrieve list of tickets to be refunded",
      )
      .map(async (tickets) => {
        const res: (["err", ProblemDetails] | ["ok", BookingPrincipalRes])[] =
          [];

        for (const ticket of tickets) {
          const r = await this.utility
            .toResult(async () => {
              this.logger.info({ ticket: ticket.id }, "Refunding ticket");
              return await this.zinc.vBookingRefundCreate(ticket.id, "1.0");
            }, `Failed to refund ticket ${ticket.id}`)
            .serial();
          res.push(r);
        }

        const results = Res.all(...res.map((x) => Res.fromSerial(x)));

        return results.mapErr(
          (x) =>
            ({
              data: new AggregatedError(
                "Failed to refund tickets",
                x.map((y) => y),
              ),
              detail: "Failed to some refund tickets, see sub-problems",
              type: "aggregate_error",
              status: 400,
              title: "Failed to refund tickets",
              traceId: "see sub-problems",
            }) satisfies ProblemDetails,
        );
      })
      .match({
        err: (e) => this.logger.error({ error: e }, "Failed to refund tickets"),
        ok: (ok) => this.logger.info({ result: ok }, "Completed refunding"),
      });
    this.logger.info("Completed refunding");
  }
}

export { Refunder };
