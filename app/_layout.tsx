import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';

// 👇 REMPLACE '../firebaseConfig' PAR LE VRAI CHEMIN QUE TU AS TROUVÉ
import { auth } from '../firebaseConfig'; 

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // On récupère les segments sans forcer le type ici pour éviter l'erreur Expo
  const segments = useSegments();

  useEffect(() => {
    // Écoute les changements de connexion (Login/Logout)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initializing) return;

    // L'ASTUCE : On dit à TypeScript "T'inquiète, c'est bien une liste de textes"
    // Cela débloque l'utilisation de .includes()
    const navSegments = segments as string[];

    const inAuthGroup = navSegments[0] === '(auth)';
    const inTabsGroup = navSegments[0] === '(tabs)';
    
    // Vérifie si "inscription" est quelque part dans l'URL
    const onSignupPage = navSegments.includes('inscription');

    if (user && !inTabsGroup && !onSignupPage) {
      // Si connecté -> direction l'accueil
      router.replace('/(tabs)/home');
    } else if (!user && inTabsGroup) {
      // Si pas connecté mais dans l'app -> retour login
      router.replace('/auth');
    }
  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}