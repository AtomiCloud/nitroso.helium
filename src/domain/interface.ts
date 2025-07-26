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

export type { TrainSchedule, IScheduleSearcher, IFixedScheduleSearcher, From };
