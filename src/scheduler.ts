import { parse, isSaturday, isSunday } from 'date-fns';

// 1. CONFIGURATION
const RESTRICTED_ZONES = {
  MORNING: { start: 450, end: 570 },  // 07:30 - 09:30
  EVENING: { start: 990, end: 1170 }, // 16:30 - 19:30
};

// --- HELPERS ---
export const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const fromMins = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// --- MASTER WEEK DATA HELPER ---
export const getWeekData = (slots: any[], weekOffset: number = 0) => {
  // 1. Generate the raw Date objects (Monday to Sunday)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + diffToMonday + i + (weekOffset * 7));
    return d;
  });

  // 2. Format them to 'YYYY-MM-DD' strings for database matching
  const weekDates = days.map(d => 
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  );

  // 3. Filter and categorize the slots
  const slotsThisWeek = slots.filter(s => weekDates.includes(s.date));
  
  return {
    days,        // Array of Date objects (for rendering UI headers)
    weekDates,   // Array of strings (for internal matching logic)
    stats: {     // The categorized slots
      all: slotsThisWeek,
      hasSlots: slotsThisWeek.length > 0,
      drafts: slotsThisWeek.filter(s => s.status === 'Draft'),
      open: slotsThisWeek.filter(s => s.status === 'Open'),
      blocked: slotsThisWeek.filter(s => s.status === 'Blocked'),
      booked: slotsThisWeek.filter(s => s.status === 'Booked'),
      unbooked: slotsThisWeek.filter(s => s.status !== 'Booked')
    }
  };
};

// --- SMART START TIME LOGIC ---
export function getSmartStartTime(clickedHour: number, daySlots: any[], duration: number) {
    const hourStartMins = clickedHour * 60;
    const hourEndMins = hourStartMins + 60;
    
    // 1. Gather all potential start times in this hour block
    // We always want to check the absolute top of the hour first
    const candidates = [hourStartMins];
    
    for (const slot of daySlots) {
        const endMins = toMins(slot.endTime);
        
        if (endMins >= hourStartMins && endMins < hourEndMins) {
            candidates.push(endMins);
        }
    }
    
    // Sort them from earliest to latest so it checks the top of the hour first
    candidates.sort((a, b) => a - b);
    
    // 2. Find the first candidate that doesn't overlap with anything
    for (const proposedStart of candidates) {
        const proposedEnd = proposedStart + duration;
        let hasOverlap = false;
        
        for (const slot of daySlots) {
            const slotStart = toMins(slot.time);
            const slotEnd = toMins(slot.endTime);
            
            // Strict Overlap Check
            if (proposedStart < slotEnd && proposedEnd > slotStart) {
                hasOverlap = true;
                break;
            }
        }
        
        // If this exact minute is completely free, use it!
        if (!hasOverlap) {
            const h = Math.floor(proposedStart / 60);
            const m = proposedStart % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }
    
    // Fallback: If the entire hour is completely jammed, default to the top of the hour
    return `${String(clickedHour).padStart(2, '0')}:00`;
}

// --- EXISTING VALIDATOR ---
export const checkSlotValidity = (
  dateStr: string,
  timeStr: string,
  duration: number,
  existingSlots: any[],
  currentSlotId?: string,
  holidays: Record<string, string> = {} // [NEW] Accept holidays dictionary
): { valid: boolean; error?: string } => {
  if (!dateStr || !timeStr) return { valid: false, error: "Invalid Date/Time" };

  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  const startMins = toMins(timeStr);
  const endMins = startMins + duration;

  if (startMins < 360) return { valid: false, error: "Too Early (Before 06:00)" };
  if (endMins > 1410) return { valid: false, error: "Too Late (After 23:30)" };

  const isHoliday = !!holidays[dateStr]; // [NEW] Check if it's a holiday
  const isSat = isSaturday(date);
  
  // [NEW] It's only restricted if it's NOT Sunday AND NOT a holiday!
  const isRestrictedDay = !isSunday(date) && !isHoliday; 

  if (isRestrictedDay) {
    const hitsMorning = startMins < RESTRICTED_ZONES.MORNING.end && endMins > RESTRICTED_ZONES.MORNING.start;
    const hitsEvening = !isSat && (startMins < RESTRICTED_ZONES.EVENING.end && endMins > RESTRICTED_ZONES.EVENING.start);

    if (hitsMorning) return { valid: false, error: "⚠️ Restricted: Morning Zone (07:30-09:30)" };
    if (hitsEvening) return { valid: false, error: "⚠️ Restricted: Evening Zone (16:30-19:30)" };
  }

  const daySlots = existingSlots.filter(s => s.date === dateStr && s.id !== currentSlotId);
  const hasCollision = daySlots.some(s => {
    const sStart = toMins(s.time);
    const sEnd = toMins(s.endTime);
    return startMins < sEnd && endMins > sStart;
  });

  if (hasCollision) return { valid: false, error: "Time Collision detected" };
  return { valid: true };
};