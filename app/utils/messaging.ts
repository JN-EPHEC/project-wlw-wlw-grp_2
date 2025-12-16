import { auth, db } from '../../firebaseConfig';
import { 
  collection,
  doc, 
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  isRead: boolean;
  createdAt: Timestamp | any;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: {
    [userId: string]: {
      username: string;
      profileImage?: string;
      profileEmoji?: string;
    };
  };
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Timestamp | any;
  };
  unreadCount: {
    [userId: string]: number;
  };
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

/**
 * 💬 Créer ou récupérer une conversation entre deux utilisateurs
 */
export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  if (user.uid === otherUserId) {
    throw new Error('Impossible de créer une conversation avec soi-même');
  }

  // Créer un ID de conversation unique (toujours dans le même ordre)
  const participants = [user.uid, otherUserId].sort();
  const conversationId = participants.join('_');

  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);

  // Si la conversation n'existe pas, la créer
  if (!conversationSnap.exists()) {
    // Récupérer les infos des deux participants
    const [currentUserDoc, otherUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDoc(doc(db, 'users', otherUserId))
    ]);

    const currentUserData = currentUserDoc.data();
    const otherUserData = otherUserDoc.data();

    await setDoc(conversationRef, {
      id: conversationId,
      participants: participants,
      participantDetails: {
        [user.uid]: {
          username: currentUserData?.username || 'Utilisateur',
          profileImage: currentUserData?.profileImage || null,
          profileEmoji: currentUserData?.profileEmoji || '👤',
        },
        [otherUserId]: {
          username: otherUserData?.username || 'Utilisateur',
          profileImage: otherUserData?.profileImage || null,
          profileEmoji: otherUserData?.profileEmoji || '👤',
        },
      },
      unreadCount: {
        [user.uid]: 0,
        [otherUserId]: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return conversationId;
}

/**
 * 📨 Envoyer un message
 */
export async function sendMessage(
  conversationId: string,
  text: string,
  imageUrl?: string,
  videoUrl?: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  if (!text?.trim() && !imageUrl && !videoUrl) {
    throw new Error('Le message ne peut pas être vide');
  }

  // Récupérer la conversation
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    throw new Error('Conversation introuvable');
  }

  const conversationData = conversationSnap.data();
  const participants = conversationData.participants as string[];

  // Vérifier que l'utilisateur fait partie de la conversation
  if (!participants.includes(user.uid)) {
    throw new Error('Non autorisé');
  }

  // Trouver le destinataire
  const receiverId = participants.find(id => id !== user.uid)!;

  // Créer le message
  const messageRef = doc(collection(db, 'messages'));
  await setDoc(messageRef, {
    id: messageRef.id,
    conversationId: conversationId,
    senderId: user.uid,
    receiverId: receiverId,
    text: text?.trim() || '',
    imageUrl: imageUrl || null,
    videoUrl: videoUrl || null,
    isRead: false,
    createdAt: serverTimestamp(),
  });

  // Mettre à jour la conversation
  await updateDoc(conversationRef, {
    lastMessage: {
      text: text?.trim() || (imageUrl ? '📷 Image' : '🎥 Vidéo'),
      senderId: user.uid,
      createdAt: serverTimestamp(),
    },
    [`unreadCount.${receiverId}`]: (conversationData.unreadCount?.[receiverId] || 0) + 1,
    updatedAt: serverTimestamp(),
  });

  return { 
    success: true, 
    messageId: messageRef.id 
  };
}

/**
 * 📖 Marquer les messages comme lus
 */
export async function markMessagesAsRead(conversationId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  // Récupérer tous les messages non lus de cette conversation
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    where('receiverId', '==', user.uid),
    where('isRead', '==', false)
  );

  const querySnapshot = await getDocs(q);

  // Marquer tous les messages comme lus
  const updatePromises = querySnapshot.docs.map(doc => 
    updateDoc(doc.ref, { isRead: true })
  );

  await Promise.all(updatePromises);

  // Réinitialiser le compteur de messages non lus
  const conversationRef = doc(db, 'conversations', conversationId);
  await updateDoc(conversationRef, {
    [`unreadCount.${user.uid}`]: 0,
  });

  return { success: true };
}

/**
 * 📚 Récupérer les messages d'une conversation
 */
export async function getMessages(conversationId: string, limitCount: number = 50) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  // Vérifier que l'utilisateur fait partie de la conversation
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    throw new Error('Conversation introuvable');
  }

  const participants = conversationSnap.data().participants as string[];
  if (!participants.includes(user.uid)) {
    throw new Error('Non autorisé');
  }

  // Récupérer les messages
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const messages = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Message[];

  return messages.reverse(); // Inverser pour avoir les plus anciens en premier
}

/**
 * 🔄 Écouter les messages en temps réel
 */
export function subscribeToMessages(
  conversationId: string,
  onMessagesUpdate: (messages: Message[]) => void
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  // Retourner la fonction unsubscribe
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];

    onMessagesUpdate(messages);
  });
}

/**
 * 💬 Récupérer toutes les conversations de l'utilisateur
 */
export async function getConversations() {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', user.uid),
    orderBy('updatedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const conversations = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Conversation[];

  return conversations;
}

/**
 * 🔄 Écouter les conversations en temps réel
 */
export function subscribeToConversations(
  onConversationsUpdate: (conversations: Conversation[]) => void
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', user.uid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Conversation[];

    onConversationsUpdate(conversations);
  });
}

/**
 * 🔢 Compter les messages non lus totaux
 */
export async function getTotalUnreadCount(): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;

  const conversations = await getConversations();
  
  const totalUnread = conversations.reduce((total, conv) => {
    return total + (conv.unreadCount?.[user.uid] || 0);
  }, 0);

  return totalUnread;
}

/**
 * 🗑️ Supprimer une conversation (pour l'utilisateur actuel uniquement)
 */
export async function deleteConversation(conversationId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');

  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    throw new Error('Conversation introuvable');
  }

  const conversationData = conversationSnap.data();
  const participants = conversationData.participants as string[];

  if (!participants.includes(user.uid)) {
    throw new Error('Non autorisé');
  }

  // Marquer comme cachée pour cet utilisateur
  await updateDoc(conversationRef, {
    [`hidden.${user.uid}`]: true,
  });

  return { success: true };
}