import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayData, MoodOption, Theme } from '../types';
import { formatDateDisplay, getDayIndex } from '../utils';
import { X, Play, Pause, Edit2, Mic, Calendar } from 'lucide-react';
import { EditModal } from './EditModal';

interface BentoViewProps {
    day: DayData;
    moodOptions: MoodOption[];
    theme: Theme;
    partnerDisplayName: string;
    onAddMood: (mood: MoodOption) => void;
    onClose: () => void;
    onSaveMemory: (day: DayData, memoryData: any) => void;
    isMergeView?: boolean;
}

export const BentoView: React.FC<BentoViewProps> = ({ day, moodOptions, theme, partnerDisplayName, onAddMood, onClose, onSaveMemory, isMergeView = false }) => {
    const pPrimary = theme.panelPrimaryColor ?? theme.primaryColor;
    const pSecondary = theme.panelSecondaryColor ?? theme.secondaryColor;
    const pFaded = theme.panelFadedColor ?? theme.fadedColor;
    const [isPlaying, setIsPlaying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'mine' | 'partner'>('mine');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const dayIndex = getDayIndex(day.date);
    const showMerge = isMergeView && (day.memory || day.partnerMemory);
    const displayMemory = showMerge
        ? (activeTab === 'mine' ? day.memory : day.partnerMemory)
        : day.memory;

    const title = displayMemory?.title || "安静的一天";
    const description = displayMemory?.description || "这天没有特别的记录，只是我们漫长星河中的一颗星星。";
    const images = (displayMemory?.images && displayMemory.images.length > 0)
        ? displayMemory.images
        : (displayMemory?.imageUrl ? [displayMemory.imageUrl] : []);
    const mood = displayMemory?.mood || '平淡';
    const voiceNoteUrl = displayMemory?.voiceNoteUrl;
    
    // Resolve Mood Color
    const moodOption = moodOptions.find(m => m.label === mood);
    const moodColorClass = moodOption ? moodOption.colorClass : 'bg-slate-200 text-slate-800';

    // Waveform simulation
    const bars = Array.from({ length: 20 }, (_, i) => i);

    // Reset playing state if day changes or voice note changes
    useEffect(() => {
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [day.dateStr, voiceNoteUrl]);

    const togglePlay = () => {
        if (!voiceNoteUrl || !audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Animation Variants
    const contentVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: (delay: number) => ({
            opacity: 1, 
            y: 0,
            transition: { 
                delay: delay, 
                duration: 0.5,
                ease: "easeOut"
            }
        })
    };

    // Helper to render photo grid based on count
    const renderPhotoGrid = () => {
        const count = images.length;
        
        // Gradient Placeholder for 0 images (Pure Color Gradient)
        if (count === 0) {
            return (
                <motion.div 
                    className="w-full h-full rounded-2xl shadow-inner overflow-hidden relative bg-gradient-to-br from-rose-100 via-purple-100 to-indigo-100"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                />
            );
        }

        // Base container styles
        const containerClass = "w-full h-full bg-white rounded-2xl shadow-inner overflow-hidden relative grid gap-1";
        
        let gridClass = "";
        if (count === 1) gridClass = "grid-cols-1 grid-rows-1";
        else if (count === 2) gridClass = "grid-cols-1 grid-rows-2";
        else if (count === 3) gridClass = "grid-cols-2 grid-rows-2";
        else gridClass = "grid-cols-2 grid-rows-2";

        return (
            <motion.div 
                className={`${containerClass} ${gridClass}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                {images.map((img, index) => {
                    let itemClass = "w-full h-full object-cover transition-transform duration-700 hover:scale-105";
                    let wrapperClass = "relative overflow-hidden";
                    
                    // Specific span logic for odd layouts
                    if (count === 3 && index === 0) {
                        wrapperClass += " col-span-2"; // First image takes top half
                    }

                    return (
                        <div key={index} className={wrapperClass}>
                            <img src={img} alt={`Memory ${index}`} className={itemClass} />
                        </div>
                    );
                })}

                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-6 pointer-events-none">
                    <p className="text-white/90 font-serif italic text-sm">定格瞬间</p>
                </div>
            </motion.div>
        );
    };

    return (
        <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={onClose} />

            <motion.div 
                layoutId={`star-${day.dateStr}`}
                className="relative w-full max-w-5xl aspect-[4/5] md:aspect-[16/9] glass-panel rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 顶部栏：关闭按钮 + 我的/ta的 Tab，避免与便当格重叠 */}
                <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 md:px-6 md:py-4 border-b border-white/20">
                    <div className="flex items-center gap-2">
                        {showMerge && (
                            <>
                                <button
                                    onClick={() => setActiveTab('mine')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${activeTab === 'mine' ? 'bg-white/80 shadow ' + theme.primaryColor : 'bg-white/30 ' + theme.secondaryColor}`}
                                >
                                    我的
                                </button>
                                <button
                                    onClick={() => setActiveTab('partner')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${activeTab === 'partner' ? 'bg-white/80 shadow ' + theme.primaryColor : 'bg-white/30 ' + theme.secondaryColor}`}
                                >
                                    {partnerDisplayName}的
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {(!showMerge || activeTab === 'mine') && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className={`p-2 rounded-full ${theme.glassColor} hover:bg-white/40 transition-colors ${theme.primaryColor}`}
                                title="Edit Memory"
                                aria-label="编辑"
                            >
                                <Edit2 size={18} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                                className={`p-2 rounded-full ${theme.glassColor} hover:bg-white/40 transition-colors ${theme.primaryColor}`}
                                        aria-label="关闭"
                                    >
                                        <X size={22} />
                        </button>
                    </div>
                </div>

                {/* BENTO GRID LAYOUT */}
                <div className="flex-1 min-h-0 p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 md:gap-6 overflow-y-auto md:overflow-hidden custom-scrollbar">
                    
                    {/* 1. Date Anchor (Top Left) */}
                    <div className="md:col-span-1 md:row-span-1 glass-card rounded-3xl p-6 flex flex-col justify-center overflow-hidden">
                        <motion.h2 
                            custom={0.3}
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            className={`text-3xl font-serif ${pPrimary} italic leading-none`}
                        >
                            {formatDateDisplay(day.date).split(',')[0]}
                        </motion.h2>
                        <motion.span 
                            custom={0.4}
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            className={`text-lg font-serif ${pSecondary} mt-1`}
                        >
                            {formatDateDisplay(day.date).split(',')[1]}
                        </motion.span>
                    </div>

                    {/* 2. Photo Block (Large Center) */}
                    <div className="md:col-span-2 md:row-span-3 glass-card rounded-3xl p-3 relative group overflow-hidden">
                        {renderPhotoGrid()}
                    </div>

                    {/* 3. Text/Story Block (Right Top) */}
                    <div className="md:col-span-1 md:row-span-2 glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Calendar size={64} />
                        </div>
                        <motion.h3 
                            custom={0.4}
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            className={`text-xs font-bold uppercase tracking-widest ${pFaded} mb-3 flex items-center gap-2`}
                        >
                             记录
                        </motion.h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <motion.h4 
                                custom={0.5}
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                className={`font-serif text-xl mb-3 ${pPrimary}`}
                            >
                                {title}
                            </motion.h4>
                            <motion.p 
                                custom={0.6}
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                className={`font-sans text-sm leading-relaxed ${pSecondary} whitespace-pre-wrap`}
                            >
                                {description}
                            </motion.p>
                        </div>
                    </div>

                    {/* 4. Day Counter (Bottom Left) */}
                    <div className="md:col-span-1 md:row-span-2 glass-card rounded-3xl p-6 flex flex-col justify-between overflow-hidden">
                         <div>
                            <motion.span 
                                custom={0.5}
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                className={`text-[10px] font-bold tracking-widest ${pFaded} uppercase`}
                            >
                                DAY OF JOURNEY
                            </motion.span>
                            <motion.div 
                                custom={0.6}
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                className={`text-5xl md:text-6xl font-serif ${pPrimary} mt-2`}
                            >
                                {dayIndex}
                            </motion.div>
                         </div>
                         <motion.div 
                            custom={0.7}
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex items-center gap-2 mt-4"
                        >
                             <div className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${moodColorClass}`}>
                                 {mood}
                             </div>
                         </motion.div>
                    </div>

                    {/* 5. Audio/Action Block (Bottom Right) */}
                    <div className="md:col-span-1 md:row-span-1 glass-card rounded-3xl p-5 flex items-center justify-center relative overflow-hidden">
                        <motion.div 
                            className="w-full h-full flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            {voiceNoteUrl ? (
                                <div className="flex items-center gap-4 w-full z-10">
                                    <audio 
                                        ref={audioRef} 
                                        src={voiceNoteUrl} 
                                        onEnded={() => setIsPlaying(false)} 
                                        onPause={() => setIsPlaying(false)} 
                                        onPlay={() => setIsPlaying(true)}
                                        className="hidden" 
                                    />
                                    <button 
                                        onClick={togglePlay}
                                        className={`w-12 h-12 rounded-full ${theme.accentButton} flex items-center justify-center flex-shrink-0 transition-all shadow-lg`}
                                    >
                                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <div className="flex-1 flex items-center gap-1 h-8">
                                        {bars.map((i) => (
                                            <motion.div
                                                key={i}
                                                className={`flex-1 rounded-full ${theme.glassColor} opacity-80`}
                                                animate={{ 
                                                    height: isPlaying ? [
                                                        Math.max(10, Math.random() * 100) + '%', 
                                                        Math.max(10, Math.random() * 100) + '%'
                                                    ] : '30%'
                                                }}
                                                transition={{ 
                                                    duration: 0.4, 
                                                    repeat: isPlaying ? Infinity : 0,
                                                    repeatType: "reverse",
                                                    delay: i * 0.05
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className={`flex flex-col items-center justify-center gap-2 ${pSecondary} hover:opacity-90 transition-colors group w-full h-full`}
                                >
                                    <div className="p-3 rounded-full bg-white/50 group-hover:bg-white/70 transition-colors shadow-inner">
                                        <Mic size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">添加语音</span>
                                </button>
                            )}
                        </motion.div>
                    </div>
                </div>
            </motion.div>
            
            <AnimatePresence>
                {isEditing && (
                    <EditModal 
                        day={day} 
                        initialData={day.memory}
                        moodOptions={moodOptions}
                        theme={theme}
                        onAddMood={onAddMood}
                        onClose={() => setIsEditing(false)} 
                        onSave={(data) => {
                            onSaveMemory(day, data);
                            setIsEditing(false);
                        }} 
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};