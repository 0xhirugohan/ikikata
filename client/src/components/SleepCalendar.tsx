import { useState } from 'react';
import type { SleepEntry } from '../types/sleep';

interface SleepCalendarProps {
  entries: SleepEntry[];
  onEditEntry: (entry: SleepEntry) => void;
  onDeleteEntry: (id: string) => void;
  isDarkMode: boolean;
}

const qualityToColor = {
  good: 'bg-green-500',
  fair: 'bg-yellow-400',
  poor: 'bg-red-500'
};


export default function SleepCalendar({ entries, onEditEntry, onDeleteEntry, isDarkMode }: SleepCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEntry, setSelectedEntry] = useState<SleepEntry | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add days from previous month
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isPrevMonth: true,
        date: new Date(year, month - 1, daysInPrevMonth - i)
      });
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        isPrevMonth: false,
        date: new Date(year, month, day)
      });
    }
    
    // Add days from next month to fill the grid (42 total cells = 6 rows × 7 days)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isPrevMonth: false,
        date: new Date(year, month + 1, day)
      });
    }
    
    return days;
  };

  const getEntryForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    return entries.find(entry => entry.date === dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">{monthName}</h3>
          <button
            type="button"
            onClick={goToToday}
            className={`text-sm px-3 py-1 rounded transition-colors ${
              isDarkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            Today
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => navigateMonth('prev')}
            className={`p-2 rounded transition-colors ${
              isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => navigateMonth('next')}
            className={`p-2 rounded transition-colors ${
              isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`rounded-lg border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
        {/* Days of week header */}
        <div className={`grid grid-cols-7 border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className={`p-3 text-center text-sm font-medium ${
                isDarkMode ? 'text-slate-400 bg-slate-800' : 'text-gray-600 bg-gray-50'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((dayObj, index) => {
            const entry = getEntryForDate(dayObj.date);
            const today = new Date();
            const isToday = today.getFullYear() === dayObj.date.getFullYear() &&
                           today.getMonth() === dayObj.date.getMonth() &&
                           today.getDate() === dayObj.date.getDate();

            return (
              <button
                type="button"
                key={`${dayObj.date.getTime()}-${index}`}
                onClick={() => entry && setSelectedEntry(entry)}
                className={`h-16 p-2 border-r border-b transition-all ${
                  isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'
                } ${entry ? 'cursor-pointer' : 'cursor-default'} relative flex flex-col items-center justify-center`}
              >
                <span className={`text-sm font-medium ${
                  isToday 
                    ? isDarkMode ? 'text-purple-400' : 'text-orange-600'
                    : dayObj.isCurrentMonth
                      ? isDarkMode ? 'text-slate-300' : 'text-gray-700'
                      : isDarkMode ? 'text-slate-500' : 'text-gray-400'
                }`}>
                  {dayObj.day}
                </span>
                
                {entry && (
                  <div className="mt-1 flex space-x-1">
                    <div className={`w-2 h-2 rounded-full ${qualityToColor[entry.sleepQuality]}`}></div>
                  </div>
                )}
                
                {isToday && (
                  <div className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    isDarkMode ? 'bg-purple-400' : 'bg-orange-600'
                  }`}></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
        <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
          Sleep Quality Legend
        </h4>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(qualityToColor).map(([quality, color]) => (
            <div key={quality} className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded-full ${color}`}></div>
              <span className={`capitalize ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {quality}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Entry Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto ${
            isDarkMode ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">
                {new Date(selectedEntry.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className={`text-xl ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Sleep Quality:</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${qualityToColor[selectedEntry.sleepQuality]}`}></div>
                    <span className="capitalize font-medium">{selectedEntry.sleepQuality}</span>
                  </div>
                </div>
                <div>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Morning Energy:</span>
                  <div className="capitalize font-medium">{selectedEntry.morningEnergy}</div>
                </div>
                <div>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Sleep Onset:</span>
                  <div className="font-medium">{selectedEntry.timeToFallAsleep.replace('-', ' ')}</div>
                </div>
                <div>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Afternoon Energy:</span>
                  <div className="capitalize font-medium">{selectedEntry.afternoonEnergy}</div>
                </div>
              </div>

              {selectedEntry.notes && (
                <div>
                  <span className={`block text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Notes:</span>
                  <p className="text-sm mt-1">{selectedEntry.notes}</p>
                </div>
              )}

              {(selectedEntry.stressLevel || selectedEntry.screenTime || selectedEntry.roomTemp) && (
                <div className="border-t pt-3">
                  <span className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Additional Data:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedEntry.stressLevel && (
                      <div>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Stress Level:</span>
                        <div>{selectedEntry.stressLevel}/10</div>
                      </div>
                    )}
                    {selectedEntry.screenTime && (
                      <div>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Screen Time:</span>
                        <div>{selectedEntry.screenTime}h</div>
                      </div>
                    )}
                    {selectedEntry.roomTemp && (
                      <div>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Room Temp:</span>
                        <div>{selectedEntry.roomTemp}°F</div>
                      </div>
                    )}
                    {selectedEntry.caffeineTime && (
                      <div>
                        <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Last Caffeine:</span>
                        <div>{selectedEntry.caffeineTime}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  onEditEntry(selectedEntry);
                  setSelectedEntry(null);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(selectedEntry.id);
                  setSelectedEntry(null);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}