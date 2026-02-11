import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayData, Memory, MoodOption, Theme } from './types';
import { generateTimelineDays, START_DATE, DEFAULT_MOODS, THEMES } from './utils';
import { StarGrid } from './components/StarGrid';
import { BentoView } from './components/BentoView';
import { Heart, Palette, Check } from 'lucide-react';
import { format } from 'date-fns';

const App: React.FC = () => {
    // State
    const [memories, setMemories] = useState<Record<string, Memory>>({});
    const [moodOptions, setMoodOptions] = useState<MoodOption[]>(DEFAULT_MOODS);
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Theme State
    const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Initial Load
    useEffect(() => {
        // Load Memories
        const storedMemories = localStorage.getItem('21months_memories');
        if (storedMemories) {
            try {
                const parsedMemories: Record<string, Memory> = JSON.parse(storedMemories);
                
                // MIGRATION: Convert old English moods to Chinese defaults if found
                const moodMap: Record<string, string> = {
                    'Joy': '喜悦', 'Calm': '平静', 'Melancholy': '忧郁',
                    'Excited': '兴奋', 'Cozy': '惬意', 'Loved': '被爱', 'Neutral': '平淡'
                };
                
                let hasChanges = false;
                const updatedMemories = { ...parsedMemories };
                
                Object.keys(updatedMemories).forEach(key => {
                    const mem = updatedMemories[key];
                    
                    // Migrate Moods
                    if (moodMap[mem.mood]) {
                        updatedMemories[key] = { ...mem, mood: moodMap[mem.mood] };
                        hasChanges = true;
                    }

                    // Migrate Single Image to Array
                    if (mem.imageUrl && (!mem.images || mem.images.length === 0)) {
                        updatedMemories[key] = { ...mem, images: [mem.imageUrl] };
                        hasChanges = true;
                    }
                });

                setMemories(updatedMemories);
                if (hasChanges) {
                    localStorage.setItem('21months_memories', JSON.stringify(updatedMemories));
                }
            } catch (e) {
                console.error("Failed to parse memories", e);
            }
        }

        // Load Custom Moods
        const storedMoods = localStorage.getItem('21months_moods');
        if (storedMoods) {
            try {
                setMoodOptions(JSON.parse(storedMoods));
            } catch (e) {
                console.error("Failed to parse moods", e);
            }
        }
        
        // Load Theme
        const storedThemeId = localStorage.getItem('21months_theme_id');
        if (storedThemeId) {
            const theme = THEMES.find(t => t.id === storedThemeId);
            if (theme) setCurrentTheme(theme);
        }

        // Simulate a small loading for entrance animation
        setTimeout(() => setIsLoaded(true), 500);
    }, []);

    // Apply Theme to Body
    useEffect(() => {
        document.body.style.background = currentTheme.background;
        document.body.style.backgroundAttachment = 'fixed';
    }, [currentTheme]);

    // Save memory handler
    const handleSaveMemory = (day: DayData, memoryData: Partial<Memory>) => {
        // Ensure we always save images as an array, taking priority over legacy imageUrl
        const finalImages = memoryData.images || (memoryData.imageUrl ? [memoryData.imageUrl] : []);

        const newMemory: Memory = {
            dateStr: day.dateStr,
            title: memoryData.title || 'Untitled',
            description: memoryData.description || '',
            mood: memoryData.mood || '平淡',
            imageUrl: finalImages.length > 0 ? finalImages[0] : undefined, // Keep legacy field populated for safety
            images: finalImages,
            tags: memoryData.tags || [],
            voiceNoteUrl: memoryData.voiceNoteUrl,
        };

        const updatedMemories = {
            ...memories,
            [day.dateStr]: newMemory
        };

        setMemories(updatedMemories);
        localStorage.setItem('21months_memories', JSON.stringify(updatedMemories));
        
        // Update selected day to reflect changes immediately
        setSelectedDay({
            ...day,
            hasMemory: true,
            memory: newMemory
        });
    };

    // Add new mood handler
    const handleAddMood = (newMood: MoodOption) => {
        const updatedMoods = [...moodOptions, newMood];
        setMoodOptions(updatedMoods);
        localStorage.setItem('21months_moods', JSON.stringify(updatedMoods));
    };
    
    // Change Theme Handler
    const handleThemeChange = (theme: Theme) => {
        setCurrentTheme(theme);
        localStorage.setItem('21months_theme_id', theme.id);
        setIsSettingsOpen(false);
    };

    // Derived State: Re-calculate days whenever memories change
    const days = useMemo(() => generateTimelineDays(memories), [memories]);

    // Stats
    const displayEndDate = days.length > 0 ? days[days.length - 1].date : START_DATE;

    return (
        <div className={`min-h-screen w-full relative overflow-x-hidden font-sans selection:bg-rose-200 transition-colors duration-500`}>
            
            {/* Background Texture/Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-40 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150 contrast-150 mix-blend-overlay"></div>
            
            {/* Header */}
            <header className="fixed top-0 left-0 w-full p-6 md:p-10 z-40 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <h1 className={`font-serif text-4xl md:text-5xl font-medium tracking-tight ${currentTheme.primaryColor} transition-colors duration-500`}>21 Months</h1>
                        <p className={`${currentTheme.fadedColor} text-[10px] md:text-xs mt-2 tracking-[0.4em] uppercase font-bold transition-colors duration-500`}>Graduation — Birthday</p>
                    </motion.div>
                </div>
                
                <div className="pointer-events-auto flex items-start gap-4">
                     {/* Theme Toggle Button */}
                     <div className="relative">
                        <button 
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className={`p-2 rounded-full backdrop-blur-md transition-all ${isSettingsOpen ? 'bg-white text-plum-900 shadow-lg' : `${currentTheme.glassColor} ${currentTheme.primaryColor} hover:bg-white/60`}`}
                        >
                            <Palette size={20} />
                        </button>
                        
                        <AnimatePresence>
                            {isSettingsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute right-0 top-full mt-3 w-48 p-3 rounded-2xl bg-white/80 backdrop-blur-xl shadow-xl border border-white/50 flex flex-col gap-2 z-50 origin-top-right"
                                >
                                    <span className="text-[10px] font-bold text-gray-400 uppercase px-1 mb-1">Select Theme</span>
                                    {THEMES.map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => handleThemeChange(theme)}
                                            className={`flex items-center gap-3 w-full p-2 rounded-xl transition-colors hover:bg-white/80 ${currentTheme.id === theme.id ? 'bg-white shadow-sm ring-1 ring-black/5' : ''}`}
                                        >
                                            <div 
                                                className="w-6 h-6 rounded-full shadow-inner border border-black/5" 
                                                style={{ background: theme.background }}
                                            />
                                            <span className={`text-xs font-medium ${currentTheme.id === theme.id ? 'text-gray-900' : 'text-gray-600'}`}>{theme.name}</span>
                                            {currentTheme.id === theme.id && <Check size={12} className="ml-auto text-gray-900" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                     </div>

                     <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="hidden md:block text-right"
                    >
                        <div className={`text-xl font-light font-serif italic mb-1 ${currentTheme.secondaryColor} transition-colors duration-500`}>
                            {format(START_DATE, 'MMM yyyy')} — {format(displayEndDate, 'MMM yyyy')}
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 pt-32 pb-20 min-h-screen flex flex-col items-center justify-center">
                {isLoaded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="w-full"
                    >
                        <StarGrid 
                            days={days} 
                            onDayClick={setSelectedDay}
                            fadedTextColor={currentTheme.fadedColor}
                            moodOptions={moodOptions}
                        />
                    </motion.div>
                )}
            </main>

            {/* Floating Action Button (Decorative mainly, jumps to today) */}
            <div className="fixed bottom-8 right-8 z-40">
                 <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        const today = days.find(d => d.isToday);
                        if (today) setSelectedDay(today);
                    }}
                    className={`w-14 h-14 rounded-full backdrop-blur-md shadow-lg flex items-center justify-center transition-all ${currentTheme.glassColor} border border-white/20 ${currentTheme.primaryColor} hover:bg-white/60`}
                >
                    <Heart size={24} fill="currentColor" className="opacity-80" />
                 </motion.button>
            </div>

            {/* Bento Detail View Overlay */}
            <AnimatePresence>
                {selectedDay && (
                    <BentoView 
                        day={selectedDay} 
                        moodOptions={moodOptions}
                        onAddMood={handleAddMood}
                        onClose={() => setSelectedDay(null)}
                        onSaveMemory={handleSaveMemory}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

export default App;