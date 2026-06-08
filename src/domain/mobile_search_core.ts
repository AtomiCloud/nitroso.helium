import moment from 'moment';
import type { Logger } from 'pino';
import type { SearcherConfig } from '../config/searcher.config.ts';
import type { From, TrainSchedule } from './interface.ts';
import { randomIp } from '../util/random_ip.ts';

// Numeric station ids used by the mobile API (distinct from the web station names).
const JB_STATION_ID = '37500';
const WOODLANDS_STATION_ID = '37600';

const DEFAULT_API_URL = 'https://shuttleonline-api.ktmb.com.my';
const DEFAULT_APP_URL = 'https://online-api.ktmb.com.my';

// Every mobile response is wrapped in this envelope. `status: false` => the
// `messages` array carries the error.
interface ApiResponse<T> {
  status: boolean;
  messages: string[];
  messageCode: string | null;
  data: T;
}

interface Station {
  id: string;
  stationData: string;
}

interface StationsData {
  stations: Station[];
}

interface SearchData {
  searchData: string;
}

interface Trip {
  trainNo: string;
  serviceCategory: string;
  departDateTime: string;
  arrivalDateTime: string;
  seat: number | string;
  price: number | string;
  currency: string;
  tripData: string;
}

interface TripData {
  trips: Trip[];
}

interface LoginData {
  email: string;
  fullName: string;
  eWalletAmount: number;
  eWalletCurrency: string;
  userData: string;
}

// Map from station id -> opaque `stationData` blob required by Search.
type StationMap = Map<string, string>;

/**
 * Mobile counterpart of {@link SearchCore}. Talks to KTMB's mobile JSON API
 * using a caller-supplied `userData` token + global `requestSignature`.
 *
 * It deliberately performs NO login/logout — KTMB allows only one active
 * session per account, so the token is owned centrally and passed in verbatim.
 */
class MobileSearchCore {
  #config: SearcherConfig;
  #logger: Logger;

  constructor(config: SearcherConfig, logger: Logger) {
    this.#config = config;
    this.#logger = logger;
  }

  get #apiUrl(): string {
    return this.#config.apiUrl ?? DEFAULT_API_URL;
  }

  get #appUrl(): string {
    return this.#config.appUrl ?? DEFAULT_APP_URL;
  }

  get #signature(): string {
    const s = this.#config.requestSignature;
    if (s == null) throw new Error('requestSignature is required for mobile mode');
    return s;
  }

  // Headers common to every mobile call (no session).
  #baseHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      requestSignature: this.#signature,
    };
  }

  // Session-scoped headers for shuttle endpoints.
  #headers(userData: string): Record<string, string> {
    return { ...this.#baseHeaders(), userData };
  }

  async #send<T>(url: string, headers: Record<string, string>, body: unknown, proxy?: string): Promise<T> {
    const init = {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    } as RequestInit;
    // Bun's fetch supports a `proxy` field that isn't in the DOM lib types.
    if (proxy) (init as { proxy?: string }).proxy = proxy;

    const resp = await fetch(url, init);
    const text = await resp.text();

    let parsed: ApiResponse<T>;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      this.#logger.info({ text, url }, 'Error parsing mobile response from KTMB');
      this.#logger.error(e, 'Error parsing mobile response from KTMB');
      throw e;
    }

    if (!parsed.status) {
      throw new Error(`KTMB mobile API error on ${url}: ${JSON.stringify(parsed.messages)}`);
    }
    return parsed.data;
  }

  async #post<T>(path: string, userData: string, body: unknown, proxy?: string, spoofIp = false): Promise<T> {
    const headers = spoofIp ? { ...this.#headers(userData), 'X-Real-IP': randomIp() } : this.#headers(userData);
    return this.#send<T>(`${this.#apiUrl}${path}`, headers, body, proxy);
  }

  // EmailLogin on the account host (appUrl). Returns the `userData` session
  // token. This is the ONLY place helium authenticates — used by the `login`
  // command to mint a token, never during polling.
  async login(email: string, password: string, proxy?: string): Promise<LoginData> {
    return this.#send<LoginData>(
      `${this.#appUrl}/v1/account/EmailLogin`,
      this.#baseHeaders(),
      { email, password },
      proxy,
    );
  }

  // ISO date the mobile API expects for OnwardDate/DepartDate. Use UTC so a
  // midnight `Date` doesn't get shifted into the previous/next day.
  #isoDate(date: Date): string {
    return moment.utc(date).format('YYYY-MM-DDTHH:mm:ss');
  }

  async stations(userData: string, proxy?: string, spoofIp = false): Promise<StationMap> {
    const d = await this.#post<StationsData>('/v1/shuttletrip/Station', userData, {}, proxy, spoofIp);
    return new Map(d.stations.map(s => [s.id, s.stationData]));
  }

  async search(
    userData: string,
    from: From,
    date: Date,
    stations: StationMap,
    proxy?: string,
    spoofIp = false,
  ): Promise<string> {
    const [fromId, toId] =
      from === 'JToW' ? [JB_STATION_ID, WOODLANDS_STATION_ID] : [WOODLANDS_STATION_ID, JB_STATION_ID];

    const fromStationData = stations.get(fromId);
    const toStationData = stations.get(toId);
    if (fromStationData == null || toStationData == null)
      throw new Error(`Unable to find station data for direction ${from}`);

    // NB: no ReturnDate — the mobile API rejects an empty string for that
    // nullable DateTime ("could not be converted to System.Nullable[DateTime]").
    // tin's SearchReq omits it entirely, so we do too.
    const body = {
      FromStationData: fromStationData,
      FromStationId: fromId,
      ToStationData: toStationData,
      ToStationId: toId,
      OnwardDate: this.#isoDate(date),
      PassengerCount: 1,
    };

    const res = await this.#post<SearchData>('/v1/shuttletrip/Search', userData, body, proxy, spoofIp);
    return res.searchData;
  }

  async trip(
    userData: string,
    date: Date,
    searchData: string,
    proxy?: string,
    spoofIp = false,
  ): Promise<TrainSchedule[]> {
    const body = {
      BookingTripSequenceNo: 1,
      DepartDate: this.#isoDate(date),
      searchData,
    };

    const res = await this.#post<TripData>('/v1/shuttletrip/Trip', userData, body, proxy, spoofIp);
    return res.trips.map(t => this.#toSchedule(t));
  }

  // Map a mobile trip into helium's existing TrainSchedule shape so downstream
  // code (watcher/redis consumers) is identical to the web path.
  #toSchedule(t: Trip): TrainSchedule {
    return {
      train_service: t.trainNo,
      departure_time: moment.utc(t.departDateTime).format('HH:mm'),
      arrival_time: moment.utc(t.arrivalDateTime).format('HH:mm'),
      available_seats: typeof t.seat === 'number' ? t.seat : Number.parseInt(t.seat, 10),
      min_fare: `${t.currency} ${t.price}`,
    };
  }
}

export { type StationMap, type LoginData, MobileSearchCore };
