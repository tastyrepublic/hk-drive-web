import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// Sub-components
import { RoleSelection } from './RoleSelection';
import { AuthForm } from './AuthForm';

interface Props {
    onLoginSuccess: () => void;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

export function AuthView({ onLoginSuccess, theme, toggleTheme }: Props) {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-midnight' : 'bg-gray-100';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 relative ${bgColor}`}>
      
      {/* THEME TOGGLE */}
      <div 
        className="absolute top-6 right-6 z-50"
        // Keeps button color synced even when back button is pressed
        data-portal={selectedRole === 'student' ? 'student' : 'teacher'}
      >
         <button 
            type="button" 
            onClick={toggleTheme} 
            className={`p-3 rounded-full border transition-all shadow-sm hover:shadow-md ${isDark ? 'bg-slate border-gray-800 text-textGrey hover:text-primary' : 'bg-white border-gray-200 text-gray-400 hover:text-primary'}`}
         >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
         </button>
      </div>

      <AnimatePresence mode="wait">
        
        {!selectedRole ? (
             <RoleSelection 
                key="role-select" 
                onSelect={setSelectedRole} 
                theme={theme} 
             />
        ) : (
             <AuthForm 
                key="auth-form"
                role={selectedRole}
                onLoginSuccess={onLoginSuccess}
                onBack={() => setSelectedRole(null)}
                theme={theme}
             />
        )}

      </AnimatePresence>
    </div>
  );
}