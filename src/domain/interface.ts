interface TrainSchedule {
  train_service: string;
  departure_time: string;
  arrival_time: string;
  available_seats: number;
  min_fare: string;
}

type From = 'JToW' | 'WToJ';

interface IScheduleSearcher {
  Search(from: From, date: Date): Promise<TrainSchedule[]>;
}

interface IFixedScheduleSearcher {
  Search(): Promise<TrainSchedule[]>;
}

type SearcherMode = 'web' | 'mobile';

type PollType = 'stateless' | 'held';

// One row of the deterministic poller table: a single stream's behaviour.
// Direction and date are shared by the whole run, so they are not part of a stream.
interface StreamSpec {
  // Transport: scrape the website ('web') or hit the mobile JSON API ('mobile').
  mode: SearcherMode;
  // Caching strategy: re-establish every poll ('stateless') or cache the
  // expensive token and only poll the cheap endpoint ('held').
  type: PollType;
  // Proxy control: a URL string = use that proxy; `true` = use the config proxy
  // pool (random pick); omit/`false` = direct connection (no proxy).
  proxy?: string | boolean;
  // Delay between polls, in milliseconds (the per-stream polling speed).
  delay: number;
  // KTMB `userData` token. Required for mobile streams, ignored for web.
  token?: string;
  // Send a fresh random X-Real-IP per request to rotate the rate-limit bucket
  // (KTMB keys its limiter on that header). Default off.
  spoofIp?: boolean;
}

export type { TrainSchedule, IScheduleSearcher, IFixedScheduleSearcher, From, SearcherMode, PollType, StreamSpec };
