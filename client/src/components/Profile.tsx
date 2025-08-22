import { useState, useEffect, useId } from 'react';

interface ProfileProps {
  isDarkMode: boolean;
}

export default function Profile({ isDarkMode }: ProfileProps) {
  const emailId = useId();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) return;
    
    setIsLoading(true);
    
    // Simulate login process
    setTimeout(() => {
      const newUser = { email: email.trim() };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      setEmail('');
      setIsLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (user) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl ${
            isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-orange-100 text-orange-600'
          }`}>
            👤
          </div>
          <h2 className={`text-xl font-semibold mb-2 ${
            isDarkMode ? 'text-slate-100' : 'text-gray-900'
          }`}>
            Welcome back!
          </h2>
          <p className={`text-sm ${
            isDarkMode ? 'text-slate-300' : 'text-gray-600'
          }`}>
            {user.email}
          </p>
        </div>

        <div className={`rounded-lg border p-4 ${
          isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <h3 className={`font-medium mb-2 ${
            isDarkMode ? 'text-slate-200' : 'text-gray-800'
          }`}>
            Account Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-600'}>Email:</span>
              <span className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-600'}>Status:</span>
              <span className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Active</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isDarkMode
              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800'
              : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
          }`}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl ${
          isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
        }`}>
          👤
        </div>
        <h2 className={`text-xl font-semibold mb-2 ${
          isDarkMode ? 'text-slate-100' : 'text-gray-900'
        }`}>
          Sign In
        </h2>
        <p className={`text-sm ${
          isDarkMode ? 'text-slate-400' : 'text-gray-600'
        }`}>
          Enter your email to access your profile
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label 
            htmlFor={emailId} 
            className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-300' : 'text-gray-700'
            }`}
          >
            Email Address
          </label>
          <input
            type="email"
            id={emailId}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              isDarkMode
                ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-purple-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-orange-500'
            } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-orange-500'
            }`}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLogin();
              }
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={!email.trim() || isLoading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
            !email.trim() || isLoading
              ? isDarkMode
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : isDarkMode
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}