import { Auth, Descope } from './interfaces.ts';
import { DescopeConfig } from '../config/auth/descope.config.ts';

class DescopeAuth implements Auth {
  #token?: string;
  #exp?: number;

  constructor(
    private readonly client: Descope,
    private readonly config: DescopeConfig,
  ) {}

  async Token(): Promise<string> {
    if (this.#exp) {
      const now = Math.floor(Date.now() / 1000);
      if (this.#exp > now) {
        return this.#token!;
      }
    }
    const [token, exp] = await this.getTokenRaw();
    this.#token = token;
    this.#exp = exp ?? 0;
    return this.#token;
  }

  async getTokenRaw(): Promise<[string, number]> {
    const r = await this.client.exchangeAccessKey(this.config.key);
    return [r.jwt, r.token.exp ?? 0];
  }
}

export { DescopeAuth };
