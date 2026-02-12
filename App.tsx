import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayData, Memory, MoodOption, Theme } from './types';
import { generateTimelineDays, generateTimelineDaysWithPartner, START_DATE, DEFAULT_MOODS, THEMES, dataUrlToBlob } from './utils';
import { StarGrid } from './components/StarGrid';
import { BentoView } from './components/BentoView';
import { LettersModal, type Letter } from './components/LettersModal';
import { WriteLetterModal } from './components/WriteLetterModal';
import { Heart, Palette, Check, User, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from './supabaseClient';

const STORAGE_BUCKET = 'memories';

const App: React.FC = () => {
    // State
    const [memories, setMemories] = useState<Record<string, Memory>>({});
    const [moodOptions, setMoodOptions] = useState<MoodOption[]>(DEFAULT_MOODS);
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
    const [activeBentoDay, setActiveBentoDay] = useState<DayData | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Theme State
    const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isConnectOpen, setIsConnectOpen] = useState(false);

    // Auth State
    const [userId, setUserId] = useState<string | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Profiles (username)
    const [myUsername, setMyUsername] = useState<string | null>(null);
    const [partnerUsername, setPartnerUsername] = useState<string | null>(null);
    const [usernameInput, setUsernameInput] = useState('');
    const [usernameSaving, setUsernameSaving] = useState(false);
    const [usernameSavedHint, setUsernameSavedHint] = useState(false);
    const [profileCheckDone, setProfileCheckDone] = useState(false);

    // Partner / Share State
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [partnerMemories, setPartnerMemories] = useState<Record<string, Memory>>({});
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteSending, setInviteSending] = useState(false);
    const [inviteSent, setInviteSent] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<{ id: string }[]>([]);
    const [viewMode, setViewMode] = useState<'mine' | 'partner' | 'merge'>('mine');

    const [lettersModalOpen, setLettersModalOpen] = useState(false);
    const [isWriteLetterOpen, setIsWriteLetterOpen] = useState(false);
    const [letters, setLetters] = useState<Letter[]>([]);
    const [lettersLoading, setLettersLoading] = useState(false);
    // 新来信提示气泡（右下角心形上方）
    const [showLetterToast, setShowLetterToast] = useState(false);

    const rowToMemory = (row: any): Memory => {
        const images = (row.images as string[] | null) ?? [];
        const tags = (row.tags as string[] | null) ?? [];
        return {
            dateStr: row.date_str,
            title: row.title ?? 'Untitled',
            description: row.description ?? '',
            mood: row.mood ?? '平淡',
            images,
            imageUrl: images.length > 0 ? images[0] : undefined,
            voiceNoteUrl: row.voice_url ?? undefined,
            tags,
        };
    };

    // 拉取伴侣 id（已接受邀请的另一方）
    const fetchPartnerId = async (uid: string): Promise<string | null> => {
        const { data, error } = await supabase
            .from('shares')
            .select('from_user_id, to_user_id')
            .eq('status', 'accepted')
            .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);
        if (error || !data?.length) return null;
        const row = data[0] as { from_user_id: string; to_user_id: string };
        return row.from_user_id === uid ? row.to_user_id : row.from_user_id;
    };

    // 拉取「我的」记忆（仅自己）
    const loadMemoriesFromSupabase = async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from('memories')
                .select('*')
                .eq('user_id', uid);
            if (error) {
                console.error('Failed to load memories from Supabase', error);
                return;
            }
            if (!data?.length) return;
            const mapped: Record<string, Memory> = {};
            (data as any[]).forEach((row: any) => { mapped[row.date_str] = rowToMemory(row); });
            setMemories(mapped);
            try {
                localStorage.setItem('21months_memories', JSON.stringify(mapped));
            } catch (_) {}
        } catch (e) {
            console.error('Unexpected error loading memories from Supabase', e);
        }
    };

    const fetchProfiles = async (uid: string, pid: string | null) => {
        if (!pid) setPartnerUsername(null);
        const ids = pid ? [uid, pid] : [uid];
        const { data, error } = await supabase.from('profiles').select('user_id, username').in('user_id', ids);
        if (error) return;
        const rows = (data ?? []) as { user_id?: string; userId?: string; username?: string | null }[];
        rows.forEach((row) => {
            const uidRow = row.user_id ?? row.userId;
            const name = row.username?.trim() || null;
            if (uidRow === uid) setMyUsername(name);
            if (pid && uidRow === pid) setPartnerUsername(name);
        });
        setProfileCheckDone(true);
    };

    // 拉取伴侣 + 拆分「我的」与「伴侣」记忆（RLS 会返回自己+伴侣）
    const loadMemoriesAndPartnerFromSupabase = async (uid: string) => {
        try {
            const pid = await fetchPartnerId(uid);
            setPartnerId(pid);
            fetchProfiles(uid, pid);
            const { data, error } = await supabase.from('memories').select('*');
            if (error) {
                console.error('Failed to load memories', error);
                return;
            }
            const mine: Record<string, Memory> = {};
            const partner: Record<string, Memory> = {};
            (data as any[]).forEach((row: any) => {
                const mem = rowToMemory(row);
                if (row.user_id === uid) mine[row.date_str] = mem;
                else if (pid && row.user_id === pid) partner[row.date_str] = mem;
            });
            setMemories(mine);
            setPartnerMemories(partner);
            try {
                localStorage.setItem('21months_memories', JSON.stringify(mine));
            } catch (_) {}
        } catch (e) {
            console.error('Unexpected error loading memories/partner', e);
        }
    };

    // 拉取发给当前邮箱的待处理邀请
    useEffect(() => {
        if (!currentUserEmail) {
            setPendingInvites([]);
            return;
        }
        const email = currentUserEmail?.trim().toLowerCase() ?? '';
        if (!email) {
            setPendingInvites([]);
            return;
        }
        supabase
            .from('shares')
            .select('id, to_email')
            .eq('status', 'pending')
            .then(({ data, error }) => {
                if (error) console.error('Failed to fetch pending invites', error);
                const rows = (data ?? []) as { id: string; to_email?: string | null }[];
                const list = rows.filter((r) => (r.to_email ?? '').trim().toLowerCase() === email).map((r) => ({ id: r.id }));
                setPendingInvites(list);
            });
    }, [currentUserEmail]);

    // 有伴侣时拉取信件（用于未读闪烁）
    useEffect(() => {
        if (userId && partnerId) fetchLetters();
    }, [userId, partnerId]);

    // 弹窗关闭时轮询信件，以便未读红点/闪烁更新
    useEffect(() => {
        if (!partnerId || lettersModalOpen) return;
        const t = setInterval(fetchLetters, 45000);
        return () => clearInterval(t);
    }, [partnerId, lettersModalOpen]);

    // Initial Load
    useEffect(() => {
        // Check current auth session on mount
        supabase.auth.getUser().then(({ data, error }) => {
            if (error) {
                console.error('Failed to get current user', error);
                return;
            }
            if (data.user?.email) {
                setUserId(data.user.id);
                setCurrentUserEmail(data.user.email);
                loadMemoriesAndPartnerFromSupabase(data.user.id);
            }
        });

        // 拉取「发给我邮箱」的待处理邀请（在登录后由下面 useEffect 依赖 currentUserEmail 执行）

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

    useEffect(() => {
        if (isAuthOpen && currentUserEmail) setUsernameInput(myUsername ?? '');
    }, [isAuthOpen, currentUserEmail, myUsername]);

    // 打开信件弹窗时重新拉取对方用户名，确保显示最新
    useEffect(() => {
        if (lettersModalOpen && userId && partnerId) fetchProfiles(userId, partnerId);
    }, [lettersModalOpen, userId, partnerId]);

    // 登录后若已拉取过 profile 且尚未设定用户名，自动打开登录面板引导设定
    useEffect(() => {
        if (userId && currentUserEmail && profileCheckDone && myUsername === null && !isAuthOpen) {
            const t = setTimeout(() => setIsAuthOpen(true), 600);
            return () => clearTimeout(t);
        }
    }, [userId, currentUserEmail, profileCheckDone, myUsername, isAuthOpen]);

    // Apply Theme to Body
    useEffect(() => {
        document.body.style.background = currentTheme.background;
        document.body.style.backgroundAttachment = 'fixed';
    }, [currentTheme]);

    // Save memory handler
    const handleSaveMemory = async (day: DayData, memoryData: Partial<Memory>) => {
        // Ensure we always start from current image set
        let finalImages = memoryData.images || (memoryData.imageUrl ? [memoryData.imageUrl] : []);
        let finalVoiceUrl = memoryData.voiceNoteUrl;

        // If已登录，优先把 base64 媒体上传到 Supabase Storage，换成 URL
        if (userId && STORAGE_BUCKET) {
            try {
                const storage = supabase.storage.from(STORAGE_BUCKET);

                // 上传图片
                const uploadedImages: string[] = [];
                for (let i = 0; i < finalImages.length; i++) {
                    const img = finalImages[i];
                    if (img && img.startsWith('data:')) {
                        try {
                            const blob = dataUrlToBlob(img);
                            const ext = blob.type.split('/')[1] || 'png';
                            const path = `${userId}/${day.dateStr}/images/${Date.now()}-${i}.${ext}`;
                            const { error: uploadError } = await storage.upload(path, blob, {
                                contentType: blob.type,
                                upsert: false,
                            });
                            if (uploadError) {
                                console.error('Failed to upload image to Supabase Storage', uploadError);
                                // 不保留 base64，避免撑爆 localStorage
                                continue;
                            }
                            const { data: publicData } = storage.getPublicUrl(path);
                            uploadedImages.push(publicData.publicUrl);
                        } catch (e) {
                            console.error('Unexpected error uploading image', e);
                            // 不保留 base64，避免撑爆 localStorage
                        }
                    } else if (img) {
                        uploadedImages.push(img);
                    }
                }
                finalImages = uploadedImages;

                // 上传语音
                if (finalVoiceUrl && finalVoiceUrl.startsWith('data:')) {
                    try {
                        const blob = dataUrlToBlob(finalVoiceUrl);
                        const ext = blob.type.split('/')[1] || 'webm';
                        const path = `${userId}/${day.dateStr}/audio/${Date.now()}.${ext}`;
                        const { error: uploadError } = await storage.upload(path, blob, {
                            contentType: blob.type,
                            upsert: false,
                        });
                        if (uploadError) {
                            console.error('Failed to upload audio to Supabase Storage', uploadError);
                        } else {
                            const { data: publicData } = storage.getPublicUrl(path);
                            finalVoiceUrl = publicData.publicUrl;
                        }
                    } catch (e) {
                        console.error('Unexpected error uploading audio', e);
                    }
                }
            } catch (e) {
                console.error('Unexpected error preparing media uploads', e);
            }
        }

        const newMemory: Memory = {
            dateStr: day.dateStr,
            title: memoryData.title || 'Untitled',
            description: memoryData.description || '',
            mood: memoryData.mood || '平淡',
            imageUrl: finalImages.length > 0 ? finalImages[0] : undefined, // Keep legacy field populated for safety
            images: finalImages,
            tags: memoryData.tags || [],
            voiceNoteUrl: finalVoiceUrl,
        };

        const updatedMemories = {
            ...memories,
            [day.dateStr]: newMemory
        };

        setMemories(updatedMemories);
        try {
            localStorage.setItem('21months_memories', JSON.stringify(updatedMemories));
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.warn('localStorage full, skipping save (Supabase has the data if logged in)');
            } else {
                throw e;
            }
        }

        // Persist to Supabase for logged-in user
        if (userId) {
            try {
                const payload = {
                    user_id: userId,
                    date_str: day.dateStr,
                    title: newMemory.title,
                    description: newMemory.description,
                    mood: newMemory.mood,
                    images: newMemory.images ?? [],
                    voice_url: newMemory.voiceNoteUrl ?? null,
                    tags: newMemory.tags ?? [],
                };

                const { error } = await supabase
                    .from('memories')
                    .upsert(payload, { onConflict: 'user_id,date_str' });

                if (error) {
                    console.error('Failed to upsert memory to Supabase', error);
                }
            } catch (e) {
                console.error('Unexpected error saving memory to Supabase', e);
            }
        }
        
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

    // Auth Handlers
    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setAuthLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: authEmail,
                password: authPassword,
            });
            if (error) {
                // 如果用户还没注册，可以简单提示先去 Supabase 后台创建，后面再做注册流程
                console.error('Sign in error', error);
                setAuthError(error.message);
            } else if (data.user) {
                setUserId(data.user.id);
                setCurrentUserEmail(data.user.email ?? null);
                setAuthPassword('');
                loadMemoriesAndPartnerFromSupabase(data.user.id);
            }
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSignOut = async () => {
        setAuthLoading(true);
        try {
            await supabase.auth.signOut();
            setUserId(null);
            setCurrentUserEmail(null);
            setMyUsername(null);
            setPartnerUsername(null);
            setProfileCheckDone(false);
            setPartnerId(null);
            setPartnerMemories({});
            setViewMode('mine');
        } finally {
            setAuthLoading(false);
        }
    };

    // 通过邮箱发送邀请
    const handleInviteByEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = inviteEmail.trim().toLowerCase();
        if (!userId || !email) return;
        setInviteSending(true);
        const { error } = await supabase.from('shares').insert({
            from_user_id: userId,
            to_email: email,
            invite_token: crypto.randomUUID(),
            status: 'pending',
        });
        setInviteSending(false);
        if (error) {
            console.error('Failed to create invite', error);
            return;
        }
        setInviteSent(true);
        setInviteEmail('');
        setTimeout(() => setInviteSent(false), 3000);
    };

    const handleAcceptInvite = async (shareId: string) => {
        if (!userId) return;
        const { error } = await supabase
            .from('shares')
            .update({ to_user_id: userId, status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', shareId);
        if (error) {
            console.error('Failed to accept invite', error);
            return;
        }
        setPendingInvites((prev) => prev.filter((p) => p.id !== shareId));
        loadMemoriesAndPartnerFromSupabase(userId);
        setViewMode('merge');
    };

    const handleRejectInvite = async (shareId: string) => {
        const { error } = await supabase.from('shares').delete().eq('id', shareId);
        if (!error) setPendingInvites((prev) => prev.filter((p) => p.id !== shareId));
    };

    const handleDisconnect = async () => {
        if (!userId || !partnerId) return;
        const { data, error: fetchErr } = await supabase
            .from('shares')
            .select('id')
            .eq('status', 'accepted')
            .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
        if (fetchErr || !data?.length) return;
        const shareId = (data[0] as { id: string }).id;
        const { error } = await supabase.from('shares').delete().eq('id', shareId);
        if (!error) {
            setPartnerId(null);
            setPartnerMemories({});
            setPartnerUsername(null);
            setViewMode('mine');
            setIsConnectOpen(false);
        }
    };

    const partnerDisplayName = partnerUsername?.trim() || 'ta';
    // 弹窗内文字：Deep Space / Starry Night 用深色，否则用主题色
    const pPrimary = currentTheme.panelPrimaryColor ?? currentTheme.primaryColor;
    const pSecondary = currentTheme.panelSecondaryColor ?? currentTheme.secondaryColor;
    const pFaded = currentTheme.panelFadedColor ?? currentTheme.fadedColor;
    const pMuted = currentTheme.panelPrimaryColor ? pSecondary : currentTheme.accentMuted.split(' ')[0];
    const pPlaceholder = currentTheme.panelPlaceholder ?? currentTheme.accentPlaceholder;

    const handleSaveUsername = async () => {
        if (!userId || usernameSaving) return;
        const name = usernameInput.trim();
        setUsernameSaving(true);
        setUsernameSavedHint(false);
        const { error } = await supabase.from('profiles').upsert({ user_id: userId, username: name || null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        setUsernameSaving(false);
        if (!error) {
            setMyUsername(name || null);
            setUsernameSavedHint(true);
            setTimeout(() => setUsernameSavedHint(false), 2000);
        }
    };

    const fetchLetters = async (overridePartnerId?: string) => {
        const pid = overridePartnerId ?? partnerId;
        if (!userId || !pid) return;
        setLettersLoading(true);
        const { data, error } = await supabase
            .from('letters')
            .select('*')
            .or(`and(from_user_id.eq.${userId},to_user_id.eq.${pid}),and(from_user_id.eq.${pid},to_user_id.eq.${userId})`)
            .order('created_at', { ascending: false });
        setLettersLoading(false);
        if (error) {
            console.error('Failed to fetch letters', error);
            return;
        }
        setLetters((data as Letter[]) ?? []);
    };

    const unreadLettersCount = useMemo(() => {
        const now = new Date();
        return letters.filter(
            (l) =>
                l.to_user_id === userId &&
                !l.read_at &&
                (!l.scheduled_at || new Date(l.scheduled_at) <= now)
        ).length;
    }, [letters, userId]);

    // 未读来信提示：有未读且已连接时展示「xx 给你写信了」气泡，点一次后关闭
    useEffect(() => {
        if (partnerId && unreadLettersCount > 0 && !lettersModalOpen) {
            setShowLetterToast(true);
        }
        if (unreadLettersCount === 0) {
            setShowLetterToast(false);
        }
    }, [partnerId, unreadLettersCount, lettersModalOpen]);

    const handleSendLetter = async (body: string, scheduledAt?: string | null) => {
        if (!userId || !partnerId) return;
        const payload: { from_user_id: string; to_user_id: string; body: string; scheduled_at?: string | null } = {
            from_user_id: userId,
            to_user_id: partnerId,
            body,
        };
        if (scheduledAt) payload.scheduled_at = scheduledAt;
        const { error } = await supabase.from('letters').insert(payload);
        if (error) console.error('Failed to send letter', error);
        else await fetchLetters();
    };

    const handleMarkLetterRead = async (letterId: string) => {
        const { error } = await supabase
            .from('letters')
            .update({ read_at: new Date().toISOString() })
            .eq('id', letterId);
        if (!error) {
            const at = new Date().toISOString();
            setLetters((prev) => prev.map((l) => (l.id === letterId ? { ...l, read_at: at } : l)));
        }
    };

    const handleHeartClick = async () => {
        if (partnerId) {
            setLettersModalOpen(true);
            fetchLetters();
            return;
        }
        if (userId) {
            const pid = await fetchPartnerId(userId);
            if (pid) {
                setPartnerId(pid);
                setLettersModalOpen(true);
                fetchLetters(pid);
                return;
            }
        }
        const today = days.find((d) => d.isToday);
        if (today) setSelectedDay(today);
    };

    const days = useMemo(() => {
        if (partnerId) {
            if (viewMode === 'merge') {
                return generateTimelineDaysWithPartner(memories, partnerMemories);
            }
            if (viewMode === 'partner') {
                // 只看对方：用伴侣记忆生成时间轴
                return generateTimelineDays(partnerMemories);
            }
        }
        // 默认：只看自己
        return generateTimelineDays(memories);
    }, [memories, partnerMemories, viewMode, partnerId]);

    // 不同主题下，时间线文字颜色微调（仅针对亮底主题）
    const timelineLeftClass =
        currentTheme.id === 'nebula'
            ? 'text-rose-700/90'
            : currentTheme.id === 'sunset'
            ? 'text-orange-800/90'
            : currentTheme.id === 'aurora'
            ? 'text-teal-800/90'
            : undefined;

    const timelineRightClass =
        currentTheme.id === 'nebula'
            ? 'text-purple-800/90'
            : currentTheme.id === 'sunset'
            ? 'text-purple-800/90'
            : currentTheme.id === 'aurora'
            ? 'text-slate-800/90'
            : undefined;

    const timelineMonthClass =
        currentTheme.id === 'nebula'
            ? 'text-plum-900/70'
            : currentTheme.id === 'sunset'
            ? 'text-orange-900/70'
            : currentTheme.id === 'aurora'
            ? 'text-teal-900/70'
            : undefined;

    // Stats
    const displayEndDate = days.length > 0 ? days[days.length - 1].date : START_DATE;

    return (
        <div className={`min-h-screen w-full relative overflow-x-hidden font-sans selection:bg-rose-200 transition-colors duration-500`}>
            
            {/* Background Texture/Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-40 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150 contrast-150 mix-blend-overlay"></div>

            {/* 待处理邀请：玻璃质感弹窗，一次操作接受/拒绝一条 */}
            <AnimatePresence>
                {pendingInvites.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-sm glass-panel rounded-3xl p-6 shadow-xl border border-white/30"
                        >
                            <p className={`${pPrimary} font-serif text-lg text-center mb-1`}>
                                有人想与你共享记忆
                            </p>
                            {pendingInvites.length > 1 && (
                                <p className={`${pMuted} text-xs text-center mb-4`}>
                                    您有 {pendingInvites.length} 条邀请
                                </p>
                            )}
                            <div className="flex gap-3 justify-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => handleAcceptInvite(pendingInvites[0].id)}
                                    className={`px-5 py-2.5 rounded-xl ${currentTheme.accentButton} text-sm font-medium transition-colors`}
                                >
                                    接受
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRejectInvite(pendingInvites[0].id)}
                                    className={`px-5 py-2.5 rounded-xl bg-white/60 ${pSecondary} text-sm font-medium hover:bg-white/80 transition-colors border ${currentTheme.panelPrimaryColor ? 'border-slate-300' : (currentTheme.accentMuted.split(' ')[1] || 'border-white/30')}`}
                                >
                                    拒绝
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Header */}
            <header className="fixed top-0 left-0 w-full p-6 md:p-10 z-40 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <h1 className={`font-serif text-4xl md:text-5xl font-medium tracking-tight ${currentTheme.primaryColor} transition-colors duration-500`}>21 Months</h1>
                    </motion.div>
                </div>
                
                <div className="pointer-events-auto flex items-start gap-3 md:gap-4 flex-wrap">
                    {/* 主题 / 登录 / 和ta连接：三个图标，点击展开对应面板；点击空白处关闭 */}
                    {(isSettingsOpen || isAuthOpen || isConnectOpen) && (
                        <div
                            className="fixed inset-0 z-30"
                            aria-hidden
                            onClick={() => { setIsSettingsOpen(false); setIsAuthOpen(false); setIsConnectOpen(false); }}
                        />
                    )}
                    <div className="relative z-40 flex items-center gap-3">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsAuthOpen(false); setIsConnectOpen(false); }}
                                className={`p-2 rounded-full backdrop-blur-md transition-all ${isSettingsOpen ? 'bg-white shadow-lg ' + currentTheme.primaryColor : `${currentTheme.glassColor} ${currentTheme.primaryColor} hover:bg-white/60`}`}
                                aria-label="主题"
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
                                        <span className={`text-[10px] font-bold uppercase px-1 mb-1 ${pFaded}`}>Select Theme</span>
                                        {THEMES.map(theme => (
                                            <button
                                                key={theme.id}
                                                onClick={() => handleThemeChange(theme)}
                                                className={`flex items-center gap-3 w-full p-2 rounded-xl transition-colors hover:bg-white/80 ${currentTheme.id === theme.id ? 'bg-white shadow-sm ring-1 ring-black/5' : ''}`}
                                            >
                                                <div className="w-6 h-6 rounded-full shadow-inner border border-black/5" style={{ background: theme.background }} />
                                                <span className={`text-xs font-medium ${currentTheme.id === theme.id ? pPrimary : pSecondary}`}>{theme.name}</span>
                                                {currentTheme.id === theme.id && <Check size={12} className={`ml-auto ${pPrimary}`} />}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => { setIsAuthOpen(!isAuthOpen); setIsSettingsOpen(false); setIsConnectOpen(false); }}
                                className={`p-2 rounded-full backdrop-blur-md transition-all ${isAuthOpen ? 'bg-white shadow-lg ' + currentTheme.primaryColor : `${currentTheme.glassColor} ${currentTheme.primaryColor} hover:bg-white/60`}`}
                                aria-label="登录"
                            >
                                <User size={20} />
                            </button>
                            <AnimatePresence>
                                {isAuthOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="absolute right-0 top-full mt-3 w-52 p-4 rounded-2xl bg-white/80 backdrop-blur-xl shadow-xl border border-white/50 flex flex-col gap-2 z-50 origin-top-right"
                                    >
                                        {currentUserEmail ? (
                                            <>
                                                <div className={`text-[10px] uppercase tracking-[0.2em] ${pFaded} font-bold`}>Signed in</div>
                                                <div className={`text-xs ${pPrimary} truncate`}>{currentUserEmail}</div>
                                                {myUsername === null && <p className={`text-[10px] ${pFaded} mt-1`}>请先设定用户名</p>}
                                                <div className="mt-2 space-y-1">
                                                    <label className={`text-[10px] uppercase tracking-wider ${pFaded} block`}>用户名</label>
                                                    <input
                                                        type="text"
                                                        value={usernameInput}
                                                        onChange={(e) => setUsernameInput(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUsername(); } }}
                                                        placeholder="用于替代 ta 显示，回车保存"
                                                        className={`w-full rounded-lg px-2 py-1 text-[11px] bg-white/70 border border-white/60 ${pPrimary} ${pPlaceholder}`}
                                                    />
                                                    {usernameSavedHint && <span className="text-[10px] text-green-600">已保存</span>}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleSignOut}
                                                    disabled={authLoading}
                                                    className={`mt-1 text-[10px] uppercase tracking-[0.2em] ${pMuted} hover:opacity-80 disabled:opacity-60 text-right`}
                                                >
                                                    {authLoading ? '正在退出…' : 'Sign out'}
                                                </button>
                                            </>
                                        ) : (
                                            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-1">
                                                <div className={`text-[10px] uppercase tracking-[0.2em] ${pFaded} font-bold`}>Sign in</div>
                                                <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className={`bg-white/70 border border-white/60 rounded-xl px-2 py-1 text-[11px] ${pPrimary} ${pPlaceholder} focus:outline-none focus:ring-1 focus:ring-white/50`} />
                                                <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className={`bg-white/70 border border-white/60 rounded-xl px-2 py-1 text-[11px] ${pPrimary} ${pPlaceholder} focus:outline-none focus:ring-1 focus:ring-white/50`} />
                                                {authError && <div className="text-[10px] text-rose-500 mt-1 line-clamp-2">{authError}</div>}
                                                <button type="submit" disabled={authLoading || !authEmail || !authPassword} className={`mt-1 self-end text-[10px] uppercase tracking-[0.2em] ${pMuted} hover:opacity-80 disabled:opacity-60`}>
                                                    {authLoading ? 'Signing in…' : 'Sign in'}
                                                </button>
                                            </form>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => { setIsConnectOpen(!isConnectOpen); setIsSettingsOpen(false); setIsAuthOpen(false); }}
                                className={`p-2 rounded-full backdrop-blur-md transition-all ${isConnectOpen ? 'bg-white shadow-lg ' + currentTheme.primaryColor : `${currentTheme.glassColor} ${currentTheme.primaryColor} hover:bg-white/60`}`}
                                aria-label="和ta连接"
                            >
                                <Link2 size={20} />
                            </button>
                            <AnimatePresence>
                                {isConnectOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="absolute right-0 top-full mt-3 w-52 p-4 rounded-2xl bg-white/80 backdrop-blur-xl shadow-xl border border-white/50 flex flex-col gap-2 z-50 origin-top-right"
                                    >
                                        {!currentUserEmail ? (
                                            <p className={`text-[10px] ${pFaded}`}>请先登录</p>
                                        ) : partnerId ? (
                                            <>
                                                <div className={`text-[10px] ${pFaded}`}>已和ta连接</div>
                                                <button
                                                    type="button"
                                                    onClick={handleDisconnect}
                                                    className={`mt-1 text-[10px] uppercase tracking-wider ${pMuted} hover:opacity-80`}
                                                >
                                                    取消链接
                                                </button>
                                            </>
                                        ) : (
                                            <form onSubmit={handleInviteByEmail} className="space-y-1">
                                                <label className={`text-[10px] uppercase tracking-wider ${pFaded} block`}>和ta连接（对方邮箱）</label>
                                                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="partner@example.com" className={`w-full rounded-lg px-2 py-1 text-[11px] bg-white/70 border border-white/60 ${pPrimary} ${pPlaceholder}`} />
                                                <button type="submit" disabled={inviteSending || !inviteEmail.trim()} className={`text-[10px] uppercase tracking-[0.2em] ${pMuted} hover:opacity-80 disabled:opacity-50`}>
                                                    {inviteSending ? '发送中…' : '发送邀请'}
                                                </button>
                                                {inviteSent && <span className="text-[10px] text-green-600 block">已发送</span>}
                                            </form>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* 日期范围 + 合并时显示视图切换（主界面简洁：仅在有合并视图时在右侧显示） */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} className="hidden md:flex flex-col items-end gap-2">
                        <div className={`text-xl font-light font-serif italic ${currentTheme.secondaryColor} transition-colors duration-500`}>
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
                            onDayClick={(day) => { setSelectedDay(day); setActiveBentoDay(day); }}
                            fadedTextColor={currentTheme.fadedColor}
                            moodOptions={moodOptions}
                            showMergeLegend={!!partnerId}
                            tooltipClass={currentTheme.tooltipClass ?? 'bg-plum-900/80 text-white backdrop-blur-sm'}
                            selectedDay={selectedDay}
                            startDate={START_DATE}
                            endDate={displayEndDate}
                            viewMode={viewMode}
                            onChangeViewMode={partnerId ? setViewMode : undefined}
                            timelineLeftClass={timelineLeftClass}
                            timelineRightClass={timelineRightClass}
                            timelineMonthClass={timelineMonthClass}
                        />
                    </motion.div>
                )}
            </main>

            {/* 新来信提示气泡：\"xx 给你写信了\"，贴近右下角爱心，造型与爱心颜色呼应 */}
            <AnimatePresence>
                {showLetterToast && partnerId && userId && unreadLettersCount > 0 && !lettersModalOpen && (
                    <motion.button
                        type="button"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        onClick={async () => {
                            setShowLetterToast(false);
                            await handleHeartClick();
                        }}
                        className="fixed bottom-20 right-8 z-40 group"
                    >
                        <div className="relative px-4 py-2 rounded-full bg-rose-400/55 text-white text-sm font-medium shadow-lg backdrop-blur-xl hover:bg-rose-400/70 group-active:scale-95 transition-transform">
                            {partnerDisplayName} 给你写信了
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* 右下角：仅爱心，表示写信/来信；有未读时粉红 + 跳动 + 提示 */}
            <motion.div
                role="button"
                tabIndex={0}
                onClick={handleHeartClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHeartClick(); } }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`fixed bottom-8 right-8 z-40 cursor-pointer select-none hover:opacity-90 ${unreadLettersCount > 0 ? 'text-rose-400 animate-heartbeat' : currentTheme.primaryColor}`}
                title={unreadLettersCount > 0 ? `${partnerDisplayName}给你写信了` : (partnerId ? '来信' : '今天 / 来信')}
                aria-label={partnerId ? '来信' : '今天'}
            >
                <Heart size={28} fill="currentColor" className="opacity-90 block" />
            </motion.div>

            {/* 写信弹窗 */}
            <AnimatePresence>
                {lettersModalOpen && partnerId && userId && (
                    <LettersModal
                        letters={letters}
                        currentUserId={userId}
                        partnerDisplayName={partnerDisplayName}
                        theme={currentTheme}
                        onClose={() => setLettersModalOpen(false)}
                        onOpenCompose={() => { setLettersModalOpen(false); setIsWriteLetterOpen(true); }}
                        onSend={handleSendLetter}
                        onMarkRead={handleMarkLetterRead}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isWriteLetterOpen && partnerId && userId && (
                    <WriteLetterModal
                        partnerId={partnerId}
                        partnerDisplayName={partnerDisplayName}
                        theme={currentTheme}
                        onSend={handleSendLetter}
                        onBack={() => { setIsWriteLetterOpen(false); setLettersModalOpen(true); }}
                        onClose={() => setIsWriteLetterOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Bento Detail View Overlay */}
            <AnimatePresence>
                {activeBentoDay && (
                    <BentoView 
                        day={activeBentoDay} 
                        moodOptions={moodOptions}
                        theme={currentTheme}
                        partnerDisplayName={partnerDisplayName}
                        onAddMood={handleAddMood}
                        onClose={() => setActiveBentoDay(null)}
                        onSaveMemory={handleSaveMemory}
                        isMergeView={viewMode === 'merge' && !!(activeBentoDay.memory || activeBentoDay.partnerMemory)}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

export default App;