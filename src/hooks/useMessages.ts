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
      // KEEP orderBy here: The ChatBox needs messages in chronological order.
      q = query(collection(db, 'messages'), where('chatId', '==', activeChatId), orderBy('createdAt', 'asc'));
    } else {
      // REMOVE orderBy here: We only need to fetch the messages to count the red dots!
      q = query(collection(db, 'messages'), where('receiverId', '==', auth.currentUser.uid));
    }

    // --- THE PRO FIX: 50ms Debounce ---
    // This protects the Firebase SDK from internal assertion crashes due to rapid unmounts
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
        // ADD THIS ERROR HANDLER:
        console.error("🔥 Live Listener Error:", error.message);
      });
    }, 50);

    // CLEANUP: If the user clicks away before 50ms, the timeout is cleared 
    // and the buggy Firebase connection is never even attempted.
    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeChatId]);

  const sendMessage = async (receiverId: string, text: string, replyTo?: any) => {
    if (!auth.currentUser || !text.trim()) return;
    const finalChatId = activeChatId || [auth.currentUser.uid, receiverId].sort().join('_');

    const messageData: any = {
      chatId: finalChatId,
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
      senderId: auth.currentUser.uid,
      receiverId,
      text: text || '',
      attachments, // Pure array, no single file fallbacks
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

  const deleteForMe = async (messageId: string) => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, 'messages', messageId), {
      deletedFor: arrayUnion(auth.currentUser.uid)
    });
  };

  // Cleaned up: Only maps through the array to delete files
  const deleteForEveryone = async (messageId: string, attachments?: any[]) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), { 
        isDeleted: true,
        text: null,
        attachments: null // Wipe the array from the database
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
    markAsRead, 
    deleteForMe, 
    deleteForEveryone 
  };
}