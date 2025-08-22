import { SleepEntry } from '../types/sleep';
import SleepCalendar from './SleepCalendar';

interface SleepHistoryProps {
  entries: SleepEntry[];
  onEditEntry: (entry: SleepEntry) => void;
  onDeleteEntry: (id: string) => void;
  isDarkMode: boolean;
}

export default function SleepHistory({ entries, onEditEntry, onDeleteEntry, isDarkMode }: SleepHistoryProps) {


  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">😴</div>
        <h3 className="text-lg font-semibold mb-2">No Sleep History Yet</h3>
        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-600'}>
          Start tracking your sleep to see your history here.
        </p>
      </div>
    );
  }

  return (
    <SleepCalendar
      entries={entries}
      onEditEntry={onEditEntry}
      onDeleteEntry={onDeleteEntry}
      isDarkMode={isDarkMode}
    />
  );
}