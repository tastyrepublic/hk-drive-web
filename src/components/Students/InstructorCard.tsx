import { User, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, type Variants } from 'framer-motion'; 
import { GLOBAL_TRANSITION } from '../../constants/animations';

interface Props {
  instructor: any;
  isDark: boolean; 
  variants?: Variants;
}

export function InstructorCard({ instructor, variants }: Props) {
  const { t } = useTranslation();

  // Professional Teal-Cyan Gradient
  const bgClass = 'bg-gradient-to-br from-teal-600 to-cyan-700 shadow-lg shadow-teal-500/20 border-white/10 text-white';

  return (
    <motion.div 
      layout
      variants={variants}
      transition={GLOBAL_TRANSITION}
      className={`p-5 rounded-2xl border relative overflow-hidden ${bgClass}`}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden bg-white/20 backdrop-blur-md border border-white/20">
            <User size={16} className="text-white" />
            </div>
            <h3 className="font-bold text-lg text-white tracking-tight">
            {t('instructor.title', 'Instructor Info')}
            </h3>
        </div>

        <div className="flex items-center justify-between">
            <div>
            <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-bold text-2xl leading-tight text-white tracking-tight">
                {instructor?.name || t('instructor.placeholder', 'Instructor')}
                </span>
                {instructor?.phone && (
                <span className="text-xs font-medium opacity-70 border-l border-white/40 pl-2 text-white">
                    {instructor.phone}
                </span>
                )}
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-80 mt-1 text-white">
                {t('instructor.role', 'Driving Instructor')}
            </div>
            </div>
            
            <div className="flex items-center gap-2">
                {/* Dummy In-App Message Button */}
                <button
                    onClick={() => console.log('Future in-app messaging feature')}
                    className="p-3 rounded-full transition-transform active:scale-95 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 shadow-sm"
                    title={t('common.message', 'In-App Message')}
                >
                    <MessageSquare size={20} className="text-white opacity-90" />
                </button>

                {/* Existing WhatsApp Button */}
                {instructor?.phone && (
                <a
                    href={`https://wa.me/${instructor.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full transition-transform active:scale-95 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 shadow-sm"
                    title={t('common.whatsapp', 'Contact on WhatsApp')}
                >
                   <svg 
                     xmlns="http://www.w3.org/2000/svg" 
                     width="20" 
                     height="20" 
                     viewBox="0 0 24 24" 
                     fill="white"
                     className="opacity-90"
                   >
                     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                   </svg>
                </a>
                )}
            </div>
        </div>
      </div>
    </motion.div>
  );
}