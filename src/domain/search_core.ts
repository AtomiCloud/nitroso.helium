import * as cheerio from 'cheerio';
import fetchCookie from 'fetch-cookie';
import moment from 'moment';
import type { Logger } from 'pino';
import { stringify } from 'node:querystring';
import type { SearcherConfig } from '../config/searcher.config.ts';
import type { From, TrainSchedule } from './interface.ts';

const f = fetchCookie(fetch);

const htmlHeaders = {
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'content-type': 'application/x-www-form-urlencoded',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
};

const jsonHeaders = {
  accept: 'application/json, text/javascript, */*; q=0.01',
  'content-type': 'application/json',
  'x-requested-with': 'XMLHttpRequest',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
};

const defaultHeaders = {
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',

  pragma: 'no-cache',
  'sec-ch-ua': '"Chromium";v="119", "Not?A_Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',

  'sec-fetch-site': 'same-origin',

  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const JB_STATION_ID = 'JB SENTRAL';
const WOODLANDS_STATION_ID = 'WOODLANDS CIQ';

interface MainPageToken {
  JBToken: string;
  WoodlandsToken: string;
  requestVerificationToken: string;
}

interface ProxyToken {
  searchData: string;
  formValidationCode: string;
}

interface TrainScheduleResp {
  status: boolean;
  messages: [];
  messageCode: string | null;
  data: string;
}

class SearchCore {
  #config: SearcherConfig;
  #logger: Logger;

  constructor(config: SearcherConfig, logger: Logger) {
    this.#config = config;
    this.#logger = logger;
  }

  get proxy(): string | undefined {
    const p = this.#config.proxy;
    if (p == null) return undefined;
    const arr = p.split(';');
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }

  async mainKTMBPage(proxy?: string): Promise<MainPageToken> {
    const referer = 'https://online.ktmb.com.my/';
    const init = {
      headers: {
        ...defaultHeaders,
        ...htmlHeaders,
        Referer: referer,
      },
      proxy: proxy || this.proxy,
      method: 'GET',
    };
    const resp = await f('https://shuttleonline.ktmb.com.my/Home/Shuttle', init);
    const text = await resp.text();

    const $ = cheerio.load(text);

    const from = $('#FromStationData').attr('value');
    const to = $('#ToStationData').attr('value');
    const token = $('input[name=__RequestVerificationToken]').attr('value');

    if (from == null || to == null || token == null) throw new Error('Unable to find from or to station');

    return {
      JBToken: from,
      WoodlandsToken: to,
      requestVerificationToken: token,
    };
  }

  async proxyKTMBPost(
    from: From,
    date: Date,
    jbToken: string,
    woodlandToken: string,
    requestVerificationToken: string,
    proxy?: string,
  ): Promise<ProxyToken> {
    const d = moment(date).format('D MMM YYYY');

    const referer = 'https://shuttleonline.ktmb.com.my/Home/Shuttle';

    const [FromStationData, ToStationData, FromStationId, ToStationId] =
      from === 'JToW'
        ? [jbToken, woodlandToken, JB_STATION_ID, WOODLANDS_STATION_ID]
        : [woodlandToken, jbToken, WOODLANDS_STATION_ID, JB_STATION_ID];

    const queryParams = {
      FromStationData,
      ToStationData,
      FromStationId,
      ToStationId,
      OnwardDate: d,
      ReturnDate: '',
      PassengerCount: 1,
      __RequestVerificationToken: requestVerificationToken,
    };

    const init = {
      headers: {
        ...htmlHeaders,
        ...defaultHeaders,
        Referer: referer,
      },
      proxy: proxy || this.proxy,
      body: stringify(queryParams),
      method: 'POST',
    };

    const resp = await f('https://shuttleonline.ktmb.com.my/ShuttleTrip', init);

    const t = await resp.text();
    const $ = cheerio.load(t);

    const searchData = $('#SearchData').attr('value');
    const formValidationCode = $('#FormValidationCode').attr('value');
    if (searchData == null || formValidationCode == null)
      throw new Error('Unable to find search data or form validation code');
    return {
      searchData,
      formValidationCode,
    };
  }

  async getData(
    token: string,
    searchData: string,
    formValidation: string,
    date: Date,
    proxy?: string,
  ): Promise<TrainSchedule[]> {
    const DepartDate = moment(date).format('YYYY-MM-DD');

    const referer = 'https://shuttleonline.ktmb.com.my/ShuttleTrip';

    const init = {
      headers: {
        ...jsonHeaders,
        ...defaultHeaders,
        RequestVerificationToken: token,
        Referer: referer,
      },
      proxy: proxy || this.proxy,
      body: JSON.stringify({
        SearchData: searchData,
        FormValidationCode: formValidation,
        DepartDate,
        IsReturn: false,
        BookingTripSequenceNo: 1,
      }),
      method: 'POST',
    };

    const r = await f('https://shuttleonline.ktmb.com.my/ShuttleTrip/Trip', init);

    let o: TrainScheduleResp | null = null;
    const text = await r.text();

    try {
      o = JSON.parse(text);
    } catch (e) {
      this.#logger.info({ text }, 'Error parsing response from KTMB');
      this.#logger.error(e, 'Error parsing response from KTMB');
      throw e;
    }

    const obj = o as TrainScheduleResp;

    const $ = cheerio.load(obj.data);

    const headerMappings: {
      [key: number]: 'train_service' | 'departure_time' | 'arrival_time' | 'available_seats' | 'min_fare';
    } = {};
    $('.thead-train th').each((index, element) => {
      const headerText = $(element).text().trim();
      switch (headerText) {
        case 'Train service':
          headerMappings[index] = 'train_service';
          break;
        case 'Departure':
          headerMappings[index] = 'departure_time';
          break;
        case 'Arrival':
          headerMappings[index] = 'arrival_time';
          break;
        case 'Available seats':
          headerMappings[index] = 'available_seats';
          break;
        case 'Min. fare':
          headerMappings[index] = 'min_fare';
          break;
      }
    });

    const elements = $('.depart-trips tr');

    if (elements.length === 1) return [];

    const trainSchedules: TrainSchedule[] = elements
      .map((index, element) => {
        const rowData: Partial<{
          train_service: string;
          departure_time: string;
          arrival_time: string;
          available_seats: string;
          min_fare: string;
        }> = {};

        $(element)
          .find('td')
          .each((i, el) => {
            const key = headerMappings[i];
            if (key) {
              rowData[key] = $(el).text().trim();
            }
          });
        if (
          rowData.min_fare == null ||
          rowData.available_seats == null ||
          rowData.arrival_time == null ||
          rowData.departure_time == null ||
          rowData.train_service == null
        )
          throw new Error('Unable to find min_fare, available_seats, arrival_time, departure_time, train_service');

        return {
          train_service: rowData.train_service,
          departure_time: rowData.departure_time,
          arrival_time: rowData.arrival_time,
          available_seats: Number.parseInt(rowData.available_seats, 10),
          min_fare: rowData.min_fare,
        } satisfies TrainSchedule;
      })
      .get();

    return trainSchedules;
  }
}

export { type MainPageToken, type ProxyToken, SearchCore };
