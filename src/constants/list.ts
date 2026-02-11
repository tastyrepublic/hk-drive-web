// src/constants/list.ts

// --- HELPER: Get Label by ID (Safe for Legacy Data) ---
// If the ID isn't found, it returns the value itself (so old string data still shows up).
const getLabel = (list: { id: string, label: string }[], value: string) => {
  if (!value) return '';
  const item = list.find(i => i.id === value);
  return item ? item.label : value;
};

// =========================================
// 1. VEHICLE TYPES
// =========================================
export const VEHICLE_TYPES = [
  { id: '1a', label: 'Private Car (Auto) 1A' },
  { id: '1',  label: 'Private Car (Manual) 1' },
  { id: '2a', label: 'Light Goods (Van) 2A' },
  { id: '2',  label: 'Light Goods (Van) 2' },
  { id: '3a', label: 'Motorcycle (Auto) 3A' },
  { id: '3',  label: 'Motorcycle (Manual) 3' },
  { id: '6',  label: 'Taxi 6' },
];

export const DEFAULT_VEHICLE_ID = '1a';

// Helper to display text in UI
export const getVehicleLabel = (id: string) => getLabel(VEHICLE_TYPES, id);


// =========================================
// 2. EXAM CENTERS
// =========================================
export const EXAM_CENTERS = [
  // Kowloon
  { id: 'tin_kwong',    label: 'Tin Kwong Road (Kowloon)' },
  { id: 'pui_ching',    label: 'Pui Ching Road (Kowloon)' },
  { id: 'chung_yee',    label: 'Chung Yee Street (Kowloon)' },
  { id: 'yau_tong',     label: 'Yau Tong (Kowloon)' },
  { id: 'chak_on',      label: 'Chak On Road (Kowloon)' },
  { id: 'pak_tin',      label: 'Pak Tin (Kowloon)' },
  
  // HK Island
  { id: 'happy_valley', label: 'Happy Valley (HK Island)' },
  { id: 'so_kon_po',    label: 'So Kon Po (HK Island)' },
  { id: 'ap_lei_chau',  label: 'Ap Lei Chau (HK Island - School)' },
  
  // New Territories
  { id: 'wing_hau',     label: 'Wing Hau Street (Kwai Chung)' },
  { id: 'shek_yam',     label: 'Shek Yam (Kwai Chung)' },
  { id: 'shatin_safe',  label: 'Shatin (Safe Driving Center)' },
  { id: 'yuen_long',    label: 'Yuen Long (Safe Driving Center)' },
  { id: 'tsuen_wan',    label: 'Tsuen Wan (Commercial)' },
  
  // Motorcycle
  { id: 'duckling_hill',label: 'Duckling Hill (Tseung Kwan O)' },
];

export const getExamCenterLabel = (id: string) => getLabel(EXAM_CENTERS, id);


// =========================================
// 3. EXAM ROUTES (Linked to Centers)
// =========================================
// Added 'centerId' to link routes to specific exam centers
export const EXAM_ROUTES = [
  // Tin Kwong Road
  { id: 'tk_1', centerId: 'tin_kwong', label: 'Tin Kwong Road' },
  { id: 'tk_2', centerId: 'tin_kwong', label: 'Ma Tau Wai Road' },
  { id: 'tk_3', centerId: 'tin_kwong', label: 'To Kwa Wan Road' },

  // Pui Ching Road
  { id: 'pc_1', centerId: 'pui_ching', label: 'Pui Ching Road' },
  { id: 'pc_2', centerId: 'pui_ching', label: 'Princess Margaret Road' },

  // Happy Valley
  { id: 'hv_1', centerId: 'happy_valley', label: 'Happy Valley' },
  { id: 'hv_2', centerId: 'happy_valley', label: 'Ventris Road' },

  // Loyal Street (Often grouped with Ho Man Tin/Pui Ching)
  { id: 'ls_1', centerId: 'loyal_st',   label: 'Loyal Street' }, 
  
  // Wing Hau Street
  { id: 'wh_1', centerId: 'wing_hau',   label: 'Wing Hau Street' },
  { id: 'wh_2', centerId: 'wing_hau',   label: 'Kwai Shing Circuit' },

  // Chung Yee Street
  { id: 'cy_1', centerId: 'chung_yee',  label: 'Chung Yee Street' },
  { id: 'cy_2', centerId: 'chung_yee',  label: 'Carmel Village Street' },

  // Shek Yam
  { id: 'sy_1', centerId: 'shek_yam',   label: 'Shek Yam' },
  
  // Shatin
  { id: 'st_1', centerId: 'shatin_safe', label: 'Shatin Route 1' },
  { id: 'st_2', centerId: 'shatin_safe', label: 'Shatin Route 2' },

  // Yuen Long
  { id: 'yl_1', centerId: 'yuen_long',  label: 'Yuen Long Route 1' },
  { id: 'yl_2', centerId: 'yuen_long',  label: 'Yuen Long Route 2' },

  // So Kon Po
  { id: 'skp_1', centerId: 'so_kon_po',  label: 'So Kon Po' },
  { id: 'skp_2', centerId: 'so_kon_po',  label: 'Caroline Hill Road' },

  // Yau Tong
  { id: 'yt_1', centerId: 'yau_tong',   label: 'Yau Tong' },
  { id: 'yt_2', centerId: 'yau_tong',   label: 'Ko Chiu Road' },

  // Chak On Road
  { id: 'co_1', centerId: 'chak_on',    label: 'Chak On Road' },

  // Pak Tin
  { id: 'pt_1', centerId: 'pak_tin',    label: 'Pak Tin' },

  // Duckling Hill
  { id: 'dh_1', centerId: 'duckling_hill', label: 'Duckling Hill' },
  
  // Ap Lei Chau
  { id: 'alc_1', centerId: 'ap_lei_chau', label: 'Ap Lei Chau' },
  
  // Tsuen Wan
  { id: 'tw_1', centerId: 'tsuen_wan', label: 'Tsuen Wan' },
];

export const getExamRouteLabel = (id: string) => getLabel(EXAM_ROUTES, id);


// =========================================
// 4. LESSON LOCATIONS
// =========================================
export const LESSON_LOCATIONS = [
  { id: 'kowloon_tong', label: 'Kowloon Tong (MTR)' },
  { id: 'sham_shui_po', label: 'Sham Shui Po' },
  { id: 'nam_cheong',   label: 'Nam Cheong' },
  { id: 'pui_ching',    label: 'Pui Ching' },
  { id: 'happy_valley', label: 'Happy Valley' },
  { id: 'tin_kwong',    label: 'Tin Kwong Road' },
  { id: 'yau_tong',     label: 'Yau Tong' },
  { id: 'shatin',       label: 'Shatin' },
  { id: 'yuen_long',    label: 'Yuen Long' },
  { id: 'tsuen_wan',    label: 'Tsuen Wan' },
];
export const getLessonLocationLabel = (id: string) => getLabel(LESSON_LOCATIONS, id);


// =========================================
// 5. BLOCK REASONS
// =========================================
export const BLOCK_REASONS = [
  { id: 'lunch',       label: 'Lunch' },
  { id: 'personal',    label: 'Personal' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'holiday',     label: 'Holiday' },
  { id: 'diu',         label: 'Diu' },
];
export const getBlockReasonLabel = (id: string) => getLabel(BLOCK_REASONS, id);


// =========================================
// 6. DURATIONS
// =========================================
export const LESSON_DURATIONS = [40, 45, 60];