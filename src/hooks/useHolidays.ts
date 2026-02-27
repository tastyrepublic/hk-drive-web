import { useState, useEffect } from 'react';

export function useHolidays() {
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchHolidays() {
      try {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        
        // Fetch both years AT THE SAME TIME (Parallel fetching)
        const [currentYearRes, nextYearRes] = await Promise.all([
            fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/HK`),
            fetch(`https://date.nager.at/api/v3/PublicHolidays/${nextYear}/HK`)
        ]);
        
        if (!currentYearRes.ok || !nextYearRes.ok) {
            throw new Error('Network response was not ok');
        }
        
        const currentData = await currentYearRes.json();
        const nextData = await nextYearRes.json();
        
        // Combine both arrays into one massive list
        const allHolidays = [...currentData, ...nextData];
        
        // Convert the combined array into our fast lookup dictionary
        const holidayMap: Record<string, string> = {};
        allHolidays.forEach((event: any) => {
          holidayMap[event.date] = event.name; 
        });
        
        setHolidays(holidayMap);
      } catch (error) {
        console.error("Failed to fetch HK holidays:", error);
      }
    }

    fetchHolidays();
  }, []);

  return holidays; 
}