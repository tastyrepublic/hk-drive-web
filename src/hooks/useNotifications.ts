import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { AppNotification } from '../constants';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen for all notifications for the logged-in user, ordered by newest first
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<AppNotification, 'id'>;
        if (!data.isRead) unread++;
        notifs.push({ id: doc.id, ...data });
      });

      setNotifications(notifs);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, []);

  // --- ACTIONS ---

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read at once
  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      const unreadNotifs = notifications.filter(n => !n.isRead);
      
      unreadNotifs.forEach(n => {
        const notifRef = doc(db, 'notifications', n.id);
        batch.update(notifRef, { isRead: true });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}