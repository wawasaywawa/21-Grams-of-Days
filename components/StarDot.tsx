import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DayData, MoodOption } from '../types';
import { format } from 'date-fns';

interface StarDotProps {
    day: DayData;
    onClick: (day: DayData) => void;
    index: number;
    moodOptions: MoodOption[];
}

export const StarDot: React.FC<StarDotProps> = ({ day, onClick, index, moodOptions }) => {
    
    // Determine visual state
    const isMemory = day.hasMemory;
    const isToday = day.isToday;
    
    // Base classes
    // Increased opacity from 0.4 to 0.7 for better visibility on darker bg
    // Added star-glow-base for the "light halo" effect requested
    let bgClass = 'bg-white/70 star-glow-base'; 
    let glowClass = '';
    let scale = 1;

    // Helper to map base colors to specific Tailwind classes for dot and shadow
    const getMoodColorClass = (baseColor: string): string => {
        switch (baseColor) {
            case 'rose': return 'bg-rose-400 shadow-[0_0_12px_2px_rgba(251,113,133,0.7)]';
            case 'pink': return 'bg-pink-400 shadow-[0_0_12px_2px_rgba(244,114,182,0.7)]';
            case 'fuchsia': return 'bg-fuchsia-400 shadow-[0_0_12px_2px_rgba(232,121,249,0.7)]';
            case 'purple': return 'bg-purple-400 shadow-[0_0_12px_2px_rgba(192,132,252,0.7)]';
            case 'violet': return 'bg-violet-400 shadow-[0_0_12px_2px_rgba(167,139,250,0.7)]';
            case 'indigo': return 'bg-indigo-400 shadow-[0_0_12px_2px_rgba(129,140,248,0.7)]';
            case 'blue': return 'bg-blue-400 shadow-[0_0_12px_2px_rgba(96,165,250,0.7)]';
            case 'sky': return 'bg-sky-400 shadow-[0_0_12px_2px_rgba(56,189,248,0.7)]';
            case 'cyan': return 'bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.7)]';
            case 'teal': return 'bg-teal-400 shadow-[0_0_12px_2px_rgba(45,212,191,0.7)]';
            case 'emerald': return 'bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]';
            case 'green': return 'bg-green-400 shadow-[0_0_12px_2px_rgba(74,222,128,0.7)]';
            case 'lime': return 'bg-lime-400 shadow-[0_0_12px_2px_rgba(163,230,53,0.7)]';
            case 'yellow': return 'bg-yellow-400 shadow-[0_0_12px_2px_rgba(250,204,21,0.7)]';
            case 'amber': return 'bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.7)]';
            case 'orange': return 'bg-orange-400 shadow-[0_0_12px_2px_rgba(251,146,60,0.7)]';
            case 'red': return 'bg-red-400 shadow-[0_0_12px_2px_rgba(248,113,113,0.7)]';
            case 'stone': return 'bg-stone-400 shadow-[0_0_12px_2px_rgba(168,162,158,0.7)]';
            case 'slate': return 'bg-slate-400 shadow-[0_0_12px_2px_rgba(148,163,184,0.7)]';
            default: return 'bg-rose-400 shadow-[0_0_12px_2px_rgba(251,113,133,0.7)]';
        }
    };

    if (isMemory) {
        const moodName = day.memory?.mood;
        const moodOpt = moodOptions.find(m => m.label === moodName);
        const baseColor = moodOpt?.baseColor || 'rose';
        
        bgClass = getMoodColorClass(baseColor);
        // We removed 'star-glow-active' here because we are applying specific shadow color in the bgClass
        glowClass = '';
        scale = 1.3; // Slightly larger for emphasis
    }
    
    if (isToday) {
        bgClass = 'bg-amber-200';
        glowClass = 'star-glow-gold animate-pulse-slow';
        scale = 1.5;
    }

    // Generate a pseudo-random delay based on index for the breathing animation
    // to avoid all stars pulsing in sync
    const animationDelay = useMemo(() => Math.random() * 5, []);

    return (
        <motion.div
            layoutId={`star-${day.dateStr}`}
            className="relative group cursor-pointer"
            onClick={() => onClick(day)}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: scale }}
            transition={{ duration: 0.5, delay: index * 0.002 }}
            whileHover={{ scale: scale * 1.5, zIndex: 10 }}
        >
            {/* The actual dot */}
            <motion.div
                className={`w-2 h-2 rounded-full transition-colors duration-500 ${bgClass} ${glowClass}`}
                animate={
                    // Animate opacity for a twinkling effect
                    {
                        opacity: isMemory || isToday ? [0.8, 1, 0.8] : [0.5, 0.8, 0.5],
                        scale: isMemory || isToday ? [1, 1.1, 1] : [1, 1.05, 1],
                    }
                }
                transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: animationDelay,
                    ease: "easeInOut"
                }}
            />

            {/* Hover Tooltip - Minimal */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 w-max">
                <div className="bg-plum-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full shadow-lg font-sans tracking-wide">
                    {format(day.date, 'MMM d')}
                    {day.hasMemory && <span className="mx-1">•</span>}
                    {day.hasMemory && <span className="italic opacity-80">{day.memory?.mood}</span>}
                </div>
            </div>
        </motion.div>
    );
};