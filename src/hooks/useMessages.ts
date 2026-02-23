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

  useEffect(() => {
    if (!auth.currentUser) return;

    let q;
    if (activeChatId) {
      q = query(collection(db, 'messages'), where('chatId', '==', activeChatId), orderBy('createdAt', 'asc'));
    } else {
      q = query(collection(db, 'messages'), where('receiverId', '==', auth.currentUser.uid), orderBy('createdAt', 'asc'));
    }

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
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
    });

    return () => unsubscribe();
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

  // UPDATED: Now accepts the pre-uploaded file details
  const sendAttachment = async (
    receiverId: string, 
    fileUrl: string, 
    text: string, 
    fileName: string, 
    fileType: string, 
    replyTo?: any
  ) => {
    if (!auth.currentUser) return;

    const finalChatId = activeChatId || [auth.currentUser.uid, receiverId].sort().join('_');

    const messageData: any = {
      chatId: finalChatId,
      senderId: auth.currentUser.uid,
      receiverId,
      text: text || '',
      fileUrl,
      fileName,
      fileType,
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

  const deleteForEveryone = async (messageId: string, fileUrl?: string) => {
    try {
      // 1. Mark as deleted and wipe the actual data from Firestore so it isn't taking up space
      await updateDoc(doc(db, 'messages', messageId), { 
        isDeleted: true,
        text: null,
        fileUrl: null,
        fileName: null,
        fileType: null
      });

      // 2. If this message had a file, physically delete it from your Firebase Storage bucket
      if (fileUrl) {
        const storage = getStorage();
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
        console.log("File successfully deleted from Firebase Storage!");
      }
    } catch (error) {
      console.error("Error deleting message or file:", error);
    }
  };

  return { 
    messages, 
    unreadCount, 
    sendMessage, 
    sendAttachment, 
    markAsRead, 
    deleteForMe, 
    deleteForEveryone 
  };
}