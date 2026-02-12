export interface Memory {
    dateStr: string; // ISO format YYYY-MM-DD
    title: string;
    description: string;
    imageUrl?: string; // Legacy: Single image support
    images?: string[]; // New: Multiple images support (Max 4)
    voiceNoteUrl?: string; // Mock URL for now
    mood: string; // Changed from fixed MoodType to string to support custom moods
    tags: string[];
}

// Removing fixed MoodType in favor of dynamic MoodOption
// export type MoodType = 'Joy' | 'Calm' | 'Melancholy' | 'Excited' | 'Cozy' | 'Loved' | 'Neutral';

export interface MoodOption {
    label: string;
    colorClass: string; // e.g., "bg-rose-200 text-rose-800"
    baseColor: string; // e.g., "rose" (for UI selection reference)
}

export interface DayData {
    date: Date;
    dateStr: string;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
    hasMemory: boolean;
    memory?: Memory;
    /** 合并视图下伴侣当天的记忆（仅当有伴侣且为合并模式时存在） */
    partnerMemory?: Memory;
}

export interface Theme {
    id: string;
    name: string;
    background: string;
    primaryColor: string;
    secondaryColor: string;
    fadedColor: string;
    glassColor: string;
    /** 主按钮：bg + hover + text，如 bg-plum-600 hover:bg-plum-700 text-white */
    accentButton: string;
    /** 次要文字/边框，如 text-plum-600 border-plum-200 */
    accentMuted: string;
    /** 占位符，如 placeholder:text-plum-400 */
    accentPlaceholder: string;
    /** 玻璃面板内文字色（深色主题下便当盒内用深字），可选 */
    panelPrimaryColor?: string;
    panelSecondaryColor?: string;
    panelFadedColor?: string;
    panelPlaceholder?: string;
    /** 时间点悬停弹窗样式，如 bg-plum-900/80 text-white */
    tooltipClass?: string;
    /** 复选框勾选色，如 accent-plum-600 */
    accentCheckbox?: string;
}