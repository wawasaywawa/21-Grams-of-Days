import React from 'react';
import { DayData, MoodOption } from '../types';
import { StarDot } from './StarDot';

interface StarGridProps {
    days: DayData[];
    onDayClick: (day: DayData) => void;
    fadedTextColor?: string; // e.g. text-plum-900/40 or text-white/40
    moodOptions: MoodOption[];
}

export const StarGrid: React.FC<StarGridProps> = ({ days, onDayClick, fadedTextColor = 'text-plum-900/40', moodOptions }) => {
    
    return (
        <div className="relative z-10 w-full max-w-6xl mx-auto p-4 md:p-8">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(18px,1fr))] gap-3 md:gap-4 justify-items-center">
                {days.map((day, index) => (
                    <StarDot 
                        key={day.dateStr} 
                        day={day} 
                        index={index}
                        onClick={onDayClick}
                        moodOptions={moodOptions}
                    />
                ))}
            </div>
            
            {/* Legend / Footer Info */}
            <div className="mt-12 flex justify-between items-end border-t border-current/10 pt-6">
                 <div className="hidden md:block">
                     <p className={`font-serif italic text-sm ${fadedTextColor} opacity-80`}>"Every point is a star in our shared sky."</p>
                 </div>
                 <div className={`flex gap-6 text-[10px] uppercase tracking-widest font-bold ${fadedTextColor}`}>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-rose-300 shadow-[0_0_10px_rgba(255,209,220,0.8)]"></div>
                         <span>记忆</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(252,211,77,0.8)]"></div>
                         <span>今天</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-white/40"></div>
                         <span>时光</span>
                     </div>
                 </div>
            </div>
        </div>
    );
};