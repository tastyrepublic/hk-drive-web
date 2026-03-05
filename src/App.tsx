import { useState, useEffect } from 'react';
import './i18n';
import { RootRouter } from './components/RootRouter/RootRouter';
// 1. Import the Toast component AND the ToastMessage interface
import { Toast, type ToastMessage } from './components/Toast/Toast';

// Types (Added 'info' to match your Dashboard)
type Theme = 'dark' | 'light';
type ToastType = 'success' | 'error' | 'info';

function App() {
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem('hk-theme') as Theme) || 'dark'
  );

  // 2. Change state to hold an ARRAY of toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hk-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  // 3. Update showToast to stack messages with unique IDs
  const showToast = (msg: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random(); // Unique ID for every toast
    
    setToasts((prev) => [...prev, { id, msg, type }]);

    // Only remove this specific toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <>
      {/* 4. Pass the array directly to the Toast component */}
      <Toast toasts={toasts} />

      <RootRouter 
        theme={theme} 
        toggleTheme={toggleTheme} 
        showToast={showToast} 
      />
    </>
  );
}

export default App;