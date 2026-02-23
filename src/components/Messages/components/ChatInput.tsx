import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Paperclip, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth, storage } from '../../../firebase'; 
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { UploadTask } from 'firebase/storage'; // Add 'type' here

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  // Updated signature to handle the pre-uploaded file data
  onSendAttachment: (fileData: { url: string, name: string, type: string }, text: string) => Promise<void>;
  replyingTo: any | null;
  setReplyingTo: (msg: any | null) => void;
  receiverName: string;
  isDark: boolean;
}

const MAX_CHARS = 1000;

export function ChatInput({ 
  onSendMessage, 
  onSendAttachment, 
  replyingTo, 
  setReplyingTo, 
  receiverName, 
  isDark 
}: ChatInputProps) {
  const { t } = useTranslation();
  
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const uploadTaskRef = useRef<UploadTask | null>(null);
  const fullStoragePathRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memory cleanup for object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'; 
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 128)}px`; 
    }
  };

  const startBackgroundUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const storagePath = `chat_attachments/${auth.currentUser?.uid}/${Date.now()}_${file.name}`;
    fullStoragePathRef.current = storagePath;
    const storageRef = ref(storage, storagePath);
    
    // Using uploadBytesResumable to track percentage progress
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTaskRef.current = uploadTask;

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        if (error.code !== 'storage/canceled') console.error("Upload failed:", error);
        setIsUploading(false);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setUploadedUrl(url);
        setIsUploading(false);
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStagedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      }
      startBackgroundUpload(file); // Instant background upload
    }
    e.target.value = '';
  };

  const clearStagedFile = async () => {
    // 1. Cancel active network request if still uploading
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }

    // 2. Delete the file from Storage if it already finished
    if (uploadedUrl && fullStoragePathRef.current) {
      const fileRef = ref(storage, fullStoragePathRef.current);
      deleteObject(fileRef).catch(error => console.error("Cleanup failed:", error));
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStagedFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !stagedFile) return;
    if (isUploading) return; // Wait for background upload to complete

    const text = inputText.trim();
    const fileInfo = (stagedFile && uploadedUrl) ? {
      url: uploadedUrl,
      name: stagedFile.name,
      type: stagedFile.type
    } : null;
    
    setInputText('');
    setStagedFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    
    try {
      if (fileInfo) {
        await onSendAttachment(fileInfo, text);
      } else {
        await onSendMessage(text);
      }
      setReplyingTo(null); 
    } catch (error) {
      console.error("Send failed", error);
    }
  };

  const borderTheme = isDark ? 'border-gray-800' : 'border-gray-200';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`flex flex-col shrink-0 border-t ${borderTheme} ${isDark ? 'bg-slate/50' : 'bg-white'}`}>
      
      {/* 1. STAGED FILE PREVIEW - Gemini Style */}
      <AnimatePresence initial={false}>
        {stagedFile && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={`px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar border-b ${borderTheme}`}>
              <div className="relative group shrink-0">
                <div className={`relative w-20 h-20 rounded-2xl overflow-hidden shadow-sm border transition-colors ${
                  isDark ? 'border-gray-700 bg-white/5 group-hover:border-gray-600' : 'border-gray-200 bg-gray-50 group-hover:border-gray-300'
                }`}>
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <FileText size={24} className="text-primary opacity-80" />
                      <span className={`text-[9px] font-bold truncate w-full text-center mt-1 px-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {stagedFile.name}
                      </span>
                    </div>
                  )}

                  {/* Uploading Spinner Overlay with Percentage */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-[1px]">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-1" />
                      <span className="text-[8px] text-white font-bold">{Math.round(uploadProgress)}%</span>
                    </div>
                  )}

                  {/* Inner Remove Button - Top Right & Hover Only */}
                  <button 
                    onClick={clearStagedFile} 
                    className={`absolute top-1 right-1 p-1.5 rounded-full transition-all 
                      opacity-0 group-hover:opacity-100 z-10 backdrop-blur-md
                      ${isDark ? 'bg-black/40 text-white hover:bg-red-500/40' : 'bg-white/60 text-gray-700 hover:bg-red-500 hover:text-white'}`}
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. REPLY AREA */}
      <AnimatePresence initial={false}>
        {replyingTo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={`flex items-center justify-between px-4 py-2 text-sm border-b ${borderTheme}`}>
              <div className="flex flex-col border-l-4 border-primary pl-3 overflow-hidden flex-1 mr-4">
                <span className={`font-bold text-[11px] mb-0.5 text-primary uppercase`}>
                  {replyingTo.senderId === auth.currentUser?.uid ? t('chat.you', 'You') : receiverName}
                </span>
                <span className={`truncate text-xs ${textMuted}`}>{replyingTo.text || 'File'}</span>
              </div>
              <button 
                onClick={() => setReplyingTo(null)} 
                className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3">
        <div className="flex items-end gap-2">
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center h-[44px] ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`}
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={inputText}
            maxLength={MAX_CHARS}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('chat.typeMessage', 'Type a message...')}
            className={`flex-1 min-h-[44px] bg-transparent border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${borderTheme} ${isDark ? 'text-white' : 'text-gray-900'}`}
            rows={1}
            style={{ height: '44px' }}
          />
          
          <button 
            onClick={handleSend}
            disabled={(!inputText.trim() && !stagedFile) || isUploading}
            className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm flex items-center justify-center h-[44px]"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}