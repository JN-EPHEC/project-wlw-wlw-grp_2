import { auth, db } from '@/firebaseConfig';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";


export default function AuthComponent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   const [passwordControle, setPasswordControle] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState ("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
   const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [passwordControleError, setPasswordControleError] = useState(false);

WebBrowser.maybeCompleteAuthSession();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '30195503547-tq811qi0j6sa8bd3p1214ah2tf3p48u7.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    redirectUri: makeRedirectUri({
      scheme: "SwipeSkills",
    }),
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);
      if (currentUser) {
        router.replace("/(tabs)/home");
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
  setErrorMessage("");
  setEmailError(false);
  setPasswordError(false);

  let hasError = false;
  if (!email) {
    setEmailError(true);
    hasError = true;
  }

  if (hasError) return;

  setLoading(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "users", uid), {
      email: userCredential.user.email,
      createdAt: new Date(),
      familyId: null,
    }, { merge: true });

  } catch (error: any) {
    if (error.code == 'auth/invalid-email') {
      setErrorMessage("Email ou mot de passe incorrect");
    } else {
      setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  if (response?.type === 'success') {
    const { authentication } = response;
    const idToken = authentication?.idToken;

    if (idToken) {
      const credential = GoogleAuthProvider.credential(idToken);
      (async () => {

        const result = await signInWithCredential(auth, credential);
        const user = result.user; 
        const uid = user.uid;

        const displayName = user.displayName || '';
        const nameParts = displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await setDoc(doc(db, "users", uid), {
          email: user.email,
          firstName: firstName,
          lastName: lastName,
          birthDate: '', 
          createdAt: new Date(),
          familyId: null,
        }, { merge: true });

        console.log("Connexion Google réussie");
      })();
    }
  } else if (response?.type === 'error') {
    Alert.alert('Erreur', 'Échec de la connexion Google. Veuillez réessayer.');
  }
}, [response]);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const uid = user.uid;

      // Extraire le prénom et nom du displayName
      const displayName = user.displayName || '';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await setDoc(doc(db, "users", uid), {
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        birthDate: '', 
        createdAt: new Date(),
      }, { merge: true });

      console.log("Connexion Google réussie");
    } catch (err: any) {
      console.warn('Google sign-in error', err);
      Alert.alert('Erreur', err.message || String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur SwipeSkills !</Text>
      <TextInput
        style={[styles.input, emailError && { borderColor: "red" }]}
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text); 
          setEmailError(false);
        }}
        autoCapitalize="none"
      />
      {emailError && (
        <Text style={styles.fieldError}>Cette case doit être remplie</Text>
      )}
      <TextInput
        style={[styles.input, passwordError && { borderColor: "red" }]}
        placeholder="Mot de passe"
        value={password}
        onChangeText={(text) => {
          setPassword(text); 
          setPasswordError(false);
        }}
        secureTextEntry
      />
      {passwordError && (
        <Text style={styles.fieldError}>Le mot de passe doit contenir au moins 6 caractères</Text>
      )}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleSignIn} style={styles.signUpButton}>
          <Text style={styles.signUpText}>Se connecter</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/inscription")} style={styles.signUpButton}>
          <Text style={styles.signUpText}>S'inscrire</Text>
          </TouchableOpacity> 
        <TouchableOpacity onPress={handleGoogleSignIn} style={[styles.signUpButton, { backgroundColor: "#DB4437" }]}>
          <Text style={styles.signUpText}>Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, borderRadius: 20},
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
 
   input: {
  height: 40,
  borderColor: "gray",
  borderWidth: 1,
  marginBottom: 10,
  paddingHorizontal: 10,
  fontStyle: "italic", 
  color: "rgba(100, 100, 100, 0.7)",
  borderRadius: 15

},

  buttonContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 20, alignItems: "center"},
  signUpText: { color: "white", fontWeight: "bold" },
  signUpButton: { backgroundColor: "#00b7ff9a", padding: 10, borderRadius: 5 },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
    
  },
  fieldError: {
    color: "red",
    marginTop: -5,
    marginBottom: 8,
    textAlign: "left",
    fontSize: 13,
  },
});
