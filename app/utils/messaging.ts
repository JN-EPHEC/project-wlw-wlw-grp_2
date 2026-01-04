import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

// ✅ Export de l'interface Conversation (Règle l'erreur 2305)
export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: {
    [key: string]: {
      username: string;
      profileImage: string;
    }
  };
  unreadCount?: {
    [key: string]: number;
  };
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: any;
  };
  updatedAt: any;
}

// ✅ Export de la fonction subscribeToConversations (Règle l'erreur 2305)
export const subscribeToConversations = (callback: (conversations: Conversation[]) => void) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  // Cette requête nécessite un index Firestore (le lien bleu dans votre console)
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', user.uid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Conversation));
    callback(conversations);
  }, (error) => {
    console.error("Erreur snapshot conversations:", error);
  });
};

// Fonction pour créer ou récupérer une conversation existante
export const getOrCreateConversation = async (targetUserId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Non authentifié");

  // 1. Chercher si la conversation existe déjà
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', currentUser.uid)
  );

  const querySnapshot = await getDocs(q);
  const existingConv = querySnapshot.docs.find(doc => {
    const participants = doc.data().participants as string[];
    return participants.includes(targetUserId);
  });

  if (existingConv) return existingConv.id;

  // 2. Récupérer les détails pour le formatage
  const [meSnap, targetSnap] = await Promise.all([
    getDoc(doc(db, 'users', currentUser.uid)),
    getDoc(doc(db, 'users', targetUserId))
  ]);

  // 3. Création de la nouvelle conversation
  // IMPORTANT : Doit inclure l'UID dans 'participants' pour vos règles Firestore
  const newConvData = {
    participants: [currentUser.uid, targetUserId], 
    participantDetails: {
      [currentUser.uid]: {
        username: meSnap.data()?.prenom || "Utilisateur",
        profileImage: meSnap.data()?.photoURL || ""
      },
      [targetUserId]: {
        username: targetSnap.data()?.prenom || "Utilisateur",
        profileImage: targetSnap.data()?.photoURL || ""
      }
    },
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    lastMessage: {
      text: "Nouvelle conversation",
      senderId: currentUser.uid,
      createdAt: serverTimestamp()
    },
    unreadCount: {
      [currentUser.uid]: 0,
      [targetUserId]: 0
    }
  };

  const docRef = await addDoc(collection(db, 'conversations'), newConvData);
  return docRef.id;
};