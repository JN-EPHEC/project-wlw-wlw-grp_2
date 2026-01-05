import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Séquence d'animations élégantes
    Animated.sequence([
      // Logo apparaît avec scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      // Texte apparaît
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Fade in global
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Vérifier l'état d'authentification
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);

      // Fade out après avoir vérifié l'auth
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start();

        // Navigation après le fade out
        setTimeout(async () => {
          if (user) {
            // Utilisateur connecté -> vérifier son rôle dans Firestore
            try {
              const userDocRef = doc(db, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Redirection selon le rôle
                if (userData.role === 'formateur') {
                  router.replace('/(tabs-formateur)/home' as any);
                } else {
                  // Par défaut, considérer comme apprenant
                  router.replace('/(tabs-apprenant)/home' as any);
                }
              } else {
                // Document utilisateur n'existe pas -> rediriger vers login
                console.log('Utilisateur sans profil Firestore');
                router.replace('/login' as any);
              }
            } catch (error) {
              console.error('Erreur lors de la récupération du profil:', error);
              // En cas d'erreur, rediriger vers login par sécurité
              router.replace('/login' as any);
            }
          } else {
            // Pas d'utilisateur connecté -> rediriger vers login
            router.replace('/login' as any);
          }
        }, 800);
      }, 2500);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#7459f0', '#9333ea', '#242a65']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo avec animation */}
          <Animated.View 
            style={[
              styles.logoContainer, 
              { 
                opacity: logoOpacity,
                transform: [{ scale: scaleAnim }] 
              }
            ]}
          >
            <View style={styles.logoWrapper}>
              <Image 
                source={require('../assets/images/logoss.png')} 
                style={styles.logoImage} 
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Texte avec animation */}
          <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
            <Text style={styles.title}>SwipeSkills</Text>
            <Text style={styles.subtitle}>Apprenez en swipant</Text>
          </Animated.View>

          {/* Indicateur de chargement minimaliste */}
          <Animated.View style={[styles.loadingContainer, { opacity: textOpacity }]}>
            <View style={styles.dotsContainer}>
              <LoadingDot delay={0} />
              <LoadingDot delay={200} />
              <LoadingDot delay={400} />
            </View>
            <Text style={styles.loadingText}>
              {authChecked ? 'Chargement...' : 'Vérification...'}
            </Text>
          </Animated.View>
        </View>

        {/* Footer discret */}
        <Animated.View style={[styles.footer, { opacity: textOpacity }]}>
          <Text style={styles.footerText}>Plateforme d'apprentissage interactive</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

// Composant pour les dots animés
function LoadingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 48,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  loadingContainer: {
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
});