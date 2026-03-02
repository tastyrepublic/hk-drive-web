import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectProps {
    value: string;
    onChange: (val: string) => void;
    label: string;
    disabled?: boolean;
    minDate?: string; // Used to block past dates
    variant?: 'purple' | 'orange' | 'blocked';
}

export function DateSelect({ 
    value, onChange, label, disabled = false, minDate, variant = 'purple' 
}: DateSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    // Initialize the calendar view to the currently selected value, or today
    const initialDate = value ? new Date(value) : new Date();
    const [viewDate, setViewDate] = useState(initialDate);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Theme Variables
    const activeBg = variant === 'orange' ? 'bg-orange' : variant === 'blocked' ? 'bg-red-500' : 'bg-purple-500';
    const activeText = variant === 'orange' ? 'text-orange' : variant === 'blocked' ? 'text-red-400' : 'text-purple-400';
    const activeBorder = variant === 'orange' ? 'border-orange' : variant === 'blocked' ? 'border-red-500' : 'border-purple-500';

    // Calendar Math
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Create an array with empty slots for padding, followed by the days of the month
    const days: (number | null)[] = [
        ...Array.from({ length: firstDay }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];

    const handleSelect = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    // Format value for display (e.g., "15 Oct 2026")
    const displayDate = value 
        ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
        : '-- / -- / ----';

    return (
        <div className="space-y-1.5 relative" ref={wrapperRef}>
            <label className="text-[10px] text-textGrey uppercase font-black">{label}</label>
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full p-2.5 bg-midnight border rounded-lg text-white flex items-center justify-between transition-colors shadow-sm
                    ${disabled ? 'opacity-50 cursor-not-allowed border-gray-800' : 'cursor-pointer hover:border-gray-500 border-gray-700'}
                    ${isOpen ? `${activeBorder} shadow-sm` : ''}`}
            >
                <div className="flex items-center gap-2">
                    <CalendarIcon size={14} className={isOpen ? activeText : 'text-textGrey'} />
                    <span className="text-sm font-bold">{displayDate}</span>
                </div>
                <ChevronDown size={16} className={`text-textGrey transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[260px] bg-slate border border-gray-700 rounded-xl shadow-2xl z-[100] overflow-hidden p-3 animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header: Month & Year Controls */}
                    <div className="flex justify-between items-center mb-4 bg-midnight/50 p-1.5 rounded-lg border border-gray-800">
                        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 text-textGrey hover:text-white transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-bold text-sm text-white">
                            {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 text-textGrey hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Days of Week */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <span key={d} className="text-[10px] font-black text-textGrey">{d}</span>
                        ))}
                    </div>

                    {/* Day Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, i) => {
                            if (!day) return <div key={`empty-${i}`} />;
                            
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            // Disable if the date string is alphabetically older than the minDate string
                            const isPast = minDate ? dateStr < minDate : false;
                            const isSelected = value === dateStr;

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={isPast}
                                    onClick={() => handleSelect(day)}
                                    className={`aspect-square flex items-center justify-center text-xs font-bold rounded-md transition-all
                                        ${isSelected 
                                            ? `${activeBg} text-white shadow-sm` 
                                            : isPast 
                                                ? 'text-gray-600 opacity-30 cursor-not-allowed bg-transparent' 
                                                : 'text-white hover:bg-white/10'}`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}