import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayData, Memory, MoodOption, Theme } from './types';
import { generateTimelineDays, START_DATE, DEFAULT_MOODS, THEMES } from './utils';
import { StarGrid } from './components/StarGrid';
import { BentoView } from './components/BentoView';
import { ShareModal } from './components/ShareModal';
import { Heart, Palette, Check, Share2 } from 'lucide-react';
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
    const [isShareOpen, setIsShareOpen] = useState(false);

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

        try {
            setMemories(updatedMemories);
            localStorage.setItem('21months_memories', JSON.stringify(updatedMemories));
            
            // Update selected day to reflect changes immediately
            setSelectedDay({
                ...day,
                hasMemory: true,
                memory: newMemory
            });
        } catch (e) {
            alert("保存失败：可能是图片太大导致存储空间不足。请尝试减少图片数量。");
            console.error("Storage error", e);
        }
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

    // EXPORT Data
    const handleExport = () => {
        const data = {
            memories,
            moodOptions,
            exportedAt: new Date().toISOString(),
            appVersion: '1.0'
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `21months_memories_${format(new Date(), 'yyyyMMdd')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // IMPORT Data & MERGE
    const handleImport = async (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target?.result as string);
                    if (!importedData || !importedData.memories) {
                        throw new Error("Invalid file format");
                    }

                    const remoteMemories = importedData.memories as Record<string, Memory>;
                    const mergedMemories = { ...memories };
                    
                    // Merge Logic
                    Object.keys(remoteMemories).forEach(dateStr => {
                        const remote = remoteMemories[dateStr];
                        const local = mergedMemories[dateStr];

                        if (!local) {
                            // Case 1: Only remote exists -> Add it
                            mergedMemories[dateStr] = remote;
                        } else {
                            // Case 2: Conflict -> Smart Merge
                            // Don't merge if they are effectively identical
                            if (local.description === remote.description && local.title === remote.title) {
                                return; 
                            }

                            // Title Merge
                            const newTitle = local.title === remote.title 
                                ? local.title 
                                : `${local.title} & ${remote.title}`;
                            
                            // Description Merge
                            // Use a separator to distinguish users
                            const newDescription = `${local.description}\n\n———— ✦ ————\n\n${remote.description}`;

                            // Image Merge (Deduplicate based on base64 string content)
                            const localImages = local.images || (local.imageUrl ? [local.imageUrl] : []);
                            const remoteImages = remote.images || (remote.imageUrl ? [remote.imageUrl] : []);
                            const uniqueImages = Array.from(new Set([...localImages, ...remoteImages]));

                            // Mood: Keep Local to maintain color scheme consistency, or prioritize user choice
                            // We stick to local mood for now, as UI only allows one.

                            mergedMemories[dateStr] = {
                                ...local,
                                title: newTitle,
                                description: newDescription,
                                images: uniqueImages,
                                imageUrl: uniqueImages.length > 0 ? uniqueImages[0] : undefined,
                                // Use local voice note if exists, otherwise try remote
                                voiceNoteUrl: local.voiceNoteUrl || remote.voiceNoteUrl 
                            };
                        }
                    });

                    // Merge Moods (Optional: Add custom moods from partner)
                    if (importedData.moodOptions) {
                        const remoteMoods = importedData.moodOptions as MoodOption[];
                        const currentMoodLabels = new Set(moodOptions.map(m => m.label));
                        const newMoodsToAdd = remoteMoods.filter(rm => !currentMoodLabels.has(rm.label));
                        
                        if (newMoodsToAdd.length > 0) {
                            const mergedMoods = [...moodOptions, ...newMoodsToAdd];
                            setMoodOptions(mergedMoods);
                            localStorage.setItem('21months_moods', JSON.stringify(mergedMoods));
                        }
                    }

                    // Save Final Merged State
                    setMemories(mergedMemories);
                    localStorage.setItem('21months_memories', JSON.stringify(mergedMemories));
                    resolve();

                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
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
                        <h1 className={`font-serif text-4xl md:text-5xl font-medium tracking-tight ${currentTheme.primaryColor} transition-colors duration-500`}>21 Grams of Days</h1>
                    </motion.div>
                </div>
                
                <div className="pointer-events-auto flex items-start gap-4">
                     {/* Share / Sync Button */}
                     <button 
                        onClick={() => setIsShareOpen(true)}
                        className={`p-2 rounded-full backdrop-blur-md transition-all ${currentTheme.glassColor} ${currentTheme.primaryColor} hover:bg-white/60 hover:scale-105 active:scale-95`}
                        title="交换/合并记忆"
                     >
                        <Share2 size={20} />
                     </button>

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

            {/* Share Modal Overlay */}
            <AnimatePresence>
                {isShareOpen && (
                    <ShareModal 
                        onClose={() => setIsShareOpen(false)}
                        onExport={handleExport}
                        onImport={handleImport}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

export default App;