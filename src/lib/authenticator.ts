import { writeFile } from 'node:fs/promises';
import type { Logger } from 'pino';
import type { MobileSearchCore } from '../domain/mobile_search_core.ts';

/**
 * Mints a KTMB `userData` session token via EmailLogin and writes it to a file
 * for the stream/bench commands to consume.
 *
 * KTMB allows only one active session per account, so a fresh login invalidates
 * any previous token. This is the single, explicit place helium logs in.
 */
class Authenticator {
  constructor(
    private readonly logger: Logger,
    private readonly mobileCore: MobileSearchCore,
  ) {}

  async Login(email: string, password: string, out: string, proxy?: string): Promise<string> {
    this.logger.info({ email, out }, 'Logging in to KTMB');
    const res = await this.mobileCore.login(email, password, proxy);

    // 0o600: the token is a live session credential — keep it owner-only.
    await writeFile(out, `${res.userData}\n`, { mode: 0o600 });

    this.logger.info(
      { email: res.email, fullName: res.fullName, eWallet: res.eWalletAmount, out },
      'Logged in; token written',
    );
    return res.userData;
  }
}

export { Authenticator };
