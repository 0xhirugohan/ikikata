import { useState, useEffect } from 'react';
import { SleepEntry } from '../types/sleep';
import DailyTrackingForm from './DailyTrackingForm';
import SleepAnalytics from './SleepAnalytics';
import Profile from './Profile';
import ThemeToggle from './ThemeToggle';

export default function SleepTrackingDashboard() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'track' | 'analytics' | 'profile'>('track');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);

  useEffect(() => {
    const savedEntries = localStorage.getItem('sleepEntries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }

    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme === 'dark');

    // Check for edit parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      setActiveTab('track');
      setEditEntryId(editId);
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const addEntry = (entry: SleepEntry) => {
    const newEntries = [entry, ...entries];
    setEntries(newEntries);
    localStorage.setItem('sleepEntries', JSON.stringify(newEntries));
  };

  const updateEntry = (id: string, updatedEntry: Partial<SleepEntry>) => {
    const newEntries = entries.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    );
    setEntries(newEntries);
    localStorage.setItem('sleepEntries', JSON.stringify(newEntries));
  };

  const deleteEntry = (id: string) => {
    const newEntries = entries.filter(entry => entry.id !== id);
    setEntries(newEntries);
    localStorage.setItem('sleepEntries', JSON.stringify(newEntries));
  };

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-slate-900 text-slate-100' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Mobile Header */}
      <header className={`sticky top-0 z-40 px-4 py-4 border-b ${
        isDarkMode 
          ? 'bg-slate-900 border-slate-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <h1 className={`text-xl font-bold truncate ${
            isDarkMode 
              ? 'text-purple-300' 
              : 'text-orange-600'
          }`}>
            生き方
          </h1>
          <ThemeToggle isDarkMode={isDarkMode} onToggle={setIsDarkMode} />
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4">
        <div className={`rounded-lg shadow-lg overflow-hidden ${
          isDarkMode 
            ? 'bg-slate-800 border border-slate-700' 
            : 'bg-white border border-gray-200'
        }`}>
          {activeTab === 'track' && (
            <DailyTrackingForm 
              onAddEntry={addEntry}
              entries={entries}
              onUpdateEntry={updateEntry}
              onDeleteEntry={deleteEntry}
              isDarkMode={isDarkMode}
              editEntryId={editEntryId}
              onEditComplete={() => setEditEntryId(null)}
            />
          )}
          {activeTab === 'analytics' && (
            <SleepAnalytics 
              entries={entries}
              isDarkMode={isDarkMode}
              onEditEntry={(entry) => {
                setActiveTab('track');
                setEditEntryId(entry.id);
              }}
              onDeleteEntry={deleteEntry}
            />
          )}
          {activeTab === 'profile' && (
            <Profile 
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t ${
        isDarkMode 
          ? 'bg-slate-900 border-slate-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex">
          {[
            { id: 'track', label: 'Track', icon: '📝' },
            { id: 'analytics', label: 'Analytics', icon: '📊' },
            { id: 'profile', label: 'Profile', icon: '👤' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex flex-col items-center py-3 px-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? isDarkMode
                    ? 'text-purple-400 bg-purple-900/20'
                    : 'text-orange-600 bg-orange-50'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="text-lg mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}