import { SearcherBuilder } from '../domain/searcher/builder.ts';

class Get {
  constructor(private readonly builder: SearcherBuilder) {}

  async Get(d: Date, f: 'JToW' | 'WToJ'): Promise<[string, number][]> {
    const a = await this.builder.BuildFixed(f, d);
    const sch = await a.Search();
    return sch.map(s => [s.departure_time, s.available_seats]);
  }
}

export { Get };
