import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

export function useMessages(activeChatId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    let q;
    if (activeChatId) {
      // 1. If a chat is open, ONLY load that specific room
      q = query(
        collection(db, 'messages'),
        where('chatId', '==', activeChatId),
        orderBy('createdAt', 'asc')
      );
    } else {
      // 2. Global Inbox: If no chat is open, look for unread messages sent TO me globally
      q = query(
        collection(db, 'messages'),
        where('receiverId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // FIXED: Added an explicit 'any[]' type so TypeScript trusts the Firebase data
      const loaded: any[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Safely extract the timestamp
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()
        };
      });

      // Re-sort locally just to be absolutely safe
      loaded.sort((a, b) => a.createdAt - b.createdAt);

      let unread = 0;
      loaded.forEach((msg) => {
         // Only count as unread if I am the receiver
         if (!msg.isRead && msg.receiverId === auth.currentUser?.uid) {
           unread++;
         }
      });

      setMessages(loaded);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const sendMessage = async (receiverId: string, text: string) => {
    if (!auth.currentUser) return;

    // Force the message to use the EXACT activeChatId the modal is looking at.
    const finalChatId = activeChatId || [auth.currentUser.uid, receiverId].sort().join('_');

    await addDoc(collection(db, 'messages'), {
      chatId: finalChatId,
      senderId: auth.currentUser.uid,
      receiverId,
      text,
      isRead: false,
      createdAt: serverTimestamp()
    });
  };

  const markAsRead = async (messageId: string) => {
    await updateDoc(doc(db, 'messages', messageId), {
      isRead: true
    });
  };

  return { messages, unreadCount, sendMessage, markAsRead };
}