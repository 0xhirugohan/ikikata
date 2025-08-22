export type SleepQuality = 'good' | 'fair' | 'poor';
export type EnergyLevel = 'energized' | 'alert' | 'tired' | 'exhausted';
export type SleepOnsetTime = 'under-10' | '10-20' | '20-30' | '30-60' | 'over-60';

export interface SleepEntry {
  id: string;
  date: string;
  sleepQuality: SleepQuality;
  morningEnergy: EnergyLevel;
  timeToFallAsleep: SleepOnsetTime;
  afternoonEnergy: EnergyLevel;
  notes: string;
  stressLevel?: number;
  screenTime?: number;
  roomTemp?: number;
  caffeineTime?: string;
  exerciseTime?: string;
  preBedtimeActivities?: string;
  anxietyLevel?: number;
}

export interface SleepAnalytics {
  averageSleepQuality: number;
  averageMorningEnergy: number;
  averageAfternoonEnergy: number;
  sleepOnsetTrend: number;
  totalEntries: number;
  streakDays: number;
  recommendations: string[];
}