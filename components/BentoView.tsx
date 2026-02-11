import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayData, MoodOption } from '../types';
import { formatDateDisplay, getDayIndex } from '../utils';
import { X, Play, Pause, Edit2, Mic, Calendar } from 'lucide-react';
import { EditModal } from './EditModal';

interface BentoViewProps {
    day: DayData;
    moodOptions: MoodOption[];
    onAddMood: (mood: MoodOption) => void;
    onClose: () => void;
    onSaveMemory: (day: DayData, memoryData: any) => void;
}

export const BentoView: React.FC<BentoViewProps> = ({ day, moodOptions, onAddMood, onClose, onSaveMemory }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const dayIndex = getDayIndex(day.date);
    
    // Default content if no memory exists
    const title = day.memory?.title || "安静的一天";
    const description = day.memory?.description || "这天没有特别的记录，只是我们漫长星河中的一颗星星。";
    
    // Normalize images: favor array, fallback to imageUrl, default to empty array (no placeholder)
    const images = (day.memory?.images && day.memory.images.length > 0) 
        ? day.memory.images 
        : (day.memory?.imageUrl ? [day.memory.imageUrl] : []);

    const mood = day.memory?.mood || '平淡';
    const voiceNoteUrl = day.memory?.voiceNoteUrl;
    
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
            <div className="absolute inset-0 bg-plum-950/20 backdrop-blur-md" onClick={onClose} />

            <motion.div 
                layoutId={`star-${day.dateStr}`}
                className="relative w-full max-w-5xl aspect-[4/5] md:aspect-[16/9] glass-panel rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors text-plum-900"
                >
                    <X size={24} />
                </button>

                {/* Edit Trigger (Hidden/Subtle) */}
                <button
                    onClick={() => setIsEditing(true)}
                    className="absolute bottom-6 right-6 z-20 p-3 rounded-full bg-white/20 hover:bg-white/40 transition-colors text-plum-900 opacity-50 hover:opacity-100"
                    title="Edit Memory"
                >
                    <Edit2 size={18} />
                </button>

                {/* BENTO GRID LAYOUT */}
                <div className="w-full h-full p-6 md:p-8 grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 md:gap-6 overflow-y-auto md:overflow-hidden custom-scrollbar">
                    
                    {/* 1. Date Anchor (Top Left) */}
                    <div className="md:col-span-1 md:row-span-1 glass-card rounded-3xl p-6 flex flex-col justify-center overflow-hidden">
                        <motion.h2 
                            custom={0.3}
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            className="text-3xl font-serif text-plum-900 italic leading-none"
                        >
                            {formatDateDisplay(day.date).split(',')[0]}
                        </motion.h2>
                        <motion.span 
                            custom={0.4}
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            className="text-lg font-serif text-plum-900/60 mt-1"
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
                            className="text-xs font-bold uppercase tracking-widest text-plum-600 mb-3 flex items-center gap-2"
                        >
                             记录
                        </motion.h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <motion.h4 
                                custom={0.5}
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                className="font-serif text-xl mb-3 text-plum-900"
                            >
                                {title}
                            </motion.h4>
                            <motion.p 
                                custom={0.6}
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                className="font-sans text-sm leading-relaxed text-plum-800/80 whitespace-pre-wrap"
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
                                className="text-[10px] font-bold tracking-widest text-plum-600 uppercase"
                            >
                                DAY OF JOURNEY
                            </motion.span>
                            <motion.div 
                                custom={0.6}
                                variants={contentVariants}
                                initial="hidden"
                                animate="visible"
                                className="text-5xl md:text-6xl font-serif text-plum-900 mt-2"
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
                                        className="w-12 h-12 rounded-full bg-plum-600 hover:bg-plum-700 text-white flex items-center justify-center flex-shrink-0 transition-all shadow-lg shadow-plum-600/20"
                                    >
                                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <div className="flex-1 flex items-center gap-1 h-8">
                                        {bars.map((i) => (
                                            <motion.div
                                                key={i}
                                                className="flex-1 bg-plum-400/50 rounded-full"
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
                                    className="flex flex-col items-center justify-center gap-2 text-plum-600 hover:text-plum-800 transition-colors group w-full h-full"
                                >
                                    <div className="p-3 rounded-full bg-plum-100 group-hover:bg-plum-200 transition-colors shadow-inner">
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