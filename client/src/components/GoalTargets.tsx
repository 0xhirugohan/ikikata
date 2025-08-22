import { SleepEntry } from '../types/sleep';

interface Props {
  entries: SleepEntry[];
  isDarkMode: boolean;
}

const goals = {
  sleepQuality: { target: 'good-excellent', description: '"Good" or "Excellent" most nights' },
  morningEnergy: { target: 'alert-energized', description: '"Alert" or "Energized" most mornings' },
  sleepOnset: { target: 'under-20', description: 'Under 20 minutes consistently' },
  afternoonEnergy: { target: 'alert-energized', description: '"Alert" or "Energized" (minimal crash)' }
};

export default function GoalTargets({ entries, isDarkMode }: Props) {
  const calculateGoalProgress = () => {
    if (entries.length === 0) {
      return {
        sleepQuality: 0,
        morningEnergy: 0,
        sleepOnset: 0,
        afternoonEnergy: 0
      };
    }

    const recentEntries = entries.slice(0, 21); // Last 3 weeks

    const sleepQualityGoal = recentEntries.filter(entry => 
      entry.sleepQuality === 'good' || entry.sleepQuality === 'excellent'
    ).length / recentEntries.length * 100;

    const morningEnergyGoal = recentEntries.filter(entry => 
      entry.morningEnergy === 'alert' || entry.morningEnergy === 'energized'
    ).length / recentEntries.length * 100;

    const sleepOnsetGoal = recentEntries.filter(entry => 
      entry.timeToFallAsleep === 'under-10' || entry.timeToFallAsleep === '10-20'
    ).length / recentEntries.length * 100;

    const afternoonEnergyGoal = recentEntries.filter(entry => 
      entry.afternoonEnergy === 'alert' || entry.afternoonEnergy === 'energized'
    ).length / recentEntries.length * 100;

    return {
      sleepQuality: sleepQualityGoal,
      morningEnergy: morningEnergyGoal,
      sleepOnset: sleepOnsetGoal,
      afternoonEnergy: afternoonEnergyGoal
    };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return isDarkMode ? 'bg-green-500' : 'bg-green-600';
    if (percentage >= 60) return isDarkMode ? 'bg-yellow-500' : 'bg-yellow-600';
    return isDarkMode ? 'bg-red-500' : 'bg-red-600';
  };

  const getProgressStatus = (percentage: number) => {
    if (percentage >= 80) return '🎯 Excellent';
    if (percentage >= 60) return '⚡ Good';
    if (percentage >= 40) return '⚠️ Needs Work';
    return '🔴 Priority';
  };

  const progress = calculateGoalProgress();
  const overallScore = (progress.sleepQuality + progress.morningEnergy + progress.sleepOnset + progress.afternoonEnergy) / 4;

  const getRecommendationsForGoals = () => {
    const recommendations: string[] = [];
    
    if (progress.sleepQuality < 60) {
      recommendations.push("Focus on improving sleep quality by optimizing your sleep environment (temperature, darkness, noise)");
    }
    
    if (progress.morningEnergy < 60) {
      recommendations.push("Low morning energy may indicate insufficient sleep duration or poor sleep quality");
    }
    
    if (progress.sleepOnset < 60) {
      recommendations.push("Taking too long to fall asleep? Try establishing a consistent pre-bedtime routine");
    }
    
    if (progress.afternoonEnergy < 60) {
      recommendations.push("Afternoon energy crashes might be related to sleep debt or inconsistent sleep schedule");
    }

    if (recommendations.length === 0) {
      recommendations.push("Congratulations! You're meeting most of your sleep health goals. Keep up the great work!");
    }

    return recommendations;
  };

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-semibold mb-2">Goal Tracking</h3>
        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-600'}>
          Start tracking your sleep to see your progress toward healthy sleep goals.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Sleep Health Goals</h2>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'} mb-6`}>
          Track your progress toward healthy sleep indicators based on {Math.min(entries.length, 21)} recent entries
        </p>
      </div>

      <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
        <h3 className="text-lg font-semibold mb-2">Overall Sleep Health Score</h3>
        <div className={`text-4xl font-bold mb-2 ${
          overallScore >= 80 
            ? 'text-green-500' 
            : overallScore >= 60 
            ? 'text-yellow-500' 
            : 'text-red-500'
        }`}>
          {overallScore.toFixed(0)}%
        </div>
        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-600'}>
          {getProgressStatus(overallScore).split(' ')[1]}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Sleep Quality</h4>
            <span className={`text-sm px-2 py-1 rounded ${
              progress.sleepQuality >= 80 
                ? 'bg-green-100 text-green-800' 
                : progress.sleepQuality >= 60 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
            } ${isDarkMode ? 'bg-opacity-20 text-opacity-90' : ''}`}>
              {progress.sleepQuality.toFixed(0)}%
            </span>
          </div>
          <div className={`h-4 bg-gray-200 rounded-full overflow-hidden mb-3 ${isDarkMode ? 'bg-gray-600' : ''}`}>
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor(progress.sleepQuality)}`}
              style={{ width: `${progress.sleepQuality}%` }}
            />
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Goal: {goals.sleepQuality.description}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {getProgressStatus(progress.sleepQuality)}
          </p>
        </div>

        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Morning Energy</h4>
            <span className={`text-sm px-2 py-1 rounded ${
              progress.morningEnergy >= 80 
                ? 'bg-green-100 text-green-800' 
                : progress.morningEnergy >= 60 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
            } ${isDarkMode ? 'bg-opacity-20 text-opacity-90' : ''}`}>
              {progress.morningEnergy.toFixed(0)}%
            </span>
          </div>
          <div className={`h-4 bg-gray-200 rounded-full overflow-hidden mb-3 ${isDarkMode ? 'bg-gray-600' : ''}`}>
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor(progress.morningEnergy)}`}
              style={{ width: `${progress.morningEnergy}%` }}
            />
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Goal: {goals.morningEnergy.description}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {getProgressStatus(progress.morningEnergy)}
          </p>
        </div>

        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Sleep Onset Time</h4>
            <span className={`text-sm px-2 py-1 rounded ${
              progress.sleepOnset >= 80 
                ? 'bg-green-100 text-green-800' 
                : progress.sleepOnset >= 60 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
            } ${isDarkMode ? 'bg-opacity-20 text-opacity-90' : ''}`}>
              {progress.sleepOnset.toFixed(0)}%
            </span>
          </div>
          <div className={`h-4 bg-gray-200 rounded-full overflow-hidden mb-3 ${isDarkMode ? 'bg-gray-600' : ''}`}>
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor(progress.sleepOnset)}`}
              style={{ width: `${progress.sleepOnset}%` }}
            />
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Goal: {goals.sleepOnset.description}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {getProgressStatus(progress.sleepOnset)}
          </p>
        </div>

        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Afternoon Energy</h4>
            <span className={`text-sm px-2 py-1 rounded ${
              progress.afternoonEnergy >= 80 
                ? 'bg-green-100 text-green-800' 
                : progress.afternoonEnergy >= 60 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
            } ${isDarkMode ? 'bg-opacity-20 text-opacity-90' : ''}`}>
              {progress.afternoonEnergy.toFixed(0)}%
            </span>
          </div>
          <div className={`h-4 bg-gray-200 rounded-full overflow-hidden mb-3 ${isDarkMode ? 'bg-gray-600' : ''}`}>
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor(progress.afternoonEnergy)}`}
              style={{ width: `${progress.afternoonEnergy}%` }}
            />
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Goal: {goals.afternoonEnergy.description}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {getProgressStatus(progress.afternoonEnergy)}
          </p>
        </div>
      </div>

      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-purple-300' : 'text-orange-600'}`}>
          🎯 Goal-Focused Recommendations
        </h3>
        <ul className="space-y-3">
          {getRecommendationsForGoals().map((rec, index) => (
            <li key={index} className="flex items-start space-x-3">
              <span className={`text-sm ${isDarkMode ? 'text-purple-400' : 'text-orange-500'}`}>•</span>
              <span className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-purple-300' : 'text-orange-600'}`}>
          📋 Healthy Sleep Indicators Checklist
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className={`text-xl ${progress.sleepQuality >= 80 ? '✅' : '⏳'}`}>
              {progress.sleepQuality >= 80 ? '✅' : '⏳'}
            </span>
            <div>
              <span className="font-medium">Sleep Quality: "Good" or "Excellent" most nights</span>
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Current: {progress.sleepQuality.toFixed(0)}% of nights
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`text-xl ${progress.morningEnergy >= 80 ? '✅' : '⏳'}`}>
              {progress.morningEnergy >= 80 ? '✅' : '⏳'}
            </span>
            <div>
              <span className="font-medium">Morning Energy: "Alert" or "Energized" most mornings</span>
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Current: {progress.morningEnergy.toFixed(0)}% of mornings
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`text-xl ${progress.sleepOnset >= 80 ? '✅' : '⏳'}`}>
              {progress.sleepOnset >= 80 ? '✅' : '⏳'}
            </span>
            <div>
              <span className="font-medium">Time to Fall Asleep: Under 20 minutes consistently</span>
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Current: {progress.sleepOnset.toFixed(0)}% of nights
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`text-xl ${progress.afternoonEnergy >= 80 ? '✅' : '⏳'}`}>
              {progress.afternoonEnergy >= 80 ? '✅' : '⏳'}
            </span>
            <div>
              <span className="font-medium">Afternoon Energy: "Alert" or "Energized" (minimal crash)</span>
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Current: {progress.afternoonEnergy.toFixed(0)}% of afternoons
              </div>
            </div>
          </div>
        </div>
        
        <div className={`mt-6 p-4 rounded border-l-4 ${
          overallScore >= 80 
            ? isDarkMode 
              ? 'border-green-500 bg-green-900 bg-opacity-20' 
              : 'border-green-500 bg-green-50'
            : overallScore >= 60 
            ? isDarkMode 
              ? 'border-yellow-500 bg-yellow-900 bg-opacity-20' 
              : 'border-yellow-500 bg-yellow-50'
            : isDarkMode 
              ? 'border-red-500 bg-red-900 bg-opacity-20' 
              : 'border-red-500 bg-red-50'
        }`}>
          <p className="text-sm font-medium">
            {overallScore >= 80 
              ? '🎉 Excellent! You\'re achieving healthy sleep patterns consistently.'
              : overallScore >= 60 
              ? '👍 Good progress! Focus on improving your lowest scoring areas.'
              : '💪 Keep tracking! Identify patterns in your lower scoring areas and make small changes.'}
          </p>
        </div>
      </div>
    </div>
  );
}