import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Car, MapPin, Route as RouteIcon, Sparkles, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion'; 
import { getVehicleLabel, getExamCenterLabel, EXAM_ROUTES } from '../../constants/list';
import { GLOBAL_TRANSITION } from '../../constants/animations';

interface Props {
  activeProfile: any;
  onBuyPackage: () => void;
  variants?: Variants; 
}

export function BalanceCard({ activeProfile, onBuyPackage, variants }: Props) {
  const { t } = useTranslation();
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  
  const assignedCenterId = activeProfile?.examRoute;
  const assignedRoutes = (assignedCenterId && assignedCenterId !== 'Not Assigned')
    ? EXAM_ROUTES.filter(r => r.centerId === assignedCenterId)
    : [];

  return (
    <motion.div 
      layout
      variants={variants}
      transition={GLOBAL_TRANSITION} 
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg p-6"
    >
      
      {/* Background Icon */}
      <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
        <CreditCard size={100} className="!text-white" />
      </div>

      <div className="relative z-10">
        <div className="text-sm font-medium opacity-90 mb-1 uppercase tracking-wider !text-white">
            {t('balance.title')}
        </div>
        
        {/* Balance and Action Layout */}
        <div className="flex items-center gap-4 mt-1">
          <div className="text-6xl font-black tracking-tighter !text-white">
              {activeProfile?.balance ?? 0}
          </div>

          <button 
            onClick={onBuyPackage}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/10 transition-all active:scale-95 text-left"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Plus size={14} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wide leading-none mb-0.5 !text-white">
                {t('balance.top_up', 'Top Up')}
              </span>
              <span className="text-[9px] opacity-80 font-medium leading-tight !text-white">
                {t('balance.top_up_desc', 'Buy more lessons /\nRequest from teacher')}
              </span>
            </div>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-bold bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 uppercase">
              <Car size={14} className="!text-white" /> 
              <span className="!text-white">
                  {t(getVehicleLabel(activeProfile?.vehicle)) || t('common.general')}
              </span>
            </div>

            {assignedCenterId && assignedCenterId !== 'Not Assigned' ? (
              <div className="flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 uppercase">
                  <MapPin size={14} className="!text-white" /> 
                  <span className="!text-white">
                    {t(getExamCenterLabel(assignedCenterId))}
                  </span>
              </div>
            ) : (
              <span className="text-[10px] font-bold uppercase opacity-50 ml-1 !text-white">
                  {t('balance.no_center')}
              </span>
            )}
        </div>

        {assignedRoutes.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/20">
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2 flex items-center gap-1 !text-white">
                    <RouteIcon size={12} /> {t('balance.routes')}
                </div>
                <div className="flex flex-wrap gap-2">
                    {assignedRoutes.map((route, i) => (
                        <div 
                            key={route.id} 
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs font-medium backdrop-blur-sm"
                        >
                            <span className="opacity-50 text-[10px] font-bold !text-white">#{i + 1}</span>
                            <span className="!text-white">{t(route.label)}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Learning Progress Section */}
        <div className="mt-6 pt-4 border-t border-white/20">
             <button 
                onClick={() => setShowProgressDetails(!showProgressDetails)}
                className="w-full group text-left"
             >
                <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80 !text-white">
                         <Sparkles size={12} /> {t('balance.progress_title', 'Learning Progress')}
                    </div>
                    <div className="text-xs font-bold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity !text-white">
                        {showProgressDetails ? 'Hide' : 'More'} 
                        {showProgressDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Progress Bar Container - Changed to bg-white/10 to avoid "gray" look */}
                    <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden backdrop-blur-md border border-white/10 relative">
                        {/* Dummy Target Progress (85%) - A faint "ghost" bar */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '85%' }}
                            transition={{ duration: 1, ease: "circOut", delay: 0.2 }}
                            className="absolute h-full bg-white/30 rounded-full"
                        />
                        {/* Actual Progress - Pure Solid White with strong Glow */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${activeProfile?.progress ?? 0}%` }}
                            transition={{ duration: 1, ease: "circOut" }}
                            className="absolute h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.7)] z-10"
                        />
                    </div>
                    <div className="text-sm font-black w-8 text-right !text-white">
                      {activeProfile?.progress ?? 0}%
                    </div>
                </div>
             </button>

             <AnimatePresence>
                 {showProgressDetails && (
                     <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden"
                     >
                         <div className="p-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-md text-xs leading-relaxed font-medium !text-white">
                            "{activeProfile?.teacherNote || "Keep up the good work! Focus on mirror checks next time."}"
                         </div>
                     </motion.div>
                 )}
             </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}