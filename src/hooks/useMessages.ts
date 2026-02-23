import { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase'; 
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
// FIX: Swapped uploadBytes for uploadBytesResumable to track progress
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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
      });

      loaded.sort((a, b) => a.createdAt - b.createdAt);

      const visibleMessages = loaded.filter(msg => {
        const deletedForArray = msg.deletedFor || [];
        return !deletedForArray.includes(auth.currentUser?.uid);
      });

      let unread = 0;
      visibleMessages.forEach((msg) => {
         if (!msg.isRead && msg.receiverId === auth.currentUser?.uid && !msg.isDeleted) {
           unread++;
         }
      });

      setMessages(visibleMessages);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const sendMessage = async (receiverId: string, text: string, replyTo?: any) => {
    if (!auth.currentUser) return;
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

  // FEATURE: Added an onProgress callback to broadcast the percentage
  const sendAttachment = async (receiverId: string, file: File, replyTo?: any, onProgress?: (progress: number) => void) => {
    // 1. Get the ID immediately
    const userId = auth.currentUser?.uid;
    if (!userId) return; // If no user, exit early

    const finalChatId = activeChatId || [userId, receiverId].sort().join('_');

    return new Promise<void>((resolve, reject) => {
      const fileRef = ref(storage, `chat_attachments/${finalChatId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error("Upload failed", error);
          alert("Failed to upload attachment. Please try again.");
          reject(error);
        },
        async () => {
          const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);

          const messageData: any = {
            chatId: finalChatId,
            senderId: userId, // Use the 'userId' constant here
            receiverId,
            text: '',
            fileUrl: fileUrl, 
            fileName: file.name,
            fileType: file.type, 
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
          resolve();
        }
      );
    });
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

  const deleteForEveryone = async (messageId: string) => {
    await updateDoc(doc(db, 'messages', messageId), {
      isDeleted: true,
      text: "",
      fileUrl: null, 
      isRead: true,
    });
  };

  return { messages, unreadCount, sendMessage, sendAttachment, markAsRead, deleteForMe, deleteForEveryone };
}