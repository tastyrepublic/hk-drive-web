import { CreditCard, Car, MapPin, Route as RouteIcon } from 'lucide-react';
import { getVehicleLabel, getExamCenterLabel, EXAM_ROUTES } from '../../constants/list';

interface Props {
  activeProfile: any;
}

export function BalanceCard({ activeProfile }: Props) {
  // --- CALCULATE ROUTES ---
  const assignedCenterId = activeProfile?.examRoute;
  const assignedRoutes = (assignedCenterId && assignedCenterId !== 'Not Assigned')
    ? EXAM_ROUTES.filter(r => r.centerId === assignedCenterId)
    : [];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg p-6">
      
      {/* Background Icon Decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <CreditCard size={100} className="!text-white" />
      </div>

      <div className="relative z-10">
        {/* Balance Section */}
        <div className="text-sm font-medium opacity-90 mb-1 uppercase tracking-wider !text-white">
          Lesson Balance
        </div>
        <div className="text-6xl font-black tracking-tighter !text-white">
          {activeProfile?.balance ?? 0}
        </div>

        {/* TAGS ROW (Vehicle & Center) */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* VEHICLE TAG */}
          <div className="flex items-center gap-2 text-xs font-bold bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 uppercase">
            <Car size={14} className="!text-white" /> 
            <span className="!text-white">
              {getVehicleLabel(activeProfile?.vehicle) || 'General'}
            </span>
          </div>

          {/* EXAM CENTER TAG */}
          {assignedCenterId && assignedCenterId !== 'Not Assigned' && (
            <div className="flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 uppercase">
              <MapPin size={14} className="!text-white" /> 
              <span className="!text-white">
                {getExamCenterLabel(assignedCenterId)}
              </span>
            </div>
          )}
        </div>

        {/* ROUTES SECTION */}
        {assignedRoutes.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/20 animate-in fade-in slide-in-from-bottom-2">
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2 flex items-center gap-1 !text-white">
                    <RouteIcon size={12} /> Routes to Master
                </div>
                <div className="flex flex-wrap gap-2">
                    {assignedRoutes.map((route, i) => (
                        <div 
                            key={route.id} 
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs font-medium backdrop-blur-sm"
                        >
                            <span className="opacity-50 text-[10px] font-bold">#{i + 1}</span>
                            <span>{route.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}