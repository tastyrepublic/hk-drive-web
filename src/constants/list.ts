// src/constants.ts

// --- VEHICLE TYPES ---
// Codes: 1 (Private Car), 2 (LGV), 3 (Motorcycle), A (Automatic)
export const VEHICLE_TYPES = [
  'Private Car (Auto) 1A',
  'Private Car (Manual) 1',
  'Light Goods (Van) 2A',
  'Light Goods (Van) 2',
  'Motorcycle (Auto) 3A',
  'Motorcycle (Manual) 3',
  'Taxi 6',
];

// --- EXAM CENTERS (Physical Locations) ---
// The official locations where the test starts
export const EXAM_CENTERS = [
  // Kowloon
  'Tin Kwong Road (Kowloon)',
  'Pui Ching Road (Kowloon)',
  'Chung Yee Street (Kowloon)',
  'Yau Tong (Kowloon)',
  'Chak On Road (Kowloon)',
  'Pak Tin (Kowloon)',
  
  // HK Island
  'Happy Valley (HK Island)',
  'So Kon Po (HK Island)',
  'Ap Lei Chau (HK Island - School)', // Designated School
  
  // New Territories
  'Wing Hau Street (Kwai Chung)',
  'Shek Yam (Kwai Chung)',
  'Shatin (Safe Driving Center)', // Designated School
  'Yuen Long (Safe Driving Center)', // Designated School
  'Tsuen Wan (Commercial)',
  
  // Motorcycle Specific
  'Duckling Hill (Tseung Kwan O)',
];

// --- EXAM ROUTES (Practice Areas) ---
// Colloquial names used by instructors/students to describe the route
export const EXAM_ROUTES = [
  'Tin Kwong Road',
  'Happy Valley',
  'Pui Ching Road',
  'Loyal Street',   // Often associated with Pui Ching/Chung Yee
  'Wing Hau Street',
  'Chung Yee Street',
  'Shek Yam',
  'Shatin',
  'Yuen Long',
  'So Kon Po',
  'Yau Tong',
  'Chak On Road',
  'Pak Tin',
  'Duckling Hill',
  'Oil Street'      // Legacy/Occasional
];

// --- LESSON MEETING POINTS ---
// Common places where instructors pick up students
export const LESSON_LOCATIONS = [
  'Kowloon Tong (MTR)',
  'Sham Shui Po',
  'Nam Cheong',
  'Pui Ching',
  'Happy Valley',
  'Tin Kwong Road',
  'Yau Tong',
  'Shatin',
  'Yuen Long',
  'Tsuen Wan',
];