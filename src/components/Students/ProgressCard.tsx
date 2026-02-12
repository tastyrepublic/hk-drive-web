import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  activeProfile: any;
  isDark: boolean;
}

export function ProgressCard({ activeProfile, isDark }: Props) {
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className={`p-5 rounded-2xl border shadow-sm ${cardColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden text-primary">
          <div className="absolute inset-0 bg-primary opacity-15"></div>
          <Sparkles size={18} className="relative z-10" />
        </div>
        <h3 className="font-bold text-lg">Learning Progress</h3>
      </div>

      <div className="space-y-4">
        <div className={`p-4 rounded-xl border-l-4 border-l-primary ${isDark ? 'bg-midnight' : 'bg-gray-50'}`}>
          <p className={`text-sm leading-relaxed font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            "{activeProfile?.teacherNote || `Focus on mirror-signal-manoeuvre during lane changes next lesson. Great control on roundabouts today!`}"
          </p>
        </div>

        <div className="px-1 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="opacity-50">Syllabus Completion</span>
            <span className="text-primary">{activeProfile?.progress ?? 65}%</span>
          </div>
          <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${activeProfile?.progress ?? 65}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}