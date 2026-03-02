import { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface TimeSelectProps {
    value: string;
    onChange: (val: string) => void;
    label: string;
    disabled?: boolean;
    minTime?: string;
    align?: 'left' | 'right';
    variant?: 'purple' | 'orange' | 'blocked';
}

export function TimeSelect({ 
    value, onChange, label, disabled = false, minTime, align = 'left', 
    variant = 'purple' 
}: TimeSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'hour' | 'minute'>('hour');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const hours = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, '0'));
    const minutes = ['00', '10', '20', '30', '40', '50'];

    const [curH, curM] = value ? value.split(':') : ['--', '--'];
    const [minH, minM] = minTime ? minTime.split(':').map(Number) : [0, 0]

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (minTime && value) {
            const vMins = Number(curH) * 60 + Number(curM);
            const mMins = minH * 60 + minM;
            if (vMins <= mMins) {
                let nextH = minH;
                let nextM = minM + 10;
                if (nextM >= 60) { nextM -= 60; nextH += 1; }
                onChange(`${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
            }
        }
    }, [minTime, value, curH, curM, minH, minM, onChange]);

    useEffect(() => { if (isOpen) setMode('hour'); }, [isOpen]);

    const activeBg = variant === 'orange' ? 'bg-orange' : variant === 'blocked' ? 'bg-red-500' : 'bg-purple-500';
    const activeText = variant === 'orange' ? 'text-orange' : variant === 'blocked' ? 'text-red-400' : 'text-purple-400';
    const activeBorder = variant === 'orange' ? 'border-orange' : variant === 'blocked' ? 'border-red-500' : 'border-purple-500';
    const activeGhostBg = variant === 'orange' ? 'bg-orange/20' : variant === 'blocked' ? 'bg-red-500/20' : 'bg-purple-500/20';
    
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
                    <Clock size={14} className={isOpen ? activeText : 'text-textGrey'} />
                    {/* [NEW] Show --:-- if empty */}
                    <span className="text-sm font-bold">{value || '--:--'}</span>
                </div>
                <ChevronDown size={16} className={`text-textGrey transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className={`absolute top-full mt-2 w-[260px] bg-slate border border-gray-700 rounded-xl shadow-2xl z-[100] overflow-hidden p-3 animate-in fade-in zoom-in-95 duration-200 ${align === 'right' ? 'right-0' : 'left-0'}`}>
                    <div className="flex justify-center items-center gap-1 mb-4 bg-midnight/50 p-1.5 rounded-lg border border-gray-800">
                        {/* [NEW] Show fallback '08' in the tab if empty, so it doesn't look broken */}
                        <button type="button" onClick={() => setMode('hour')} className={`flex-1 py-1.5 text-xl font-bold rounded-md transition-all ${mode === 'hour' ? `${activeBg} text-white` : 'text-textGrey'}`}>{curH === '--' ? '08' : curH}</button>
                        <span className="text-xl font-bold text-gray-600 pb-1">:</span>
                        <button type="button" onClick={() => setMode('minute')} className={`flex-1 py-1.5 text-xl font-bold rounded-md transition-all ${mode === 'minute' ? `${activeBg} text-white` : 'text-textGrey'}`}>{curM === '--' ? '00' : curM}</button>
                    </div>

                    <div className="h-[140px]">
                        {mode === 'hour' ? (
                            <div className="grid grid-cols-6 gap-1.5">
                                {hours.map((h) => {
                                    const hNum = Number(h);
                                    const isHourDead = !!minTime && (hNum < minH || (hNum === minH && minM >= 50));
                                    return (
                                        <button key={h} type="button" disabled={isHourDead} onClick={() => {
                                            // [NEW] If minute is empty, default to '00' when an hour is clicked
                                            let newM = curM === '--' ? '00' : curM;
                                            if (minTime && hNum === minH && Number(newM) <= minM) {
                                                const nextValidM = minutes.map(Number).find(m => m > minM);
                                                newM = nextValidM !== undefined ? String(nextValidM).padStart(2, '0') : '00';
                                            }
                                            onChange(`${h}:${newM}`);
                                            setMode('minute');
                                        }} className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold border transition-all ${curH === h ? `${activeGhostBg} ${activeText} ${activeBorder}/50` : isHourDead ? 'opacity-30' : 'text-white border-gray-800 hover:bg-white/5'}`}>{h}</button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 h-full">
                                {minutes.map((m) => {
                                    const isMinuteDead = !!minTime && Number(curH) === minH && Number(m) <= minM;
                                    return (
                                        <button key={m} type="button" disabled={isMinuteDead} onClick={() => { 
                                            // [NEW] If hour is empty (user skipped to minute tab), default to '08'
                                            const safeH = curH === '--' ? '08' : curH;
                                            onChange(`${safeH}:${m}`); 
                                            setIsOpen(false); 
                                        }} className={`rounded-lg flex items-center justify-center text-lg font-bold border transition-all ${curM === m ? `${activeBg} text-white ${activeBorder}` : isMinuteDead ? 'opacity-30' : 'text-white border-gray-800 hover:bg-white/5'}`}>{m}</button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}