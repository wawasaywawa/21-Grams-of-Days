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
}

export interface Theme {
    id: string;
    name: string;
    background: string; // CSS background value
    primaryColor: string; // Main text color (e.g., text-plum-900)
    secondaryColor: string; // Subtitle text color (e.g., text-plum-900/60)
    fadedColor: string; // Legend/very subtle text color (e.g., text-plum-900/40)
    glassColor: string; // Base color for glass effects
}