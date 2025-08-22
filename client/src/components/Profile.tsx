import { useState } from 'react';
import AccountManager from './AccountManager';
import type { Account } from '../utils/crypto';

interface ProfileProps {
  isDarkMode: boolean;
}

export default function Profile({ isDarkMode }: ProfileProps) {
  const [, setAccount] = useState<Account | null>(null);

  return (
    <AccountManager 
      isDarkMode={isDarkMode} 
      onAccountChange={setAccount}
    />
  );
}