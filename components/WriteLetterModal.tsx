import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bold, Italic, List, Save, Clock, ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react';
import { format, addMinutes, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import type { Theme } from '../types';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

const DRAFT_KEY_PREFIX = 'letter_draft_';

interface WriteLetterModalProps {
    partnerId: string;
    partnerDisplayName: string;
    theme: Theme;
    onSend: (body: string, scheduledAt?: string | null) => Promise<void>;
    onBack: () => void;
    onClose: () => void;
}

export const WriteLetterModal: React.FC<WriteLetterModalProps> = ({
    partnerId,
    partnerDisplayName,
    theme,
    onSend,
    onBack,
    onClose,
}) => {
    const pPrimary = theme.panelPrimaryColor ?? theme.primaryColor;
    const pSecondary = theme.panelSecondaryColor ?? theme.secondaryColor;
    const pFaded = theme.panelFadedColor ?? theme.fadedColor;
    const pPlaceholder = theme.panelPlaceholder ?? theme.accentPlaceholder;
    const accentText = theme.accentMuted.split(' ')[0]; // 如 text-plum-600，用来给勾选图标着色
    const editorRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);
    const [draftSavedHint, setDraftSavedHint] = useState(false);
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [scheduleTime, setScheduleTime] = useState(() => format(addMinutes(new Date(), 30), 'HH:mm'));
    const [editorEmpty, setEditorEmpty] = useState(true);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [timePickerOpen, setTimePickerOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => parseISO(format(new Date(), 'yyyy-MM-dd')));
    const datePickerRef = useRef<HTMLDivElement>(null);
    const timePickerRef = useRef<HTMLDivElement>(null);

    const draftKey = `${DRAFT_KEY_PREFIX}${partnerId}`;

    useEffect(() => {
        if (!datePickerOpen) return;
        const h = (e: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setDatePickerOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [datePickerOpen]);
    useEffect(() => {
        if (!timePickerOpen) return;
        const h = (e: MouseEvent) => {
            if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) setTimePickerOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [timePickerOpen]);

    const updateEditorEmpty = () => {
        setEditorEmpty(!editorRef.current?.innerText?.trim());
    };

    useEffect(() => {
        const raw = localStorage.getItem(draftKey);
        if (raw && editorRef.current) {
            try {
                editorRef.current.innerHTML = raw;
            } catch {
                editorRef.current.innerText = raw;
            }
            setEditorEmpty(!editorRef.current.innerText?.trim());
        }
    }, [draftKey]);

    const getHtml = (): string => {
        if (!editorRef.current) return '';
        return editorRef.current.innerHTML.trim();
    };

    const getText = (): string => {
        if (!editorRef.current) return '';
        return editorRef.current.innerText.trim();
    };

    const exec = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value);
        editorRef.current?.focus();
    };

    const handleSaveDraft = () => {
        const html = getHtml();
        if (html) localStorage.setItem(draftKey, html);
        else localStorage.removeItem(draftKey);
        setDraftSavedHint(true);
        setTimeout(() => setDraftSavedHint(false), 2000);
    };

    const handleSend = async () => {
        const html = getHtml();
        if (!html || !getText() || sending) return;
        setSending(true);
        let scheduledAt: string | null = null;
        if (scheduleEnabled && scheduleDate && scheduleTime) {
            scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
            if (new Date(scheduledAt) <= new Date()) {
                scheduledAt = null;
            }
        }
        await onSend(html, scheduledAt ?? undefined);
        localStorage.removeItem(draftKey);
        setSending(false);
        onClose();
    };

    return (
        <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onBack} />
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full max-w-3xl max-h-[90vh] flex flex-col glass-panel rounded-[2.5rem] shadow-2xl border border-white/40 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 顶部：返回 | 标题 | 关闭 */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onBack}
                        className={`${accentText} transition-opacity hover:opacity-100 opacity-80`}
                        aria-label="返回"
                        title="返回信件列表"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="text-center">
                        <h1 className={`text-lg font-medium tracking-wider ${pPrimary}`}>写一封信</h1>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${accentText} transition-opacity hover:opacity-100 opacity-80`}
                        aria-label="关闭"
                        title="回到主页面"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 编辑区：内凹框 + 文本框内左下角编辑栏（无底色、仅图标） */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-8 pt-4 pb-4 relative">
                    <div className="flex-1 min-h-[280px] rounded-2xl bg-white/40 border border-white/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] relative">
                        <div
                            ref={editorRef}
                            contentEditable
                            onInput={updateEditorEmpty}
                            onPaste={updateEditorEmpty}
                            className={`w-full h-full min-h-[250px] rounded-2xl bg-transparent border-none px-4 pt-3 pb-10 text-lg leading-relaxed focus:outline-none overflow-y-auto custom-scrollbar ${pPrimary} [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`}
                            suppressContentEditableWarning
                        />
                        {editorEmpty && (
                            <div className={`absolute pointer-events-none text-lg opacity-50 ${pFaded}`} style={{ top: '1rem', left: '1rem' }}>
                                写一封信...
                            </div>
                        )}
                        {/* 编辑栏：文本框内左下方，无底色，仅图标，缩小 */}
                        <div className={`absolute bottom-2 left-2 flex items-center gap-1 ${pPrimary} opacity-80`}>
                            <button type="button" onClick={() => exec('bold')} className="p-1 rounded hover:opacity-100 transition-opacity" title="加粗" aria-label="加粗">
                                <Bold size={14} />
                            </button>
                            <button type="button" onClick={() => exec('italic')} className="p-1 rounded hover:opacity-100 transition-opacity" title="斜体" aria-label="斜体">
                                <Italic size={14} />
                            </button>
                            <button type="button" onClick={() => exec('insertUnorderedList')} className="p-1 rounded hover:opacity-100 transition-opacity" title="列表" aria-label="列表">
                                <List size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 底部：左侧 定时发送 + 日期时间（紧挨）；右侧 存草稿图标、发送图标；无取消；时间选择无确定 */}
                <div className="px-8 py-6 flex items-center justify-between gap-4 flex-shrink-0 border-t border-white/20">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <label className={`flex items-center gap-1.5 cursor-pointer shrink-0 ${pFaded} hover:opacity-90 transition-colors`}>
                            <input
                                type="checkbox"
                                checked={scheduleEnabled}
                                onChange={(e) => setScheduleEnabled(e.target.checked)}
                                className="sr-only"
                            />
                            <span className="w-4 h-4 rounded-md border border-white/50 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] flex items-center justify-center">
                                {scheduleEnabled && (
                                    <Check size={12} strokeWidth={2.5} className={accentText} />
                                )}
                            </span>
                            <span className="text-sm font-medium">定时发送</span>
                        </label>
                        {scheduleEnabled && (
                            <>
                                <div className="relative shrink-0" ref={datePickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => { setDatePickerOpen((v) => { if (!v) setCalendarMonth(parseISO(scheduleDate)); return !v; }); setTimePickerOpen(false); }}
                                        className={`rounded-xl px-2.5 py-1.5 bg-white/50 border border-white/40 text-xs flex items-center gap-1.5 min-w-[7rem] ${pPrimary}`}
                                    >
                                        <CalendarIcon size={14} className="opacity-70" />
                                        {scheduleDate.replace(/-/g, '/')}
                                    </button>
                                    <AnimatePresence>
                                        {datePickerOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="absolute bottom-full left-0 mb-2 p-4 rounded-2xl glass-panel border border-white/30 shadow-xl z-[80] min-w-[260px]"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <button type="button" onClick={() => setCalendarMonth((m) => subMonths(m, 1))} className={`p-1 rounded-lg hover:bg-white/30 ${pPrimary}`}>
                                                        <ChevronLeft size={18} />
                                                    </button>
                                                    <span className={`text-sm font-medium ${pPrimary}`}>{format(calendarMonth, 'yyyy年MM月')}</span>
                                                    <button type="button" onClick={() => setCalendarMonth((m) => addMonths(m, 1))} className={`p-1 rounded-lg hover:bg-white/30 ${pPrimary}`}>
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-7 gap-0.5 text-center">
                                                    {WEEKDAY.map((d) => (
                                                        <div key={d} className={`text-[10px] py-1 ${pFaded}`}>{d}</div>
                                                    ))}
                                                    {(() => {
                                                        const start = startOfMonth(calendarMonth);
                                                        const end = endOfMonth(calendarMonth);
                                                        const days = eachDayOfInterval({ start, end });
                                                        const pad = start.getDay();
                                                        const blanks = Array.from({ length: pad }, (_, i) => <div key={`b-${i}`} />);
                                                        return blanks.concat(
                                                            days.map((day) => {
                                                                const selected = scheduleDate === format(day, 'yyyy-MM-dd');
                                                                return (
                                                                    <button
                                                                        key={day.toISOString()}
                                                                        type="button"
                                                                        onClick={() => { setScheduleDate(format(day, 'yyyy-MM-dd')); setDatePickerOpen(false); }}
                                                                        className={`w-8 h-8 rounded-lg text-xs ${pPrimary} ${selected ? 'bg-violet-500 text-white' : 'hover:bg-white/40'} ${isToday(day) && !selected ? 'ring-1 ring-violet-400' : ''}`}
                                                                    >
                                                                        {format(day, 'd')}
                                                                    </button>
                                                                );
                                                            })
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex justify-between mt-2 pt-2 border-t border-white/20">
                                                    <button type="button" onClick={() => { setScheduleDate(format(new Date(), 'yyyy-MM-dd')); setDatePickerOpen(false); }} className={`text-xs ${pFaded} hover:opacity-100`}>今天</button>
                                                    <button type="button" onClick={() => setDatePickerOpen(false)} className={`text-xs ${pFaded} hover:opacity-100`}>关闭</button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="relative shrink-0" ref={timePickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => { setTimePickerOpen((v) => !v); setDatePickerOpen(false); }}
                                        className={`rounded-xl px-2.5 py-1.5 bg-white/50 border border-white/40 text-xs flex items-center gap-1.5 min-w-[5rem] ${pPrimary}`}
                                    >
                                        <Clock size={14} className="opacity-70" />
                                        {scheduleTime}
                                    </button>
                                    <AnimatePresence>
                                        {timePickerOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="absolute bottom-full right-0 mb-2 p-3 rounded-2xl glass-panel border border-white/30 shadow-xl z-[80] flex gap-2"
                                            >
                                                <div className={`flex flex-col gap-0.5 max-h-36 overflow-y-auto custom-scrollbar ${pPrimary} text-xs`}>
                                                    {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                                                        <button
                                                            key={h}
                                                            type="button"
                                                            onClick={() => { setScheduleTime(`${String(h).padStart(2, '0')}:${scheduleTime.slice(3)}`); }}
                                                            className={`px-2 py-1 rounded-lg min-w-[2.5rem] ${scheduleTime.slice(0, 2) === String(h).padStart(2, '0') ? 'bg-violet-500 text-white' : 'hover:bg-white/40'}`}
                                                        >
                                                            {String(h).padStart(2, '0')}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className={`flex flex-col gap-0.5 max-h-36 overflow-y-auto custom-scrollbar ${pPrimary} text-xs`}>
                                                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            onClick={() => { setScheduleTime(`${scheduleTime.slice(0, 3)}${String(m).padStart(2, '0')}`); }}
                                                            className={`px-2 py-1 rounded-lg min-w-[2.5rem] ${scheduleTime.slice(3, 5) === String(m).padStart(2, '0') ? 'bg-violet-500 text-white' : 'hover:bg-white/40'}`}
                                                        >
                                                            {String(m).padStart(2, '0')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            className={`${accentText} transition-opacity hover:opacity-100 opacity-70`}
                            title="存草稿"
                            aria-label="存草稿"
                        >
                            <Save size={18} />
                        </button>
                        {draftSavedHint && <span className="text-xs text-green-600">已保存</span>}
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={sending || !getText()}
                            className={`transition-opacity hover:opacity-100 opacity-90 disabled:opacity-40 ${accentText}`}
                            title={scheduleEnabled ? '定时发送' : '发送'}
                            aria-label={scheduleEnabled ? '定时发送' : '发送'}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
