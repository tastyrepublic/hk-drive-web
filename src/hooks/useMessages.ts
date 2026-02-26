import { useState, useEffect } from 'react';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { db, auth } from '../firebase'; 
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  arrayUnion 
} from 'firebase/firestore';

export function useMessages(activeChatId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    if (!auth.currentUser) return;

    let q;
    if (activeChatId) {
      // THE PRO WAY: Added orderBy back for perfect server-side sorting
      q = query(
        collection(db, 'messages'), 
        where('chatId', '==', activeChatId),
        where('participants', 'array-contains', auth.currentUser.uid),
        orderBy('createdAt', 'asc') // <-- ADD THIS BACK
      );
    } else {
      q = query(
        collection(db, 'messages'), 
        where('receiverId', '==', auth.currentUser.uid)
      );
    }

    // --- THE PRO FIX: 50ms Debounce ---
    let unsubscribe: (() => void) | undefined;
    
    const timeoutId = setTimeout(() => {
      unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const loaded: any[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
            isPending: doc.metadata.hasPendingWrites 
          };
        }).filter((m: any) => !m.deletedFor?.includes(auth.currentUser?.uid));
      
        setMessages(loaded);
        
        const unread = loaded.filter(m => !m.isRead && m.receiverId === auth.currentUser?.uid).length;
        setUnreadCount(unread);
        setIsLoading(false);
      
        }, (error) => {
        // Look in your browser console for the Index link if this fires!
        console.error("🔥 Live Listener Error:", error.message);
      });
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeChatId, auth.currentUser?.uid]);

  const sendMessage = async (receiverId: string, text: string, replyTo?: any) => {
    if (!auth.currentUser || !text.trim()) return;
    const finalChatId = activeChatId || [auth.currentUser.uid, receiverId].sort().join('_');

    const messageData: any = {
      chatId: finalChatId,
      participants: [auth.currentUser.uid, receiverId], // <-- THE PRO FIX IS HERE
      senderId: auth.currentUser.uid,
      receiverId,
      text,
      isRead: false,
      isDeleted: false,
      deletedFor: [],
      createdAt: serverTimestamp()
    };

    if (replyTo) {
      messageData.replyTo = {
        id: replyTo.id,
        text: replyTo.text,
        senderId: replyTo.senderId
      };
    }

    await addDoc(collection(db, 'messages'), messageData);
  };

  const sendAttachments = async (
    receiverId: string, 
    attachments: { fileUrl: string; fileName: string; fileType: string }[], 
    text: string, 
    replyTo?: any
  ) => {
    if (!auth.currentUser) return;

    const finalChatId = activeChatId || [auth.currentUser.uid, receiverId].sort().join('_');

    const messageData: any = {
      chatId: finalChatId,
      participants: [auth.currentUser.uid, receiverId], // <-- THE PRO FIX IS HERE
      senderId: auth.currentUser.uid,
      receiverId,
      text: text || '',
      attachments, 
      isRead: false,
      isDeleted: false,
      deletedFor: [],
      createdAt: serverTimestamp()
    };

    if (replyTo) {
      messageData.replyTo = {
        id: replyTo.id,
        text: replyTo.text,
        senderId: replyTo.senderId
      };
    }

    await addDoc(collection(db, 'messages'), messageData);
  };

  const markAsRead = async (messageId: string) => {
    await updateDoc(doc(db, 'messages', messageId), { isRead: true });
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!auth.currentUser || !newText.trim()) return;
    await updateDoc(doc(db, 'messages', messageId), { 
      text: newText,
      isEdited: true 
    });
  };

  const deleteForMe = async (messageId: string) => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, 'messages', messageId), {
      deletedFor: arrayUnion(auth.currentUser.uid)
    });
  };

  const deleteForEveryone = async (messageId: string, attachments?: any[]) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), { 
        isDeleted: true,
        text: null,
        attachments: null 
      });

      if (attachments && attachments.length > 0) {
        const storage = getStorage();
        const deletePromises = attachments.map(att => {
          const fileRef = ref(storage, att.fileUrl);
          return deleteObject(fileRef);
        });
        
        await Promise.all(deletePromises);
        console.log("All attached files deleted from Storage!");
      } 
    } catch (error) {
      console.error("Error deleting message or file:", error);
    }
  };

  return { 
    messages, 
    unreadCount,
    isLoading, 
    sendMessage, 
    sendAttachments,
    editMessage,
    markAsRead, 
    deleteForMe, 
    deleteForEveryone 
  };
}