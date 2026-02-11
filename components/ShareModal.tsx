import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, Heart, FileJson, CheckCircle, AlertCircle } from 'lucide-react';
import { Memory, MoodOption } from '../types';

interface ShareModalProps {
    onClose: () => void;
    onExport: () => void;
    onImport: (file: File) => Promise<void>;
}

export const ShareModal: React.FC<ShareModalProps> = ({ onClose, onExport, onImport }) => {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('loading');
        try {
            await onImport(file);
            setImportStatus('success');
            setStatusMessage('记忆已成功融合！快去看看那些共同的日子吧。');
        } catch (error) {
            console.error(error);
            setImportStatus('error');
            setStatusMessage('导入失败，请确保文件格式正确 (JSON)。');
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-plum-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div 
                className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-rose-50 to-purple-50">
                    <h3 className="font-serif text-xl text-plum-900 flex items-center gap-2">
                        <Heart size={20} className="text-rose-400 fill-rose-400" />
                        交换记忆
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full text-plum-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button 
                        onClick={() => setActiveTab('export')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'export' ? 'text-plum-700 bg-white border-b-2 border-plum-500' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                    >
                        发送 (Export)
                    </button>
                    <button 
                        onClick={() => setActiveTab('import')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'import' ? 'text-plum-700 bg-white border-b-2 border-plum-500' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                    >
                        融合 (Merge)
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
                    <AnimatePresence mode="wait">
                        {activeTab === 'export' ? (
                            <motion.div 
                                key="export"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="w-full space-y-6"
                            >
                                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500 mb-4">
                                    <Download size={32} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-plum-900 mb-2">分享你的星河</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        将你的记忆导出为文件，发送给 TA。<br/>
                                        当 TA 导入这份文件时，你们的记忆将交织在一起。
                                    </p>
                                </div>
                                <button 
                                    onClick={onExport}
                                    className="w-full py-3 bg-plum-600 hover:bg-plum-700 text-white rounded-xl font-medium shadow-lg shadow-plum-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <FileJson size={18} />
                                    下载记忆文件
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="import"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full space-y-6"
                            >
                                {importStatus === 'success' ? (
                                    <div className="space-y-4">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
                                            <CheckCircle size={32} />
                                        </div>
                                        <h4 className="text-lg font-bold text-plum-900">融合成功</h4>
                                        <p className="text-sm text-gray-500">{statusMessage}</p>
                                        <button 
                                            onClick={onClose}
                                            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors mt-4"
                                        >
                                            返回星图
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-500 mb-4">
                                            <Upload size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-plum-900 mb-2">融合 TA 的记忆</h4>
                                            <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                                选择 TA 发送给你的记忆文件。<br/>
                                                系统会自动合并同一天的记录，保留两份美好。
                                            </p>
                                            {importStatus === 'error' && (
                                                <div className="flex items-center justify-center gap-2 text-red-500 text-xs bg-red-50 p-2 rounded-lg mb-4">
                                                    <AlertCircle size={14} />
                                                    {statusMessage}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept=".json" 
                                            className="hidden" 
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={importStatus === 'loading'}
                                            className="w-full py-3 bg-plum-600 hover:bg-plum-700 text-white rounded-xl font-medium shadow-lg shadow-plum-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {importStatus === 'loading' ? (
                                                <span className="animate-pulse">正在融合星轨...</span>
                                            ) : (
                                                <>
                                                    <Upload size={18} />
                                                    选择文件导入
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};