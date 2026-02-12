import { User, Phone } from 'lucide-react';

interface Props {
  instructor: any;
  isDark: boolean;
}

export function InstructorCard({ instructor, isDark }: Props) {
  const cardColor = isDark ? 'bg-slate border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className={`p-5 rounded-2xl border shadow-sm ${cardColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden text-primary">
          <div className="absolute inset-0 bg-primary opacity-15"></div>
          <User size={18} className="relative z-10" />
        </div>
        <h3 className="font-bold text-lg">Instructor Info</h3>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-lg leading-tight">
              {instructor?.name || 'Instructor'}
            </span>
            {instructor?.phone && (
              <span className="text-xs font-medium opacity-40 border-l border-gray-500/30 pl-2">
                {instructor.phone}
              </span>
            )}
          </div>
          <div className="text-[11px] uppercase tracking-widest font-bold opacity-50 mt-1">
            Driving Instructor
          </div>
        </div>
        {instructor?.phone && (
          <a
            href={`https://wa.me/${instructor.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-[#25D366] rounded-full transition-transform active:scale-95 flex items-center justify-center"
          >
            <Phone size={20} className="!text-white !fill-white" />
          </a>
        )}
      </div>
    </div>
  );
}