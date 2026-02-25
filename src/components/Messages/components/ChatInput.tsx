import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Paperclip, FileText, Smile } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth, storage } from '../../../firebase'; 
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { UploadTask } from 'firebase/storage';
import { EmojiPickerMenu } from './EmojiPickerMenu';

const generateThumbnail = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 50; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.4)); 
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  onSendAttachment: (attachments: { fileUrl: string, fileName: string, fileType: string, thumbnail: string | null }[], text: string) => Promise<void>;
  replyingTo: any | null;
  setReplyingTo: (msg: any | null) => void;
  receiverName: string;
  isDark: boolean;
}

const MAX_CHARS = 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (Adjust this number as needed)

type StagedFile = {
  id: string;
  file: File;
  previewUrl: string | null;
  progress: number;
  uploadedUrl: string | null;
  storagePath: string | null;
  task: UploadTask | null;
  thumbnail: string | null;
};

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
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stagedFilesRef = useRef<StagedFile[]>([]);
  
  // Ref for the entire chat input container to detect outside clicks
  const chatInputContainerRef = useRef<HTMLDivElement>(null);

  const isUploading = stagedFiles.some(f => !f.uploadedUrl);

  useEffect(() => {
    stagedFilesRef.current = stagedFiles;
  }, [stagedFiles]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [inputText]);

  // HARD RESET: When switching to a different student, clear everything to prevent accidental sends
  useEffect(() => {
    // 1. Clean up any currently staging or uploaded files to prevent orphaned files in Firebase
    stagedFilesRef.current.forEach(file => {
      if (file.task && file.progress < 100) file.task.cancel();
      if (file.uploadedUrl && file.storagePath) {
        deleteObject(ref(storage, file.storagePath)).catch(console.error);
      }
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    });

    // 2. Reset all states back to default
    setStagedFiles([]);
    setInputText('');
    setShowEmojiPicker(false);
    setReplyingTo(null);

    // 3. Reset the text area height back to normal
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  }, [receiverName, setReplyingTo]);

  // Handle clicking outside the ChatInput or pressing Escape
  useEffect(() => {
    const handleOutsideClickAndEsc = (event: MouseEvent | KeyboardEvent) => {
      // 1. Handle Escape Key
      if (event.type === 'keydown' && (event as KeyboardEvent).key === 'Escape') {
        setShowEmojiPicker(false);
        return;
      }

      // 2. Handle Click Outside
      if (
        event.type === 'mousedown' && 
        chatInputContainerRef.current && 
        !chatInputContainerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    // Only attach the listeners if the picker is actually open
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleOutsideClickAndEsc);
      document.addEventListener('keydown', handleOutsideClickAndEsc);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClickAndEsc);
      document.removeEventListener('keydown', handleOutsideClickAndEsc);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    const cleanupOrphanedFiles = () => {
      stagedFilesRef.current.forEach(file => {
        if (file.task && file.progress < 100) file.task.cancel();
        if (file.uploadedUrl && file.storagePath) {
          deleteObject(ref(storage, file.storagePath)).catch(console.error);
        }
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      });
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stagedFilesRef.current.length > 0) {
        cleanupOrphanedFiles();
        e.preventDefault(); 
        e.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      cleanupOrphanedFiles();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleEmojiSelect = useCallback((emoji: any) => {
    setInputText(prev => prev + emoji.native);
  }, []);

  const startBackgroundUpload = (stagedId: string, file: File) => {
    const storagePath = `chat_attachments/${auth.currentUser?.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    const metadata = {
      contentType: file.type,
      cacheControl: 'public,max-age=31536000', 
    };
    
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    setStagedFiles(prev => prev.map(f => f.id === stagedId ? { ...f, task: uploadTask, storagePath } : f));

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setStagedFiles(prev => prev.map(f => f.id === stagedId ? { ...f, progress } : f));
      },
      (error) => {
        if (error.code !== 'storage/canceled') console.error("Upload failed:", error);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setStagedFiles(prev => prev.map(f => f.id === stagedId ? { ...f, uploadedUrl: url, progress: 100 } : f));
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  // 1. FILTER: Remove any files that exceed the size limit
  const validSizeFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
  const oversizedCount = files.length - validSizeFiles.length;

  if (oversizedCount > 0) {
    setFileWarning(t('chat.fileTooLarge', `${oversizedCount} file(s) were too large. Max size is 10MB.`));
    setTimeout(() => setFileWarning(null), 4000);
  }

  if (!validSizeFiles.length) {
    e.target.value = '';
    return;
  }

  // 2. COUNT LIMIT: Only add files up to the 10-slot limit
  const availableSlots = 10 - stagedFiles.length;
  if (availableSlots <= 0) {
    e.target.value = '';
    return;
  }

  const filesToAdd = validSizeFiles.slice(0, availableSlots);
  
  if (validSizeFiles.length > availableSlots) {
    setFileWarning(t('chat.maxFilesLimit', `Only the first ${availableSlots} valid files were added.`));
    setTimeout(() => setFileWarning(null), 4000);
  }

  const newStaged: StagedFile[] = filesToAdd.map(file => ({
    id: Math.random().toString(36).substring(7),
    file,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    progress: 0,
    uploadedUrl: null,
    storagePath: null,
    task: null,
    thumbnail: null
  }));

  setStagedFiles(prev => [...prev, ...newStaged]);
  
  newStaged.forEach(async (staged) => {
    const thumb = await generateThumbnail(staged.file);
    setStagedFiles(current => 
      current.map(f => f.id === staged.id ? { ...f, thumbnail: thumb } : f)
    );
    startBackgroundUpload(staged.id, staged.file);
  });
  
  e.target.value = ''; 
};

  const removeFile = (id: string) => {
    const fileToRemove = stagedFiles.find(f => f.id === id);
    if (!fileToRemove) return;

    if (fileToRemove.task) fileToRemove.task.cancel();
    
    if (fileToRemove.uploadedUrl && fileToRemove.storagePath) {
      deleteObject(ref(storage, fileToRemove.storagePath)).catch(console.error);
    }

    if (fileToRemove.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl);
    setStagedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSend = async () => {
    if (!inputText.trim() && stagedFiles.length === 0) return;
    if (isUploading) return; 

    const text = inputText.trim();
    
    const attachments = stagedFiles.map(f => ({
      fileUrl: f.uploadedUrl!,
      fileName: f.file.name,
      fileType: f.file.type,
      thumbnail: f.thumbnail
    }));
    
    setInputText('');
    setStagedFiles([]);
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    
    try {
      if (attachments.length > 0) {
        await onSendAttachment(attachments, text); 
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
    <div ref={chatInputContainerRef} className={`flex flex-col shrink-0 w-full min-w-0 border-t relative z-10 ${borderTheme} ${isDark ? 'bg-slate/50' : 'bg-white'}`}>
      
      <AnimatePresence>
        {fileWarning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden w-full bg-red-500/10"
          >
            <div className="px-4 py-2 flex items-center justify-between text-xs font-medium text-red-500 border-b border-red-500/20">
              <span>{fileWarning}</span>
              <button 
                onClick={() => setFileWarning(null)} 
                className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {stagedFiles.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`overflow-hidden w-full border-b ${borderTheme}`}
          >
            <div className={`px-4 pt-3 pb-1 flex justify-between items-center text-xs font-bold ${textMuted}`}>
              <span>{t('chat.attachedFiles', 'Attached Files')}</span>
              <span className={stagedFiles.length >= 10 ? 'text-primary' : ''}>
                {stagedFiles.length} / 10
              </span>
            </div>

            <div className="px-4 pb-4 pt-1 grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3 w-full max-h-[220px] overflow-y-auto custom-scrollbar">
              <AnimatePresence> 
                {stagedFiles.map((staged) => (
                  <motion.div 
                    key={staged.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15 }} 
                    className="relative group w-full aspect-square shrink-0"
                  >
                    <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-sm border transition-colors ${
                      isDark ? 'border-gray-700 bg-white/5 group-hover:border-gray-600' : 'border-gray-200 bg-gray-50 group-hover:border-gray-300'
                    }`}>
                      {staged.previewUrl ? (
                        <img src={staged.previewUrl} className="w-full h-full object-cover" alt="preview" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <FileText size={24} className="text-primary opacity-80" />
                          <span className={`text-[9px] font-bold truncate w-full text-center mt-1 px-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {staged.file.name}
                          </span>
                        </div>
                      )}

                      {staged.progress < 100 && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-[1px]">
                          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-1" />
                          <span className="text-[8px] text-white font-bold">{Math.round(staged.progress)}%</span>
                        </div>
                      )}

                      <button 
                        onClick={() => removeFile(staged.id)} 
                        className={`absolute top-1 right-1 p-1.5 rounded-full transition-all 
                          opacity-0 group-hover:opacity-100 z-10 backdrop-blur-md
                          ${isDark ? 'bg-black/40 text-white hover:bg-red-500/40' : 'bg-white/60 text-gray-700 hover:bg-red-500 hover:text-white'}`}
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <AnimatePresence initial={false}>
        {showEmojiPicker && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 214, opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`overflow-hidden border-b ${borderTheme} ${isDark ? 'bg-[#161B22]' : 'bg-gray-50'}`}
          >
            <div className="h-[214px] w-full"> 
              <EmojiPickerMenu onSelect={handleEmojiSelect} isDark={isDark} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3">
        <div className="flex items-end gap-2 relative">
          
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || stagedFiles.length >= 10}
            className={`p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center h-[44px] 
              ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'}
              ${(isUploading || stagedFiles.length >= 10) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Paperclip size={20} />
          </button>

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center h-[44px] 
              ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'}
              ${showEmojiPicker ? 'text-primary bg-primary/10' : ''}`}
          >
            <Smile size={20} />
          </button>

          <div className={`flex-1 flex flex-col min-h-[44px] border rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary ${borderTheme} ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
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
              className={`w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDark ? 'text-white' : 'text-gray-900'}`}
              rows={1}
              style={{ height: '44px' }}
            />
            
            <AnimatePresence>
              {inputText.length > MAX_CHARS * 0.8 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <div className={`px-4 pb-2 text-right text-[10px] font-bold transition-colors duration-200 ${
                    inputText.length >= MAX_CHARS 
                      ? 'text-primary' 
                      : 'text-white/60'
                  }`}>
                    {inputText.length} / {MAX_CHARS}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={handleSend}
            disabled={(!inputText.trim() && stagedFiles.length === 0) || isUploading}
            className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm flex items-center justify-center h-[44px]"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}