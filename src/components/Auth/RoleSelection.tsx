import { Briefcase, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onSelect: (role: 'teacher' | 'student') => void;
  theme: 'dark' | 'light';
}

export function RoleSelection({ onSelect, theme }: Props) {
  const isDark = theme === 'dark';
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subTextColor = isDark ? 'text-textGrey' : 'text-gray-500';

  return (
    <motion.div 
      key="role-selection"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-10">
          <h1 className={`text-4xl font-black tracking-tight mb-2 ${textColor}`}>HK Drive Pro</h1>
          <p className={`${subTextColor} uppercase tracking-widest text-sm`}>Choose your portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TEACHER CARD */}
          <button 
              onClick={() => onSelect('teacher')}
              className={`group p-8 rounded-3xl border text-left transition-all hover:-translate-y-1 hover:shadow-md shadow-sm relative overflow-hidden ${cardColor}`}
          >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity text-orange">
                  <Briefcase size={120} />
              </div>
              <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-orange/10 flex items-center justify-center text-orange mb-6">
                      <Briefcase size={32} />
                  </div>
                  <h2 className={`text-2xl font-bold mb-2 ${textColor}`}>I am an Instructor</h2>
                  <p className={`${subTextColor} text-sm`}>Manage schedule, track students, and handle payments.</p>
              </div>
          </button>

          {/* STUDENT CARD */}
          <button 
              onClick={() => onSelect('student')}
              className={`group p-8 rounded-3xl border text-left transition-all hover:-translate-y-1 hover:shadow-md shadow-sm relative overflow-hidden ${cardColor}`}
          >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity text-blue-500">
                  <GraduationCap size={120} />
              </div>
              <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600'}`}>
                      <GraduationCap size={32} />
                  </div>
                  <h2 className={`text-2xl font-bold mb-2 ${textColor}`}>I am a Student</h2>
                  <p className={`${subTextColor} text-sm`}>View upcoming lessons, exam routes, and progress.</p>
              </div>
          </button>
      </div>
    </motion.div>
  );
}