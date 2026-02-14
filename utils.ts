import { differenceInDays, addDays, format, isSameDay, isAfter, isBefore, startOfDay, max, parseISO } from 'date-fns';
import { DayData, Memory, MoodOption, Theme } from './types';

export const START_DATE = new Date(2024, 5, 20); // June 20, 2024
export const TARGET_END_DATE = new Date(2026, 1, 11); // Feb 11, 2026

export const COLOR_THEMES = [
    { name: 'rose', class: 'bg-rose-200 text-rose-800', hex: '#fecdd3' },
    { name: 'pink', class: 'bg-pink-200 text-pink-800', hex: '#fbcfe8' },
    { name: 'fuchsia', class: 'bg-fuchsia-200 text-fuchsia-800', hex: '#e879f9' },
    { name: 'purple', class: 'bg-purple-200 text-purple-800', hex: '#e9d5ff' },
    { name: 'violet', class: 'bg-violet-200 text-violet-800', hex: '#ddd6fe' },
    { name: 'indigo', class: 'bg-indigo-200 text-indigo-800', hex: '#c7d2fe' },
    { name: 'blue', class: 'bg-blue-200 text-blue-800', hex: '#bfdbfe' },
    { name: 'sky', class: 'bg-sky-200 text-sky-800', hex: '#bae6fd' },
    { name: 'cyan', class: 'bg-cyan-200 text-cyan-800', hex: '#a5f3fc' },
    { name: 'teal', class: 'bg-teal-200 text-teal-800', hex: '#99f6e4' },
    { name: 'emerald', class: 'bg-emerald-200 text-emerald-800', hex: '#a7f3d0' },
    { name: 'green', class: 'bg-green-200 text-green-800', hex: '#bbf7d0' },
    { name: 'lime', class: 'bg-lime-200 text-lime-800', hex: '#d9f99d' },
    { name: 'yellow', class: 'bg-yellow-200 text-yellow-800', hex: '#fef08a' },
    { name: 'amber', class: 'bg-amber-200 text-amber-800', hex: '#fde68a' },
    { name: 'orange', class: 'bg-orange-200 text-orange-800', hex: '#fed7aa' },
    { name: 'red', class: 'bg-red-200 text-red-800', hex: '#fecaca' },
    { name: 'stone', class: 'bg-stone-200 text-stone-800', hex: '#e7e5e4' },
    { name: 'slate', class: 'bg-slate-200 text-slate-800', hex: '#e2e8f0' },
];

export const DEFAULT_MOODS: MoodOption[] = [
    { label: '喜悦', colorClass: 'bg-yellow-200 text-yellow-800', baseColor: 'yellow' },
    { label: '平静', colorClass: 'bg-blue-200 text-blue-800', baseColor: 'blue' },
    { label: '忧郁', colorClass: 'bg-indigo-200 text-indigo-800', baseColor: 'indigo' },
    { label: '兴奋', colorClass: 'bg-rose-200 text-rose-800', baseColor: 'rose' },
    { label: '惬意', colorClass: 'bg-orange-200 text-orange-800', baseColor: 'orange' },
    { label: '被爱', colorClass: 'bg-pink-200 text-pink-800', baseColor: 'pink' },
    { label: '平淡', colorClass: 'bg-slate-200 text-slate-800', baseColor: 'slate' },
];

export const THEMES: Theme[] = [
    {
        id: 'nebula',
        name: 'Pink Nebula',
        background: 'linear-gradient(135deg, #89c1f5 0%, #d8bceb 50%, #f2a8c3 100%)',
        primaryColor: 'text-plum-900',
        secondaryColor: 'text-plum-900/60',
        fadedColor: 'text-plum-900/40',
        glassColor: 'bg-white/40',
        accentButton: 'bg-plum-600 hover:bg-plum-700 text-white',
        accentMuted: 'text-plum-600 border-plum-200',
        accentPlaceholder: 'placeholder:text-plum-400',
        tooltipClass: 'bg-plum-900/85 text-white backdrop-blur-sm',
        accentCheckbox: 'accent-plum-600'
    },
    {
        id: 'midnight',
        name: 'Starry Night',
        background: 'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #4c1d95 100%)',
        primaryColor: 'text-white',
        secondaryColor: 'text-white/60',
        fadedColor: 'text-white/40',
        glassColor: 'bg-slate-900/40',
        accentButton: 'bg-indigo-500 hover:bg-indigo-600 text-white',
        accentMuted: 'text-white/70 border-white/30',
        accentPlaceholder: 'placeholder:text-white/50',
        panelPrimaryColor: 'text-slate-900',
        panelSecondaryColor: 'text-slate-700',
        panelFadedColor: 'text-slate-600',
        panelPlaceholder: 'placeholder:text-slate-500',
        tooltipClass: 'bg-indigo-950/90 text-white backdrop-blur-sm',
        accentCheckbox: 'accent-indigo-500'
    },
    {
        id: 'sunset',
        name: 'Warm Sunset',
        background: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
        primaryColor: 'text-orange-950',
        secondaryColor: 'text-orange-950/60',
        fadedColor: 'text-orange-950/40',
        glassColor: 'bg-white/40',
        accentButton: 'bg-orange-500 hover:bg-orange-600 text-white',
        accentMuted: 'text-orange-700 border-orange-200',
        accentPlaceholder: 'placeholder:text-orange-500',
        tooltipClass: 'bg-orange-900/85 text-white backdrop-blur-sm',
        accentCheckbox: 'accent-orange-500'
    },
    {
        id: 'aurora',
        name: 'Aurora',
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        primaryColor: 'text-teal-900',
        secondaryColor: 'text-teal-900/60',
        fadedColor: 'text-teal-900/40',
        glassColor: 'bg-white/40',
        accentButton: 'bg-teal-500 hover:bg-teal-600 text-white',
        accentMuted: 'text-teal-700 border-teal-200',
        accentPlaceholder: 'placeholder:text-teal-500',
        tooltipClass: 'bg-teal-900/85 text-white backdrop-blur-sm',
        accentCheckbox: 'accent-teal-500'
    },
    {
        id: 'deep-space',
        name: 'Deep Space',
        background: 'linear-gradient(to top, #09203f 0%, #537895 100%)',
        primaryColor: 'text-sky-100',
        secondaryColor: 'text-sky-100/60',
        fadedColor: 'text-sky-100/40',
        glassColor: 'bg-slate-900/30',
        accentButton: 'bg-sky-500 hover:bg-sky-600 text-white',
        accentMuted: 'text-sky-200/80 border-white/20',
        accentPlaceholder: 'placeholder:text-sky-300',
        panelPrimaryColor: 'text-slate-900',
        panelSecondaryColor: 'text-slate-700',
        panelFadedColor: 'text-slate-600',
        panelPlaceholder: 'placeholder:text-slate-500',
        tooltipClass: 'bg-slate-800/90 text-sky-50 backdrop-blur-sm',
        accentCheckbox: 'accent-sky-500'
    }
];

export const generateTimelineDays = (memories: Record<string, Memory>, startDate: Date = START_DATE): DayData[] => {
    const today = startOfDay(new Date());
    const baseStart = startOfDay(startDate);

    // 1. Start with the target end date
    let endDate = TARGET_END_DATE;

    // 2. If today is later, extend to today
    if (isAfter(today, endDate)) {
        endDate = today;
    }

    // 3. If there are memories later than that, extend to them
    const memoryKeys = Object.keys(memories);
    if (memoryKeys.length > 0) {
        const validDates = memoryKeys
            .map(d => parseISO(d))
            .filter(d => !isNaN(d.getTime()));
            
        if (validDates.length > 0) {
            const lastMemoryDate = max(validDates);
            if (isAfter(lastMemoryDate, endDate)) {
                endDate = lastMemoryDate;
            }
        }
    }

    const totalDays = differenceInDays(endDate, baseStart) + 1;
    const days: DayData[] = [];

    for (let i = 0; i < totalDays; i++) {
        const currentDate = addDays(baseStart, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        days.push({
            date: currentDate,
            dateStr,
            isToday: isSameDay(currentDate, today),
            isPast: isBefore(currentDate, today),
            isFuture: isAfter(currentDate, today),
            hasMemory: !!memories[dateStr],
            memory: memories[dateStr]
        });
    }
    return days;
};

/** 合并视图：生成带「我的」与「伴侣」记忆的时间线（同一天可能两者都有） */
export const generateTimelineDaysWithPartner = (
    memories: Record<string, Memory>,
    partnerMemories: Record<string, Memory>,
    startDate: Date = START_DATE
): DayData[] => {
    const today = startOfDay(new Date());
    const baseStart = startOfDay(startDate);
    let endDate = TARGET_END_DATE;
    if (isAfter(today, endDate)) endDate = today;
    const allKeys = new Set([...Object.keys(memories), ...Object.keys(partnerMemories)]);
    if (allKeys.size > 0) {
        const validDates = [...allKeys]
            .map(d => parseISO(d))
            .filter(d => !isNaN(d.getTime()));
        if (validDates.length > 0) {
            const last = max(validDates);
            if (isAfter(last, endDate)) endDate = last;
        }
    }
    const totalDays = differenceInDays(endDate, baseStart) + 1;
    const days: DayData[] = [];
    for (let i = 0; i < totalDays; i++) {
        const currentDate = addDays(baseStart, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const mine = memories[dateStr];
        const partner = partnerMemories[dateStr];
        days.push({
            date: currentDate,
            dateStr,
            isToday: isSameDay(currentDate, today),
            isPast: isBefore(currentDate, today),
            isFuture: isAfter(currentDate, today),
            hasMemory: !!mine || !!partner,
            memory: mine,
            partnerMemory: partner,
        });
    }
    return days;
};

export const formatDateDisplay = (date: Date): string => {
    return format(date, 'MMMM d, yyyy');
};

export const getDayIndex = (date: Date, baseStart: Date = START_DATE): number => {
    return differenceInDays(date, startOfDay(baseStart)) + 1;
}

// Helper to convert file or blob to base64
export const fileToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Helper to convert data URL (base64) back to Blob
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64] = dataUrl.split(',');
  const match = header.match(/data:(.*?);base64/);
  const mime = match ? match[1] : 'application/octet-stream';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

