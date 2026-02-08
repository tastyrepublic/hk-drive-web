import { useState, useEffect } from 'react';
import { RootRouter } from './components/RootRouter/RootRouter';
import { Toast } from './components/Toast/Toast';

// Types
type Theme = 'dark' | 'light';
type ToastType = 'success' | 'error';

function App() {
  // 1. Theme State (Lifted up so it persists across all pages)
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem('hk-theme') as Theme) || 'dark'
  );

  // 2. Global Toast State (So notifications work everywhere)
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  // 3. Theme Effect: Syncs with HTML/LocalStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hk-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  // 4. Toast Helper Function
  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      {/* Global Toast Layer - Renders on top of everything */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* The Router acts as the traffic controller */}
      <RootRouter 
        theme={theme} 
        toggleTheme={toggleTheme} 
        showToast={showToast} 
      />
    </>
  );
}

export default App;