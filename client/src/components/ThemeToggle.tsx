interface Props {
  isDarkMode: boolean;
  onToggle: (isDarkMode: boolean) => void;
}

export default function ThemeToggle({ isDarkMode, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!isDarkMode)}
      className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDarkMode 
          ? 'bg-purple-600 focus:ring-purple-500' 
          : 'bg-orange-500 focus:ring-orange-400'
      }`}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div 
        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 flex items-center justify-center ${
          isDarkMode ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        <span className="text-xs">
          {isDarkMode ? '🌙' : '☀️'}
        </span>
      </div>
    </button>
  );
}