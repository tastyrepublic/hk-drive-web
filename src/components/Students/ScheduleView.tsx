import { Calendar } from 'lucide-react';

interface Props {
  instructorName: string;
  isDark: boolean;
}

export function ScheduleView({ instructorName, isDark }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">Available Slots</h2>
        <p className="text-xs opacity-60">Book with {instructorName}</p>
      </div>
      <div className={`p-8 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center gap-3 ${isDark ? 'border-gray-800 bg-white/5' : 'border-gray-200 bg-black/5'}`}>
        <Calendar size={48} className="opacity-20" />
        <p className="text-sm font-medium opacity-60">No public slots available.<br/>Please contact your instructor.</p>
      </div>
    </div>
  );
}