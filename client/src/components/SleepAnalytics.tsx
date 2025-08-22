import { useState } from 'react';
import { SleepEntry, SleepAnalytics as SleepAnalyticsType } from '../types/sleep';
import SleepHistory from './SleepHistory';

interface Props {
  entries: SleepEntry[];
  isDarkMode: boolean;
  onEditEntry: (entry: SleepEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const qualityToNumber = {
  good: 3,
  fair: 2,
  poor: 1
};

const energyToNumber = {
  energized: 4,
  alert: 3,
  tired: 2,
  exhausted: 1
};

const sleepOnsetToNumber = {
  'under-10': 5,
  '10-20': 4,
  '20-30': 3,
  '30-60': 2,
  'over-60': 1
};

export default function SleepAnalytics({ entries, isDarkMode, onEditEntry, onDeleteEntry }: Props) {
  const [viewMode, setViewMode] = useState<'analytics' | 'history'>('analytics');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const metricExplanations = {
    sleepQuality: {
      title: "Sleep Quality",
      description: "Your overall sleep satisfaction based on how well you slept and how you felt upon waking.",
      scoring: [
        { value: "3/3", label: "Good", description: "Slept well, feel refreshed and ready for the day" },
        { value: "2/3", label: "Fair", description: "Okay sleep, feel somewhat rested but could be better" },
        { value: "1/3", label: "Poor", description: "Got some sleep but woke up tired and unrested" }
      ],
      interpretation: "Higher scores indicate better overall sleep satisfaction and recovery."
    },
    morningEnergy: {
      title: "Morning Energy",
      description: "How energized and alert you feel when you wake up in the morning.",
      scoring: [
        { value: "4/4", label: "Energized", description: "Feel great and motivated" },
        { value: "3/4", label: "Alert", description: "Feel awake and ready" },
        { value: "2/4", label: "Tired", description: "Groggy but can get moving" },
        { value: "1/4", label: "Exhausted", description: "Can barely function" }
      ],
      interpretation: "This reflects how well your sleep restored your energy levels."
    },
    sleepOnset: {
      title: "Sleep Onset",
      description: "How quickly you fall asleep after getting into bed, which indicates sleep readiness.",
      scoring: [
        { value: "5/5", label: "Under 10 min", description: "Fell asleep very quickly - excellent sleep readiness" },
        { value: "4/5", label: "10-20 min", description: "Normal, healthy sleep onset time" },
        { value: "3/5", label: "20-30 min", description: "Took a while but still acceptable" },
        { value: "2/5", label: "30-60 min", description: "Too long - may indicate stress or poor sleep hygiene" },
        { value: "1/5", label: "Over 60 min", description: "Significant sleep problem - consider lifestyle changes" }
      ],
      interpretation: "Faster sleep onset generally indicates better sleep health and routine."
    },
    streak: {
      title: "Tracking Streak",
      description: "How many consecutive days you've been tracking your sleep data.",
      scoring: [
        { value: "Consistent tracking helps you:", label: "", description: "• Identify patterns in your sleep quality" },
        { value: "", label: "", description: "• Understand what affects your sleep" },
        { value: "", label: "", description: "• Make informed improvements to your routine" },
        { value: "", label: "", description: "• Track progress over time" }
      ],
      interpretation: "Longer streaks provide more reliable data for understanding your sleep patterns."
    }
  };

  const calculateAnalytics = (): SleepAnalyticsType => {
    if (entries.length === 0) {
      return {
        averageSleepQuality: 0,
        averageMorningEnergy: 0,
        averageAfternoonEnergy: 0,
        sleepOnsetTrend: 0,
        totalEntries: 0,
        streakDays: 0,
        recommendations: []
      };
    }

    const recent14Days = entries.slice(0, 14);
    
    const avgSleepQuality = recent14Days.reduce((sum, entry) => 
      sum + qualityToNumber[entry.sleepQuality], 0) / recent14Days.length;
    
    const avgMorningEnergy = recent14Days.reduce((sum, entry) => 
      sum + energyToNumber[entry.morningEnergy], 0) / recent14Days.length;
    
    const avgAfternoonEnergy = recent14Days.reduce((sum, entry) => 
      sum + energyToNumber[entry.afternoonEnergy], 0) / recent14Days.length;
    
    const avgSleepOnset = recent14Days.reduce((sum, entry) => 
      sum + sleepOnsetToNumber[entry.timeToFallAsleep], 0) / recent14Days.length;

    const streak = calculateStreak(entries);
    const recommendations = generateRecommendations(recent14Days, avgSleepQuality, avgMorningEnergy, avgSleepOnset);

    return {
      averageSleepQuality: avgSleepQuality,
      averageMorningEnergy: avgMorningEnergy,
      averageAfternoonEnergy: avgAfternoonEnergy,
      sleepOnsetTrend: avgSleepOnset,
      totalEntries: entries.length,
      streakDays: streak,
      recommendations
    };
  };

  const calculateStreak = (entries: SleepEntry[]): number => {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < entries.length; i++) {
      const entryDate = new Date(entries[i].date);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const generateRecommendations = (entries: SleepEntry[], avgQuality: number, avgMorningEnergy: number, avgOnset: number): string[] => {
    const recommendations: string[] = [];

    if (avgQuality < 3) {
      recommendations.push("Your sleep quality is below average. Consider tracking stress levels and room environment.");
    }
    
    if (avgMorningEnergy < 2.5) {
      recommendations.push("Low morning energy suggests poor sleep recovery. Check your sleep duration and consistency.");
    }
    
    if (avgOnset < 3) {
      recommendations.push("You're taking too long to fall asleep. Track pre-bedtime activities and consider a wind-down routine.");
    }

    const poorSleepEntries = entries.filter(e => 
      qualityToNumber[e.sleepQuality] <= 2 || energyToNumber[e.morningEnergy] <= 2
    );
    
    if (poorSleepEntries.length > 0) {
      const commonFactors = analyzePoorSleepFactors(poorSleepEntries);
      recommendations.push(...commonFactors);
    }

    if (recommendations.length === 0) {
      recommendations.push("Great job! Your sleep patterns look healthy. Keep maintaining your current routine.");
    }

    return recommendations;
  };

  const analyzePoorSleepFactors = (poorEntries: SleepEntry[]): string[] => {
    const factors: string[] = [];
    
    const highStressCount = poorEntries.filter(e => e.stressLevel && e.stressLevel > 7).length;
    if (highStressCount > poorEntries.length * 0.5) {
      factors.push("High stress levels correlate with poor sleep. Consider relaxation techniques before bed.");
    }

    const lateScreenTime = poorEntries.filter(e => e.screenTime && e.screenTime > 1).length;
    if (lateScreenTime > poorEntries.length * 0.5) {
      factors.push("Screen time within 2 hours of bed may be affecting your sleep. Try blue light filters or earlier cutoff times.");
    }

    const lateCaffeine = poorEntries.filter(e => {
      if (!e.caffeineTime) return false;
      const [hours] = e.caffeineTime.split(':').map(Number);
      return hours >= 14; // 2 PM or later
    }).length;
    
    if (lateCaffeine > poorEntries.length * 0.3) {
      factors.push("Caffeine after 2 PM may be impacting your sleep quality. Consider earlier cutoff times.");
    }

    return factors;
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = score / max;
    if (percentage >= 0.8) {
      return isDarkMode ? 'text-green-400' : 'text-green-600';
    } else if (percentage >= 0.6) {
      return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
    } else {
      return isDarkMode ? 'text-red-400' : 'text-red-600';
    }
  };

  const analytics = calculateAnalytics();

  if (entries.length === 0) {
    return (
      <div className="p-6 space-y-6">
        {/* Header with Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Analytics & History</h2>
          <div className={`flex rounded-lg border ${
            isDarkMode ? 'border-slate-600' : 'border-gray-300'
          }`}>
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex-1 px-4 py-2 text-sm rounded-l-lg transition-colors ${
                viewMode === 'analytics'
                  ? isDarkMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-orange-500 text-white'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📊 Analytics
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex-1 px-4 py-2 text-sm rounded-r-lg transition-colors ${
                viewMode === 'history'
                  ? isDarkMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-orange-500 text-white'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📋 History
            </button>
          </div>
        </div>

        <div className="p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-600'}>
            Start tracking your sleep to see patterns and insights here.
          </p>
        </div>
      </div>
    );
  }

  const recentEntries = entries.slice(0, 14);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Toggle */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h2 className="text-2xl font-bold">Analytics & History</h2>
        <div className={`flex rounded-lg border ${
          isDarkMode ? 'border-slate-600' : 'border-gray-300'
        }`}>
          <button
            onClick={() => setViewMode('analytics')}
            className={`flex-1 px-4 py-2 text-sm rounded-l-lg transition-colors ${
              viewMode === 'analytics'
                ? isDarkMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-orange-500 text-white'
                : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex-1 px-4 py-2 text-sm rounded-r-lg transition-colors ${
              viewMode === 'history'
                ? isDarkMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-orange-500 text-white'
                : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📋 History
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'history' ? (
        <SleepHistory
          entries={entries}
          onEditEntry={onEditEntry}
          onDeleteEntry={onDeleteEntry}
          isDarkMode={isDarkMode}
        />
      ) : (
        <div className="space-y-8">
          <div>
            <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'} mb-6`}>
              Analysis based on your last {recentEntries.length} entries
            </p>
          </div>

      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={() => setSelectedMetric('sleepQuality')}
          className={`p-4 rounded-lg text-left transition-all hover:scale-105 hover:shadow-md ${
            isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <h4 className={`font-medium mb-2 h-10 flex items-start ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            Sleep Quality
          </h4>
          <div className={`text-2xl font-bold ${getScoreColor(analytics.averageSleepQuality, 3)}`}>
            {analytics.averageSleepQuality.toFixed(1)}/3
          </div>
        </button>

        <button
          onClick={() => setSelectedMetric('morningEnergy')}
          className={`p-4 rounded-lg text-left transition-all hover:scale-105 hover:shadow-md ${
            isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <h4 className={`font-medium mb-2 h-10 flex items-start ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            Morning Energy
          </h4>
          <div className={`text-2xl font-bold ${getScoreColor(analytics.averageMorningEnergy, 4)}`}>
            {analytics.averageMorningEnergy.toFixed(1)}/4
          </div>
        </button>

        <button
          onClick={() => setSelectedMetric('sleepOnset')}
          className={`p-4 rounded-lg text-left transition-all hover:scale-105 hover:shadow-md ${
            isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <h4 className={`font-medium mb-2 h-10 flex items-start ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            Sleep Onset
          </h4>
          <div className={`text-2xl font-bold ${getScoreColor(analytics.sleepOnsetTrend, 5)}`}>
            {analytics.sleepOnsetTrend.toFixed(1)}/5
          </div>
        </button>

        <button
          onClick={() => setSelectedMetric('streak')}
          className={`p-4 rounded-lg text-left transition-all hover:scale-105 hover:shadow-md ${
            isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <h4 className={`font-medium mb-2 h-10 flex items-start ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            Tracking Streak
          </h4>
          <div className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-orange-600'}`}>
            {analytics.streakDays} days
          </div>
        </button>
      </div>

      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-purple-300' : 'text-orange-600'}`}>
          📈 Trends & Patterns
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Sleep Quality Trend (Last 7 Days)</h4>
            <div className="flex space-x-1">
              {recentEntries.slice(0, 7).reverse().map((entry, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-16 rounded-sm ${
                      qualityToNumber[entry.sleepQuality] >= 3 
                        ? 'bg-green-500' 
                        : qualityToNumber[entry.sleepQuality] >= 2 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ 
                      height: `${(qualityToNumber[entry.sleepQuality] / 3) * 64}px` 
                    }}
                  />
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Energy Levels Comparison</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Morning Energy</span>
                <div className={`h-4 bg-gray-200 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-600' : ''}`}>
                  <div 
                    className={`h-full ${isDarkMode ? 'bg-purple-500' : 'bg-orange-500'}`}
                    style={{ width: `${(analytics.averageMorningEnergy / 4) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Afternoon Energy</span>
                <div className={`h-4 bg-gray-200 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-600' : ''}`}>
                  <div 
                    className={`h-full ${isDarkMode ? 'bg-purple-500' : 'bg-orange-500'}`}
                    style={{ width: `${(analytics.averageAfternoonEnergy / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-purple-300' : 'text-orange-600'}`}>
          💡 Recommendations
        </h3>
        <ul className="space-y-3">
          {analytics.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start space-x-3">
              <span className={`text-sm ${isDarkMode ? 'text-purple-400' : 'text-orange-500'}`}>•</span>
              <span className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-purple-300' : 'text-orange-600'}`}>
          🗓 Weekly Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                <th className={`text-left py-2 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Date
                </th>
                <th className={`text-center py-2 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Sleep
                </th>
                <th className={`text-center py-2 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Energy
                </th>
                <th className={`text-center py-2 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Onset
                </th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.slice(0, 7).map((entry, index) => (
                <tr key={entry.id} className={`border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                  <td className="py-3">
                    <div>
                      <div className="font-medium text-sm">
                        {new Date(entry.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-medium ${
                      qualityToNumber[entry.sleepQuality] >= 3 
                        ? isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                        : qualityToNumber[entry.sleepQuality] >= 2 
                        ? isDarkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                        : isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.sleepQuality.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-medium ${
                      energyToNumber[entry.morningEnergy] >= 3 
                        ? isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                        : energyToNumber[entry.morningEnergy] >= 2 
                        ? isDarkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                        : isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.morningEnergy.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                      {entry.timeToFallAsleep.includes('-') 
                        ? entry.timeToFallAsleep.split('-')[0] + 'm'
                        : entry.timeToFallAsleep.includes('under') 
                        ? '<10m'
                        : '60m+'
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {/* Metric Explanation Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 max-w-lg w-full max-h-96 overflow-y-auto ${
            isDarkMode ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">
                {metricExplanations[selectedMetric as keyof typeof metricExplanations]?.title}
              </h3>
              <button
                onClick={() => setSelectedMetric(null)}
                className={`text-xl ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>
                {metricExplanations[selectedMetric as keyof typeof metricExplanations]?.description}
              </p>

              <div>
                <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                  Scoring System:
                </h4>
                <div className="space-y-2">
                  {metricExplanations[selectedMetric as keyof typeof metricExplanations]?.scoring.map((item, index) => (
                    <div key={index} className={`p-3 rounded border ${
                      isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        {item.value && (
                          <span className={`font-medium px-2 py-1 rounded text-sm ${
                            isDarkMode ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {item.value}
                          </span>
                        )}
                        <div className="flex-1">
                          {item.label && (
                            <div className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                              {item.label}
                            </div>
                          )}
                          <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`p-3 rounded ${
                isDarkMode ? 'bg-purple-900/20 border border-purple-700' : 'bg-orange-50 border border-orange-200'
              }`}>
                <p className={`text-sm ${isDarkMode ? 'text-purple-300' : 'text-orange-700'}`}>
                  💡 {metricExplanations[selectedMetric as keyof typeof metricExplanations]?.interpretation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}