import { useState, useEffect, useId, useCallback } from 'react';
import type { SleepEntry, SleepQuality, EnergyLevel, SleepOnsetTime } from '../types/sleep';

interface QuestionData {
  sleepQuality?: SleepQuality;
  morningEnergy?: EnergyLevel;
  timeToFallAsleep?: SleepOnsetTime;
  afternoonEnergy?: EnergyLevel;
  notes?: string;
  stressLevel?: number;
  screenTime?: number;
  roomTemp?: number;
  caffeineTime?: string;
  exerciseTime?: string;
  preBedtimeActivities?: string;
  anxietyLevel?: number;
}

interface Props {
  onAddEntry: (entry: SleepEntry) => void;
  entries: SleepEntry[];
  onUpdateEntry: (id: string, entry: Partial<SleepEntry>) => void;
  onDeleteEntry: (id: string) => void;
  isDarkMode: boolean;
  editEntryId?: string | null;
  onEditComplete?: () => void;
}

const sleepQualityOptions = [
  { value: 'good', label: 'Good', description: 'Slept well, feel refreshed and ready for the day' },
  { value: 'fair', label: 'Fair', description: 'Okay sleep, feel somewhat rested but could be better' },
  { value: 'poor', label: 'Poor', description: 'Got some sleep but woke up tired and unrested' }
] as const;

const energyLevelOptions = [
  { value: 'energized', label: 'Energized', description: 'Feel great and motivated' },
  { value: 'alert', label: 'Alert', description: 'Feel awake and ready' },
  { value: 'tired', label: 'Tired', description: 'Groggy but can get moving' },
  { value: 'exhausted', label: 'Exhausted', description: 'Can barely function' }
] as const;

const sleepOnsetOptions = [
  { value: 'under-10', label: 'Under 10 minutes', description: 'Fell asleep very quickly' },
  { value: '10-20', label: '10-20 minutes', description: 'Normal, healthy sleep onset' },
  { value: '20-30', label: '20-30 minutes', description: 'Took a while but acceptable' },
  { value: '30-60', label: '30-60 minutes', description: 'Too long, investigate causes' },
  { value: 'over-60', label: 'Over 60 minutes', description: 'Significant sleep problem' }
] as const;

interface ExpandableQuestionProps {
  questionId: string;
  title: string; 
  options: readonly { value: string; label: string; description: string }[]; 
  value: string; 
  onChange: (value: string) => void; 
  name: string;
  onSave: (data: Partial<QuestionData>) => void;
  isDarkMode: boolean;
  expandedQuestions: Record<string, boolean>;
  toggleQuestion: (questionId: string) => void;
}

const ExpandableQuestion = ({ 
  questionId,
  title, 
  options, 
  value, 
  onChange, 
  name,
  onSave,
  isDarkMode,
  expandedQuestions,
  toggleQuestion
}: ExpandableQuestionProps) => {
  const isExpanded = expandedQuestions[questionId];
  const hasValue = value !== '';
  
  return (
    <div className={`border rounded-lg ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`}>
      <button
        type="button"
        onClick={() => toggleQuestion(questionId)}
        className={`w-full flex items-center justify-between p-4 text-left ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}
      >
        <div className="flex items-center space-x-3">
          <span className={`text-sm font-medium ${
            hasValue 
              ? isDarkMode ? 'text-green-400' : 'text-green-600'
              : isDarkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            {hasValue ? '✓' : '○'}
          </span>
          <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
            {title}
          </span>
          {hasValue && (
            <span className={`text-sm capitalize px-2 py-1 rounded ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
              {value.replace('-', ' ')}
            </span>
          )}
        </div>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ↓
        </span>
      </button>
      
      {isExpanded && (
        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="space-y-2 mb-4">
            {options.map(option => (
              <label key={option.value} className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                value === option.value
                  ? isDarkMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-orange-100 border-orange-300'
                  : isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'bg-white hover:bg-gray-50 border-gray-200'
              } border`}>
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className={`text-sm ${
                    value === option.value
                      ? isDarkMode ? 'text-purple-100' : 'text-orange-700'
                      : isDarkMode ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          
          {value && (
            <button
              type="button"
              onClick={() => {
                onSave({ [name]: value as SleepQuality | EnergyLevel | SleepOnsetTime });
                toggleQuestion(questionId);
              }}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              Save Answer
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function DailyTrackingForm({ onAddEntry, entries, onUpdateEntry, onDeleteEntry: _onDeleteEntry, isDarkMode, editEntryId, onEditComplete }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const stressLevelId = useId();
  const screenTimeId = useId();
  const roomTempId = useId();
  const caffeineTimeId = useId();
  const [formData, setFormData] = useState({
    sleepQuality: '' as SleepQuality | '',
    morningEnergy: '' as EnergyLevel | '',
    timeToFallAsleep: '' as SleepOnsetTime | '',
    afternoonEnergy: '' as EnergyLevel | '',
    notes: '',
    stressLevel: '',
    screenTime: '',
    roomTemp: '',
    caffeineTime: '',
    exerciseTime: '',
    preBedtimeActivities: '',
    anxietyLevel: ''
  });

  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, QuestionData>>(() => {
    const saved = localStorage.getItem('sleepAnswers');
    return saved ? JSON.parse(saved) : {};
  });

  const editEntry = useCallback((entry: SleepEntry) => {
    setFormData({
      sleepQuality: entry.sleepQuality,
      morningEnergy: entry.morningEnergy,
      timeToFallAsleep: entry.timeToFallAsleep,
      afternoonEnergy: entry.afternoonEnergy,
      notes: entry.notes,
      stressLevel: entry.stressLevel?.toString() || '',
      screenTime: entry.screenTime?.toString() || '',
      roomTemp: entry.roomTemp?.toString() || '',
      caffeineTime: entry.caffeineTime || '',
      exerciseTime: entry.exerciseTime || '',
      preBedtimeActivities: entry.preBedtimeActivities || '',
      anxietyLevel: entry.anxietyLevel?.toString() || ''
    });
    setEditingId(entry.id);
    setExpandedQuestions({ sleepQuality: true, morningEnergy: true, timeToFallAsleep: true, afternoonEnergy: true, notes: true, advanced: true });
  }, []);

  // Handle edit entry from URL parameter
  useEffect(() => {
    if (editEntryId) {
      const entryToEdit = entries.find(entry => entry.id === editEntryId);
      if (entryToEdit) {
        editEntry(entryToEdit);
      }
    }
  }, [editEntryId, entries, editEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sleepQuality || !formData.morningEnergy || !formData.timeToFallAsleep || !formData.afternoonEnergy) {
      alert('Please fill in all 4 core metrics');
      return;
    }

    const entry: SleepEntry = {
      id: editingId || Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      sleepQuality: formData.sleepQuality,
      morningEnergy: formData.morningEnergy,
      timeToFallAsleep: formData.timeToFallAsleep,
      afternoonEnergy: formData.afternoonEnergy,
      notes: formData.notes,
      ...(formData.stressLevel && { stressLevel: Number(formData.stressLevel) }),
      ...(formData.screenTime && { screenTime: Number(formData.screenTime) }),
      ...(formData.roomTemp && { roomTemp: Number(formData.roomTemp) }),
      ...(formData.caffeineTime && { caffeineTime: formData.caffeineTime }),
      ...(formData.exerciseTime && { exerciseTime: formData.exerciseTime }),
      ...(formData.preBedtimeActivities && { preBedtimeActivities: formData.preBedtimeActivities }),
      ...(formData.anxietyLevel && { anxietyLevel: Number(formData.anxietyLevel) })
    };

    if (editingId) {
      onUpdateEntry(editingId, entry);
      setEditingId(null);
      onEditComplete?.();
    } else {
      onAddEntry(entry);
    }

    setFormData({
      sleepQuality: '',
      morningEnergy: '',
      timeToFallAsleep: '',
      afternoonEnergy: '',
      notes: '',
      stressLevel: '',
      screenTime: '',
      roomTemp: '',
      caffeineTime: '',
      exerciseTime: '',
      preBedtimeActivities: '',
      anxietyLevel: ''
    });
    setExpandedQuestions({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      sleepQuality: '',
      morningEnergy: '',
      timeToFallAsleep: '',
      afternoonEnergy: '',
      notes: '',
      stressLevel: '',
      screenTime: '',
      roomTemp: '',
      caffeineTime: '',
      exerciseTime: '',
      preBedtimeActivities: '',
      anxietyLevel: ''
    });
    setExpandedQuestions({});
    onEditComplete?.();
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const saveIndividualAnswer = (data: Partial<QuestionData>) => {
    const newSavedAnswers = {
      ...savedAnswers,
      [today]: { ...savedAnswers[today], ...data }
    };
    
    setSavedAnswers(newSavedAnswers);
    localStorage.setItem('sleepAnswers', JSON.stringify(newSavedAnswers));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {editingId ? 'Edit Sleep Entry' : 'Today\'s Sleep Tracking'}
        </h2>
        <span className={`text-sm px-3 py-1 rounded-full ${
          isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
        }`}>
          {new Date().toLocaleDateString()}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <ExpandableQuestion
            questionId="sleepQuality"
            title="Sleep Quality Rating"
            options={sleepQualityOptions}
            value={formData.sleepQuality}
            onChange={(value) => setFormData(prev => ({ ...prev, sleepQuality: value as SleepQuality }))}
            name="sleepQuality"
            onSave={saveIndividualAnswer}
            isDarkMode={isDarkMode}
            expandedQuestions={expandedQuestions}
            toggleQuestion={toggleQuestion}
          />

          <ExpandableQuestion
            questionId="morningEnergy"
            title="Morning Energy Level"
            options={energyLevelOptions}
            value={formData.morningEnergy}
            onChange={(value) => setFormData(prev => ({ ...prev, morningEnergy: value as EnergyLevel }))}
            name="morningEnergy"
            onSave={saveIndividualAnswer}
            isDarkMode={isDarkMode}
            expandedQuestions={expandedQuestions}
            toggleQuestion={toggleQuestion}
          />

          <ExpandableQuestion
            questionId="timeToFallAsleep"
            title="Time to Fall Asleep"
            options={sleepOnsetOptions}
            value={formData.timeToFallAsleep}
            onChange={(value) => setFormData(prev => ({ ...prev, timeToFallAsleep: value as SleepOnsetTime }))}
            name="timeToFallAsleep"
            onSave={saveIndividualAnswer}
            isDarkMode={isDarkMode}
            expandedQuestions={expandedQuestions}
            toggleQuestion={toggleQuestion}
          />

          <ExpandableQuestion
            questionId="afternoonEnergy"
            title="Afternoon Energy Level"
            options={energyLevelOptions}
            value={formData.afternoonEnergy}
            onChange={(value) => setFormData(prev => ({ ...prev, afternoonEnergy: value as EnergyLevel }))}
            name="afternoonEnergy"
            onSave={saveIndividualAnswer}
            isDarkMode={isDarkMode}
            expandedQuestions={expandedQuestions}
            toggleQuestion={toggleQuestion}
          />
        </div>

        <div className={`border rounded-lg ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`}>
          <button
            type="button"
            onClick={() => toggleQuestion('notes')}
            className={`w-full flex items-center justify-between p-4 text-left ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${
                formData.notes 
                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                  : isDarkMode ? 'text-slate-400' : 'text-gray-500'
              }`}>
                {formData.notes ? '✓' : '○'}
              </span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                Notes & Observations
              </span>
              {formData.notes && (
                <span className={`text-sm px-2 py-1 rounded ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                  Added
                </span>
              )}
            </div>
            <span className={`transform transition-transform ${expandedQuestions.notes ? 'rotate-180' : ''}`}>
              ↓
            </span>
          </button>
          
          {expandedQuestions.notes && (
            <div className={`p-4 border-t ${isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional observations about your sleep..."
                className={`w-full p-3 rounded-lg border mb-4 ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                rows={3}
              />
              
              {formData.notes && (
                <button
                  type="button"
                  onClick={() => {
                    saveIndividualAnswer({ notes: formData.notes });
                    toggleQuestion('notes');
                  }}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  Save Notes
                </button>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleQuestion('advanced')}
          className={`text-sm font-medium ${
            isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-orange-600 hover:text-orange-700'
          }`}
        >
          {expandedQuestions.advanced ? '▼ Hide' : '▶ Show'} Advanced Tracking
        </button>

        {expandedQuestions.advanced && (
          <div className={`grid md:grid-cols-2 gap-4 p-4 rounded-lg ${
            isDarkMode ? 'bg-slate-700' : 'bg-gray-50'
          }`}>
            <div>
              <label htmlFor={stressLevelId} className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Stress Level (1-10)
              </label>
              <input
                id={stressLevelId}
                type="number"
                min="1"
                max="10"
                value={formData.stressLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, stressLevel: e.target.value }))}
                className={`w-full p-2 rounded border ${
                  isDarkMode 
                    ? 'bg-slate-600 border-slate-500 text-slate-200' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div>
              <label htmlFor={screenTimeId} className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Screen Time (hours before bed)
              </label>
              <input
                id={screenTimeId}
                type="number"
                step="0.5"
                min="0"
                value={formData.screenTime}
                onChange={(e) => setFormData(prev => ({ ...prev, screenTime: e.target.value }))}
                className={`w-full p-2 rounded border ${
                  isDarkMode 
                    ? 'bg-slate-600 border-slate-500 text-slate-200' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div>
              <label htmlFor={roomTempId} className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Room Temperature (°F)
              </label>
              <input
                id={roomTempId}
                type="number"
                value={formData.roomTemp}
                onChange={(e) => setFormData(prev => ({ ...prev, roomTemp: e.target.value }))}
                className={`w-full p-2 rounded border ${
                  isDarkMode 
                    ? 'bg-slate-600 border-slate-500 text-slate-200' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div>
              <label htmlFor={caffeineTimeId} className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Last Caffeine Time
              </label>
              <input
                id={caffeineTimeId}
                type="time"
                value={formData.caffeineTime}
                onChange={(e) => setFormData(prev => ({ ...prev, caffeineTime: e.target.value }))}
                className={`w-full p-2 rounded border ${
                  isDarkMode 
                    ? 'bg-slate-600 border-slate-500 text-slate-200' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {editingId ? 'Update Entry' : 'Save Today\'s Entry'}
          </button>
          
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-slate-600 hover:bg-slate-700 text-white'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

    </div>
  );
}