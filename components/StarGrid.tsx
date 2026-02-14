import React from 'react';
import { Heart } from 'lucide-react';
import { DayData, MoodOption } from '../types';
import { StarDot } from './StarDot';
import { differenceInDays, format } from 'date-fns';

interface StarGridProps {
    days: DayData[];
    onDayClick: (day: DayData) => void;
    fadedTextColor?: string;
    moodOptions: MoodOption[];
    showMergeLegend?: boolean;
    tooltipClass?: string;
    selectedDay?: DayData | null;
    startDate?: Date;
    endDate?: Date;
    viewMode?: 'mine' | 'partner' | 'merge';
    onChangeViewMode?: (mode: 'mine' | 'partner' | 'merge') => void;
    timelineLeftClass?: string;
    timelineRightClass?: string;
    timelineMonthClass?: string;
}

export const StarGrid: React.FC<StarGridProps> = ({
    days,
    onDayClick,
    fadedTextColor = 'text-plum-900/40',
    moodOptions,
    showMergeLegend,
    tooltipClass,
    selectedDay,
    startDate,
    endDate,
    viewMode = 'mine',
    onChangeViewMode,
    timelineLeftClass,
    timelineRightClass,
    timelineMonthClass,
}) => {
    // 如果没有显式选中某一天，则优先使用「今天」，再退回到第一个点
    const effectiveDay = selectedDay || days.find(d => d.isToday) || days[0];
    const hasSelection = !!effectiveDay && !!startDate && !!endDate;
    let progressPercent = 0;
    let daysFromStart = 0;
    let daysToToday = 0;

    if (hasSelection && effectiveDay && startDate && endDate) {
        const totalDays = Math.max(differenceInDays(endDate, startDate), 1);
        const offset = Math.max(differenceInDays(effectiveDay.date, startDate), 0);
        progressPercent = Math.min(100, Math.max(0.5, (offset / totalDays) * 100)); // 避免 0 宽度
        daysFromStart = offset;
        const today = new Date();
        daysToToday = Math.max(0, differenceInDays(today, effectiveDay.date));
    }
    
    return (
        <div className="relative z-10 w-full max-w-6xl mx-auto p-4 md:p-8">
            {/* 顶部：引言 + 图例 + 视图切换按钮（与网格同一宽度，处于同一水平线） */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div className="flex-1">
                    <p className={`hidden md:block font-serif italic text-sm ${fadedTextColor} opacity-80`}>
                        "Every point is a star in our shared sky."
                    </p>
                    <div
                        className={`mt-2 md:mt-3 flex flex-wrap gap-6 text-[10px] uppercase tracking-widest font-bold ${fadedTextColor}`}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-300 shadow-[0_0_10px_rgba(255,209,220,0.8)]" />
                            <span>记忆</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(252,211,77,0.8)]" />
                            <span>今天</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-white/40" />
                            <span>时光</span>
                        </div>
                        {showMergeLegend && (
                            <div className="flex items-center gap-2">
                                <Heart
                                    size={12}
                                    className="text-rose-300 drop-shadow-[0_0_6px_rgba(255,209,220,0.8)]"
                                    fill="currentColor"
                                />
                                <span>共同记忆</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 视图切换 Tab：只在有伴侣图例时显示，与图例在同一水平线上，并位于网格正上方 */}
                {showMergeLegend && onChangeViewMode && (
                    <div className="flex-shrink-0 flex gap-2 text-[10px] uppercase tracking-wider font-bold">
                        <button
                            type="button"
                            onClick={() => onChangeViewMode('mine')}
                            className={`px-3 py-1.5 rounded-full transition-colors duration-200 ${
                                viewMode === 'mine'
                                    ? 'bg-white/80 shadow-sm text-slate-800'
                                    : 'bg-white/5 hover:bg-white/15 text-white/80'
                            }`}
                        >
                            只看我的
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeViewMode('partner')}
                            className={`px-3 py-1.5 rounded-full transition-colors duration-200 ${
                                viewMode === 'partner'
                                    ? 'bg-white/80 shadow-sm text-slate-800'
                                    : 'bg-white/5 hover:bg-white/15 text-white/80'
                            }`}
                        >
                            只看对方
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeViewMode('merge')}
                            className={`px-3 py-1.5 rounded-full transition-colors duration-200 ${
                                viewMode === 'merge'
                                    ? 'bg-white/80 shadow-sm text-slate-800'
                                    : 'bg-white/5 hover:bg-white/15 text-white/80'
                            }`}
                        >
                            合并
                        </button>
                    </div>
                )}
            </div>

            {/* 中部：星点网格 */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(18px,1fr))] gap-3 md:gap-4 justify-items-center">
                {days.map((day, index) => (
                    <StarDot
                        key={day.dateStr}
                        day={day}
                        index={index}
                        onClick={onDayClick}
                        moodOptions={moodOptions}
                        tooltipClass={tooltipClass}
                    />
                ))}
            </div>

            {/* 底部：仅时间线 */}
            <div className="mt-12 space-y-4">
                {/* 时间线：仅在有选中日期时显示星星和数据 */}
                {hasSelection && (
                    <div className="timeline-container w-full">
                        {/* 时间线主体：与上方网格同宽 */}
                        <div className="relative h-[2px] w-full bg-gradient-to-r from-pink-300/40 via-purple-300/40 to-purple-400/70 rounded-full">
                            <div
                                className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
                                style={{ left: `${progressPercent}%` }}
                            >
                                <div className="relative w-4 h-4 -translate-x-1/2">
                                    {/* 小星星本体：交叉菱形，营造星芒而不是圆点 */}
                                    <div className="absolute inset-1 bg-white/95 rotate-45 rounded-[2px] shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
                                    <div className="absolute inset-1 bg-white/80 -rotate-45 rounded-[2px]" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-pink-300/30 rounded-full animate-ping" />
                                </div>
                            </div>
                        </div>

                        {/* 底部时间节点与天数：在线两端，而不是在线上方 */}
                        <div className="flex justify-between mt-3 px-1 text-[10px] md:text-xs font-serif tracking-tight uppercase">
                            <div className={`text-left ${timelineLeftClass ?? 'text-pink-200/80'}`}>
                                <span className="block text-[9px] md:text-[10px] tracking-[0.18em]">Days from start</span>
                                <span className="text-base md:text-lg font-light tracking-normal">
                                    {daysFromStart}
                                </span>
                            </div>
                            <div className={`text-right ${timelineRightClass ?? 'text-purple-200/80'}`}>
                                <span className="block text-[9px] md:text-[10px] tracking-[0.18em]">Days to today</span>
                                <span className="text-base md:text-lg font-light tracking-normal">
                                    {daysToToday}
                                </span>
                            </div>
                        </div>

                        {startDate && endDate && (
                            <div className={`flex justify-between mt-3 text-[10px] font-serif tracking-tight uppercase ${timelineMonthClass ?? 'text-white/40'}`}>
                                <span>{format(startDate, 'MMM yyyy')}</span>
                                <span>{format(endDate, 'MMM yyyy')}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};