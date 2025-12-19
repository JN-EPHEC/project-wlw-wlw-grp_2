import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

interface UserProfile {
  uid: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'apprenant' | 'formateur';
  onboardingCompleted: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔵 Auth state changed:', firebaseUser?.email);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const profileData = userDoc.data() as UserProfile;
            console.log('✅ Profil chargé:', profileData);
            setUser(firebaseUser);
            setUserProfile(profileData);
          } else {
            console.log('❌ Profil introuvable');
            setUser(null);
            setUserProfile(null);
          }
        } catch (error) {
          console.error('❌ Erreur chargement profil:', error);
          setUser(null);
          setUserProfile(null);
        }
      } else {
        console.log('🔴 Utilisateur déconnecté');
        setUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}