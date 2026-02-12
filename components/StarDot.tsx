import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { DayData, MoodOption } from '../types';
import { format } from 'date-fns';

interface StarDotProps {
    day: DayData;
    onClick: (day: DayData) => void;
    index: number;
    moodOptions: MoodOption[];
    tooltipClass?: string;
}

export const StarDot: React.FC<StarDotProps> = ({ day, onClick, index, moodOptions, tooltipClass = 'bg-plum-900/80 text-white backdrop-blur-sm' }) => {
    
    const isMemory = day.hasMemory;
    const isToday = day.isToday;
    const hasBoth = !!(day.memory && day.partnerMemory);

    // 合并视图：颜色取「我的」或「伴侣」的 mood，优先我的
    const displayMemory = day.memory ?? day.partnerMemory;

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

    const getMoodHeartClass = (baseColor: string): string => {
        switch (baseColor) {
            case 'rose': return 'text-rose-400';
            case 'pink': return 'text-pink-400';
            case 'fuchsia': return 'text-fuchsia-400';
            case 'purple': return 'text-purple-400';
            case 'violet': return 'text-violet-400';
            case 'indigo': return 'text-indigo-400';
            case 'blue': return 'text-blue-400';
            case 'sky': return 'text-sky-400';
            case 'cyan': return 'text-cyan-400';
            case 'teal': return 'text-teal-400';
            case 'emerald': return 'text-emerald-400';
            case 'green': return 'text-green-400';
            case 'lime': return 'text-lime-400';
            case 'yellow': return 'text-yellow-400';
            case 'amber': return 'text-amber-400';
            case 'orange': return 'text-orange-400';
            case 'red': return 'text-red-400';
            case 'stone': return 'text-stone-400';
            case 'slate': return 'text-slate-400';
            default: return 'text-rose-400';
        }
    };

    // Glow that follows the heart shape (no boxy shadow)
    const getMoodGlowFilter = (baseColor: string): string => {
        const color = (() => {
            switch (baseColor) {
                case 'rose': return 'rgba(251,113,133,0.75)';
                case 'pink': return 'rgba(244,114,182,0.75)';
                case 'fuchsia': return 'rgba(232,121,249,0.75)';
                case 'purple': return 'rgba(192,132,252,0.75)';
                case 'violet': return 'rgba(167,139,250,0.75)';
                case 'indigo': return 'rgba(129,140,248,0.75)';
                case 'blue': return 'rgba(96,165,250,0.75)';
                case 'sky': return 'rgba(56,189,248,0.75)';
                case 'cyan': return 'rgba(34,211,238,0.75)';
                case 'teal': return 'rgba(45,212,191,0.75)';
                case 'emerald': return 'rgba(52,211,153,0.75)';
                case 'green': return 'rgba(74,222,128,0.75)';
                case 'lime': return 'rgba(163,230,53,0.75)';
                case 'yellow': return 'rgba(250,204,21,0.75)';
                case 'amber': return 'rgba(251,191,36,0.75)';
                case 'orange': return 'rgba(251,146,60,0.75)';
                case 'red': return 'rgba(248,113,113,0.75)';
                case 'stone': return 'rgba(168,162,158,0.75)';
                case 'slate': return 'rgba(148,163,184,0.75)';
                default: return 'rgba(251,113,133,0.75)';
            }
        })();

        // Two layers for softer glow
        return `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 6px ${color})`;
    };

    if (isMemory) {
        const moodName = displayMemory?.mood;
        const moodOpt = moodOptions.find(m => m.label === moodName);
        const baseColor = moodOpt?.baseColor || 'rose';
        bgClass = getMoodColorClass(baseColor);
        glowClass = '';
        scale = 1.3;
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
            {/* 两人同一天都有记忆：小爱心；否则小圆点 */}
            {hasBoth ? (
                <motion.div
                    className={`w-2 h-2 flex items-center justify-center bg-transparent leading-none transition-colors duration-500 ${isToday ? 'text-amber-200 star-glow-gold' : ''} ${!isToday ? (() => {
                        const moodName = displayMemory?.mood;
                        const moodOpt = moodOptions.find(m => m.label === moodName);
                        const baseColor = moodOpt?.baseColor || 'rose';
                        return getMoodHeartClass(baseColor);
                    })() : ''}`}
                    animate={{ opacity: isMemory || isToday ? [0.8, 1, 0.8] : [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
                    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: animationDelay, ease: "easeInOut" }}
                >
                    <Heart
                        size={10}
                        strokeWidth={2.5}
                        fill="currentColor"
                        className="w-2.5 h-2.5 shrink-0 block"
                        style={{
                            filter: isToday
                                ? 'drop-shadow(0 0 4px rgba(252,211,77,0.75)) drop-shadow(0 0 8px rgba(252,211,77,0.65))'
                                : (() => {
                                    const moodName = displayMemory?.mood;
                                    const moodOpt = moodOptions.find(m => m.label === moodName);
                                    const baseColor = moodOpt?.baseColor || 'rose';
                                    return getMoodGlowFilter(baseColor);
                                })(),
                        }}
                    />
                </motion.div>
            ) : (
                <motion.div
                    className={`w-2 h-2 rounded-full transition-colors duration-500 ${bgClass} ${glowClass}`}
                    animate={{
                        opacity: isMemory || isToday ? [0.8, 1, 0.8] : [0.5, 0.8, 0.5],
                        scale: isMemory || isToday ? [1, 1.1, 1] : [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: animationDelay,
                        ease: "easeInOut"
                    }}
                />
            )}

            {/* Hover Tooltip - 随主题色 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 w-max">
                <div className={`${tooltipClass} text-[10px] px-2 py-1 rounded-full shadow-lg font-sans tracking-wide`}>
                    {format(day.date, 'yyyy-MM-dd')}
                    {day.hasMemory && <span className="mx-1">•</span>}
                    {day.hasMemory && <span className="italic opacity-80">{displayMemory?.mood}</span>}
                </div>
            </div>
        </motion.div>
    );
};