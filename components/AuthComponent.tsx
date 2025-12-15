import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  User
} from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth } from '../firebaseConfig'; 

const COLORS = {
  orange: '#FBA31A',
  bleuNuit: '#242A65',
  gris: '#6B7280',
  grisClair: '#E5E7EB',
  blanc: '#FFFFFF',
  text: '#000000',
  linkBlue: '#4A90E2',
};

export default function AuthComponent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
    if (!password) {
      setPasswordError(true);
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setErrorMessage("Email ou mot de passe incorrect");
      } else if (error.code === 'auth/too-many-requests') {
        setErrorMessage("Trop de tentatives. Veuillez réessayer plus tard.");
      } else {
        setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          
          <Text style={styles.title}>Connexion</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse mail</Text>
            <TextInput
              style={[
                styles.input, 
                emailError && styles.inputError
              ]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError(false);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={[
                styles.passwordContainer,
                passwordError && styles.inputError
              ]}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError(false);
                }}
                secureTextEntry={!showPassword}
              />
              <Pressable 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color="#666" 
                />
              </Pressable>
            </View>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity 
            onPress={handleSignIn} 
            style={styles.signInButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.bleuNuit} />
            ) : (
              <Text style={styles.signInText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          {/* Mot de passe oublié */}
          <TouchableOpacity onPress={() => router.push("/mdpoublie")}>
            <Text style={styles.forgotPassword}>Mot de passe oublié?</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => router.push("/inscription")}>
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Pressable onPress={() => router.push("/pdc")}> 
              {({ pressed, hovered }) => (
                <Text 
                  style={[
                    styles.footerText, 
                    { textDecorationLine: 'underline' },
                    (pressed || hovered) && { color: COLORS.orange }
                  ]}
                >
                  Politiques de confidentialité
                </Text>
              )}
            </Pressable>
          
            <View style={styles.footerDivider} />
    
            <TouchableOpacity onPress={() => console.log("Aide - À faire")}>
              <Text style={styles.footerText}>Besoin d'aide ?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 40,
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '400',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  passwordContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#000',
  },
  eyeIcon: {
    padding: 4,
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    fontSize: 14,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: COLORS.orange,
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signInText: {
    color: COLORS.bleuNuit,
    fontSize: 18,
    fontWeight: '500',
  },
  forgotPassword: {
    color: COLORS.linkBlue,
    fontSize: 14,
    textAlign: 'left',
    textDecorationLine: 'underline',
  },
  spacer: {
    flex: 1,
    minHeight: 50,
  },
  registerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  registerText: {
    color: '#000',
    fontSize: 16,
    marginBottom: 4,
  },
  registerLink: {
    color: COLORS.linkBlue,
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
  footerDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#666',
    marginHorizontal: 10,
  },
});