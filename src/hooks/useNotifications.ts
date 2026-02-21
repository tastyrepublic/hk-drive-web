import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
// --- ADDED: orderBy and limit ---
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import type { AppNotification } from '../constants';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      // --- THE ENTERPRISE FIX: Server-side sorting with a strict limit ---
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50) // Only fetch the 50 most recent!
      );

      const unsubscribeDocs = onSnapshot(q, (snapshot) => {
        const notifs: AppNotification[] = [];
        let unread = 0;

        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<AppNotification, 'id'>;
          if (!data.isRead) unread++;
          notifs.push({ id: doc.id, ...data });
        });

        // We don't need to sort in JavaScript anymore, Firebase did it!
        setNotifications(notifs);
        setUnreadCount(unread);
      }, (error) => {
        console.error("Firebase Snapshot Error:", error.message);
      });

      return () => unsubscribeDocs();
    });

    return () => unsubscribeAuth();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

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

  const clearAllNotifications = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        const notifRef = doc(db, 'notifications', n.id);
        batch.delete(notifRef);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications };
}