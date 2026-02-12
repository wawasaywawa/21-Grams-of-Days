import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { DayData, Memory, MoodOption, Theme } from '../types';
import { X, Upload, Save, Mic, Trash2, Music, Plus, Check, Square, ImageIcon } from 'lucide-react';
import { fileToBase64, COLOR_THEMES } from '../utils';

interface EditModalProps {
    day: DayData;
    initialData?: Memory;
    moodOptions: MoodOption[];
    theme: Theme;
    onAddMood: (mood: MoodOption) => void;
    onClose: () => void;
    onSave: (data: Partial<Memory>) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ day, initialData, moodOptions, theme, onAddMood, onClose, onSave }) => {
    const pPrimary = theme.panelPrimaryColor ?? theme.primaryColor;
    const pSecondary = theme.panelSecondaryColor ?? theme.secondaryColor;
    const pFaded = theme.panelFadedColor ?? theme.fadedColor;
    const pPlaceholder = theme.panelPlaceholder ?? theme.accentPlaceholder;
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [mood, setMood] = useState<string>(initialData?.mood || '平淡');
    
    // Images State (Max 4)
    const [images, setImages] = useState<string[]>(initialData?.images || (initialData?.imageUrl ? [initialData.imageUrl] : []));
    
    const [voiceNote, setVoiceNote] = useState<string | undefined>(initialData?.voiceNoteUrl);
    
    // New Mood Creation State
    const [isCreatingMood, setIsCreatingMood] = useState(false);
    const [newMoodLabel, setNewMoodLabel] = useState('');
    const [newMoodColorBase, setNewMoodColorBase] = useState(COLOR_THEMES[0]);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    // Cleanup recording resources on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // Explicitly cast to File[] to avoid TypeScript treating it as unknown[]
            const files = Array.from(e.target.files) as File[];
            
            // Calculate how many we can add
            const remainingSlots = 4 - images.length;
            const filesToProcess = files.slice(0, remainingSlots);

            if (files.length > remainingSlots) {
                alert(`最多只能上传4张照片。已添加前 ${remainingSlots} 张。`);
            }
            
            const newImages: string[] = [];
            for (const file of filesToProcess) {
                try {
                    const base64 = await fileToBase64(file);
                    // Prevent duplicates to ensure Reorder keys are unique
                    if (!images.includes(base64) && !newImages.includes(base64)) {
                        newImages.push(base64);
                    }
                } catch (err) {
                    console.error("Failed to upload image", err);
                }
            }

            setImages(prev => [...prev, ...newImages]);
        }
        // Reset input to allow selecting same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (indexToRemove: number) => {
        setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                 alert("文件过大，请上传小于 5MB 的音频。");
                 return;
            }
            try {
                const base64 = await fileToBase64(file);
                setVoiceNote(base64);
            } catch (err) {
                console.error("Failed to upload audio", err);
            }
        }
    };

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
                
                try {
                     const base64 = await fileToBase64(audioBlob);
                     setVoiceNote(base64);
                } catch (e) {
                    console.error("Failed to process recording", e);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("无法访问麦克风，请检查权限设置或确保使用 HTTPS/Localhost。");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCreateMood = () => {
        if (!newMoodLabel.trim()) return;
        const newMood: MoodOption = {
            label: newMoodLabel.trim(),
            colorClass: newMoodColorBase.class,
            baseColor: newMoodColorBase.name
        };
        onAddMood(newMood);
        setMood(newMood.label);
        setNewMoodLabel('');
        setIsCreatingMood(false);
    };

    const handleSave = () => {
        onSave({
            dateStr: day.dateStr,
            title,
            description,
            mood,
            images,
            imageUrl: images.length > 0 ? images[0] : undefined, // Legacy support
            voiceNoteUrl: voiceNote,
            tags: []
        });
    };

    return (
        <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div 
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
            >
                <div className={`p-6 border-b border-white/20 flex justify-between items-center ${theme.glassColor}`}>
                    <h3 className={`font-serif text-xl ${pPrimary}`}>编辑记忆</h3>
                    <button onClick={onClose} className={`p-2 hover:bg-white/40 rounded-full ${pSecondary} transition-colors`}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    {/* Title Input */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider ${pFaded} mb-2`}>标题</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="给今天起个名字..."
                            className={`w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 focus:bg-white focus:ring-2 focus:ring-white/50 transition-all font-serif text-lg ${pPrimary} ${pPlaceholder}`}
                        />
                    </div>

                    {/* Mood Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${pFaded}`}>心情</label>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                            {moodOptions.map(m => (
                                <button
                                    key={m.label}
                                    onClick={() => setMood(m.label)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mood === m.label ? m.colorClass + ' ring-2 ring-offset-1 ring-white/50 shadow-md' : 'bg-white/60 text-gray-500 hover:bg-white/80'}`}
                                >
                                    {m.label}
                                </button>
                            ))}
                            <button
                                onClick={() => setIsCreatingMood(!isCreatingMood)}
                                className={`px-2 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${isCreatingMood ? theme.accentButton : theme.panelPrimaryColor ? 'bg-white border border-dashed border-slate-300 ' + pFaded : 'bg-white border border-dashed ' + theme.accentMuted}`}
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Add New Mood Panel */}
                        <AnimatePresence>
                            {isCreatingMood && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                value={newMoodLabel}
                                                onChange={(e) => setNewMoodLabel(e.target.value)}
                                                placeholder="心情标签..."
                                                className={`flex-1 px-3 py-2 rounded-lg text-sm border border-white/40 focus:ring-2 focus:ring-white/50 ${pPrimary}`}
                                            />
                                            <button 
                                                onClick={handleCreateMood}
                                                disabled={!newMoodLabel.trim()}
                                                className={`px-3 py-2 ${theme.accentButton} rounded-lg disabled:opacity-50`}
                                            >
                                                <Check size={16} />
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 mb-2 uppercase font-bold">选择颜色</p>
                                            <div className="flex flex-wrap gap-2">
                                                {COLOR_THEMES.map(colorTheme => (
                                                    <button
                                                        key={colorTheme.name}
                                                        onClick={() => setNewMoodColorBase(colorTheme)}
                                                        className={`w-6 h-6 rounded-full border-2 ${colorTheme.class.split(' ')[0]} ${newMoodColorBase.name === colorTheme.name ? 'scale-110 ring-2 ring-offset-1 ring-black/20' : 'border-transparent hover:scale-110'}`}
                                                        style={{ backgroundColor: colorTheme.hex }}
                                                        title={colorTheme.name}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Description */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider ${pFaded} mb-2`}>故事</label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="今天发生了什么？"
                            rows={4}
                            className={`w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 focus:bg-white focus:ring-2 focus:ring-white/50 transition-all text-sm ${pSecondary} ${pPlaceholder} resize-none`}
                        />
                    </div>

                    {/* Image Upload (Multi + Reorder) */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${pFaded}`}>照片 ({images.length}/4) - 长按拖动排序</label>
                        </div>
                        
                        <Reorder.Group 
                            axis="y"
                            as="div"
                            values={images}
                            onReorder={setImages}
                            className="grid grid-cols-2 gap-3 mb-3"
                        >
                            {images.map((img, index) => (
                                <Reorder.Item 
                                    key={img} 
                                    value={img}
                                    whileDrag={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(0,0,0,0.15)" }}
                                    className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200 shadow-sm cursor-move touch-none"
                                >
                                    <img src={img} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent drag start when clicking remove
                                            removeImage(index);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                                        onPointerDown={(e) => e.stopPropagation()} // Stop drag initiation
                                    >
                                        <X size={14} />
                                    </button>
                                </Reorder.Item>
                            ))}
                            
                            {images.length < 4 && (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`aspect-square rounded-xl border-2 border-dashed hover:bg-white/50 transition-colors cursor-pointer flex flex-col items-center justify-center group ${theme.panelPrimaryColor ? `border-slate-300 ${theme.glassColor} ${pFaded}` : theme.accentMuted + ' ' + theme.glassColor + ' ' + theme.fadedColor}`}
                                >
                                    <div className="p-3 rounded-full bg-white group-hover:scale-110 transition-transform shadow-sm">
                                        <Plus size={24} />
                                    </div>
                                    <span className="text-xs mt-2 font-medium">添加照片</span>
                                </div>
                            )}
                        </Reorder.Group>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                        />
                    </div>

                    {/* Voice Note Section */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider ${pFaded} mb-2`}>语音</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="file" 
                                ref={audioInputRef} 
                                className="hidden" 
                                accept="audio/*"
                                onChange={handleAudioUpload}
                            />

                            {voiceNote ? (
                                <>
                                    <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-700">
                                        <Music size={18} />
                                        <span className="text-sm font-medium flex-1">音频已添加</span>
                                    </div>
                                    <button 
                                        onClick={() => setVoiceNote(undefined)}
                                        className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-colors"
                                        title="删除语音"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            ) : isRecording ? (
                                <button
                                    onClick={handleStopRecording}
                                    className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 animate-pulse"
                                >
                                    <Square size={18} fill="currentColor" />
                                    <span className="text-sm font-bold font-mono">{formatTime(recordingTime)}</span>
                                    <span className="text-sm">点击停止录音</span>
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={handleStartRecording}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed hover:bg-white/50 transition-all ${theme.panelPrimaryColor ? `border-slate-300 ${theme.glassColor} ${pSecondary}` : theme.accentMuted + ' ' + theme.glassColor + ' ' + theme.secondaryColor}`}
                                    >
                                        <Mic size={18} />
                                        <span className="text-sm font-medium">录音</span>
                                    </button>
                                    <button 
                                        onClick={() => audioInputRef.current?.click()}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed bg-white hover:bg-white/80 transition-all ${theme.panelPrimaryColor ? `border-slate-300 ${pSecondary}` : theme.accentMuted + ' ' + theme.accentMuted.split(' ')[0]}`}
                                    >
                                        <Upload size={18} />
                                        <span className="text-sm font-medium">上传</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`p-6 border-t border-white/20 ${theme.glassColor}`}>
                    <button 
                        onClick={handleSave}
                        className={`w-full py-3 ${theme.accentButton} rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2`}
                    >
                        <Save size={18} />
                        保存记忆
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};