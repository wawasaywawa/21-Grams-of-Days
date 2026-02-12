import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { Theme } from '../types';

export interface Letter {
    id: string;
    from_user_id: string;
    to_user_id: string;
    body: string;
    read_at: string | null;
    created_at: string;
    scheduled_at?: string | null;
}

function stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent?.trim() ?? '';
}

interface LettersModalProps {
    letters: Letter[];
    currentUserId: string;
    partnerDisplayName: string;
    theme: Theme;
    onClose: () => void;
    onOpenCompose: () => void;
    onSend: (body: string) => Promise<void>;
    onMarkRead: (letterId: string) => Promise<void>;
}

export const LettersModal: React.FC<LettersModalProps> = ({
    letters,
    currentUserId,
    partnerDisplayName,
    theme,
    onClose,
    onOpenCompose,
    onSend,
    onMarkRead,
}) => {
    const pPrimary = theme.panelPrimaryColor ?? theme.primaryColor;
    const pSecondary = theme.panelSecondaryColor ?? theme.secondaryColor;
    const pFaded = theme.panelFadedColor ?? theme.fadedColor;
    const [readingId, setReadingId] = useState<string | null>(null);

    const now = new Date();
    const isVisibleToRecipient = (l: Letter) => !l.scheduled_at || new Date(l.scheduled_at) <= now;
    const incoming = letters.filter((l) => l.to_user_id === currentUserId && isVisibleToRecipient(l));
    const outgoing = letters.filter((l) => l.from_user_id === currentUserId);
    const unreadCount = incoming.filter((l) => !l.read_at).length;

    const openLetter = async (letter: Letter) => {
        setReadingId(letter.id);
        if (letter.to_user_id === currentUserId && !letter.read_at) {
            await onMarkRead(letter.id);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
        >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg max-h-[85vh] flex flex-col glass-panel rounded-3xl shadow-xl border border-white/30 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {!readingId && (
                    <div className="p-5 border-b border-white/20 flex items-center justify-between flex-shrink-0">
                        <h2 className={`font-serif text-xl ${pPrimary}`}>写给 {partnerDisplayName}</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`p-2 rounded-full ${theme.glassColor} hover:bg-white/40 ${pPrimary}`}
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <AnimatePresence mode="wait">
                        {readingId ? (
                            <motion.div
                                key="letter"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 min-h-0 flex flex-col overflow-hidden pb-5"
                            >
                                <div className="flex items-center justify-between flex-shrink-0 min-h-[40px] px-5 pt-5 mb-3 w-full">
                                    <button
                                        type="button"
                                        onClick={() => setReadingId(null)}
                                        className={`p-2 rounded-full ${theme.glassColor} hover:bg-white/40 ${pPrimary}`}
                                        aria-label="返回"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className={`p-2 rounded-full ${theme.glassColor} hover:bg-white/40 ${pPrimary}`}
                                        aria-label="关闭"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                {(() => {
                                    const letter = letters.find((l) => l.id === readingId);
                                    if (!letter) return null;
                                    return (
                                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 pr-2">
                                            <div className={`text-[10px] ${pFaded} mb-3`}>
                                                {format(new Date(letter.created_at), 'yyyy-MM-dd HH:mm')}
                                            </div>
                                            <div
                                                className={`${pPrimary} text-sm leading-relaxed letter-body [&_h3]:font-semibold [&_h3]:text-base [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`}
                                                dangerouslySetInnerHTML={{ __html: letter.body }}
                                            />
                                        </div>
                                    );
                                })()}
                            </motion.div>
                                ) : (
                                    <motion.div
                                        key="list"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex-1 min-h-0 flex flex-col overflow-hidden"
                                    >
                                        <div className="p-5 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={onOpenCompose}
                                                className={`w-full py-3 rounded-2xl border-2 border-dashed hover:bg-white/30 text-sm font-medium transition-colors ${theme.panelPrimaryColor ? `border-slate-300 ${pFaded}` : theme.accentMuted}`}
                                            >
                                                写一封信
                                            </button>
                                        </div>

                                <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 custom-scrollbar space-y-4">
                                    {incoming.length > 0 && (
                                        <div>
                                            <h3 className={`text-[10px] uppercase tracking-wider ${pFaded} font-bold mb-2`}>
                                                {partnerDisplayName}的来信 {unreadCount > 0 && <span className="text-rose-500">({unreadCount} 未读)</span>}
                                            </h3>
                                            <ul className="space-y-2">
                                                {incoming.map((letter) => (
                                                    <li key={letter.id}>
                                                        <button
                                                            type="button"
                                                            onClick={() => openLetter(letter)}
                                                            className={`w-full text-left rounded-2xl p-4 transition-colors glass-card ${!letter.read_at ? 'ring-1 ring-rose-200' : ''}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <span className={`text-[10px] ${pFaded}`}>
                                                                    {format(new Date(letter.created_at), 'yyyy-MM-dd HH:mm')}
                                                                </span>
                                                                {!letter.read_at && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">新</span>
                                                                )}
                                                            </div>
                                                            <p className={`text-sm ${pSecondary} whitespace-pre-wrap line-clamp-2`}>{stripHtml(letter.body)}</p>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {outgoing.length > 0 && (
                                        <div>
                                            <h3 className={`text-[10px] uppercase tracking-wider ${pFaded} font-bold mb-2`}>我发出的</h3>
                                            <ul className="space-y-2">
                                                {outgoing.map((letter) => {
                                                    const isScheduled = letter.scheduled_at && new Date(letter.scheduled_at) > now;
                                                    return (
                                                        <li key={letter.id} className="rounded-2xl p-4 glass-card">
                                                            <div className={`text-[10px] ${pFaded} mb-1 flex items-center gap-2 flex-wrap`}>
                                                                {format(new Date(letter.created_at), 'yyyy-MM-dd HH:mm')}
                                                                {isScheduled && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px]">定时 {format(new Date(letter.scheduled_at!), 'MM-dd HH:mm')}</span>
                                                                )}
                                                            </div>
                                                            <p className={`text-sm ${pSecondary} whitespace-pre-wrap line-clamp-2`}>{stripHtml(letter.body)}</p>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                    {letters.length === 0 && (
                                        <p className={`${pFaded} text-sm text-center py-8`}>还没有信件，写第一封吧</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};
