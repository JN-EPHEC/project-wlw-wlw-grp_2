import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Import de la config Firebase
import { auth, db } from '../firebaseConfig';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Nécessaire pour le fonctionnement web
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // --- 1. CONFIGURATION GOOGLE ---

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: 'VOTRE_WEB_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'VOTRE_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'VOTRE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  });

  // --- 2. GESTION DE LA RÉPONSE GOOGLE ---
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          handleUserRouting(userCredential.user);
        })
        .catch((err) => {
          console.error("Erreur Google:", err);
          setError("Échec de la connexion Google");
          setLoading(false);
        });
    }
  }, [response]);

  // --- 3. LOGIQUE DE ROUTAGE ET CRÉATION DE PROFIL ---
  const handleUserRouting = async (user: any) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        Alert.alert('Succès', 'Connexion réussie !');
        // Redirection selon le rôle existant
        if (userData.role === 'formateur') {
          router.replace('/(tabs-formateur)/home');
        } else {
          router.replace('/(tabs-apprenant)/home');
        }
      } else {
        // Création d'un nouveau profil (Apprenant par défaut)
        const [prenom, ...nomArray] = (user.displayName || '').split(' ');
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          prenom: prenom || '',
          nom: nomArray.join(' ') || '',
          photoURL: user.photoURL,
          role: 'apprenant',
          createdAt: serverTimestamp(),
          onboardingCompleted: false,
          stats: { videosWatched: 0, streak: 0 }
        });
        // Redirection vers l'onboarding
        router.replace('/onboarding-apprenant');
      }
    } catch (err) {
      console.error("Erreur routing:", err);
      setError("Erreur lors de la récupération du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // On utilise la même logique de routage que Google pour être cohérent
      await handleUserRouting(userCredential.user);

    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false);
      if (
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/invalid-credential'
      ) {
        setError('Nom d\'utilisateur ou mot de passe erroné');
      } else {
        setError('Une erreur est survenue lors de la connexion');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header avec Logo */}
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
          <Text style={styles.title}>Connexion</Text>
        </View>

        {/* Message d'erreur */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom d'utilisateur / Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              placeholder="exemple@email.com"
              placeholderTextColor="#a1a1aa"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                placeholder="••••••••"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons 
                  name={showPassword ? 'eye' : 'eye-off'} 
                  size={20} 
                  color="#71717a" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton Se connecter */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          {/* Mot de passe oublié */}
          <TouchableOpacity
            onPress={() => router.push('/forgot-password')}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Autres connexions</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            {/* Google Login */}
            <TouchableOpacity
              style={styles.socialButton}
              disabled={!request || loading}
              onPress={() => promptAsync()}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.socialButtonText}>Continuer avec Google</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inscription */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupQuestion}>Pas encore de compte ?</Text>
          <TouchableOpacity
            onPress={() => router.push('/role-selection')}
            disabled={loading}
          >
            <Text style={styles.signupLink}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={() => router.push('/privacy-policy')}
          disabled={loading}
        >
          <Text style={styles.footerLink}>Politique de confidentialité</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/help')}
          disabled={loading}
        >
          <Text style={styles.footerLink}>Besoin d'aide ?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  // Les styles logoContainer et logoText peuvent être supprimés si plus utilisés
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#18181b',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#3f3f46',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 48,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#18181b',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    height: 48,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 16,
    color: '#18181b',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  submitButton: {
    height: 48,
    backgroundColor: '#9333ea',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    color: '#9333ea',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e4e4e7',
  },
  dividerText: {
    fontSize: 13,
    color: '#71717a',
  },
  socialButtons: {
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 24,
    backgroundColor: '#fff',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 15,
    color: '#18181b',
    fontWeight: '500',
  },
  signupContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  signupQuestion: {
    color: '#52525b',
    fontSize: 14,
    marginBottom: 8,
  },
  signupLink: {
    color: '#9333ea',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#fff',
  },
  footerLink: {
    color: '#52525b',
    fontSize: 13,
  },
  logoImage: {
    width: 100, 
    height: 100,
    marginBottom: 24,
    borderRadius: 20, 
  },
});