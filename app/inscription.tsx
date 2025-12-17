import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth } from "../firebaseConfig";
// On importe le type UserRegistrationData pour s'assurer que les données correspondent
import { createUserProfile, UserRegistrationData } from "./utils/userProfile";

const COLORS = {
  orange: '#FBA31A',
  bleuNuit: '#242A65',
  violet: '#7459F0',
  gris: '#6B7280',
  grisClair: '#E5E7EB',
  blanc: '#FFFFFF',
  text: '#000000',
  error: '#FF3B30'
};

export default function SignUp() {
  const router = useRouter();
  
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  
  const [showWelcome, setShowWelcome] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

  const handleSignUp = async () => {
    console.log("=== DÉBUT INSCRIPTION ===");
    setErrorMessage("");
    setTermsError(false);

    // Validation basique
    if (!lastName || !firstName || !username || !email || !password) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (!termsAccepted) {
      setTermsError(true);
      return;
    }

    // Validation mot de passe
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    if (password.length < 6 || !hasNumber || !hasUpperCase) {
      setErrorMessage("Le mot de passe doit contenir 6 caractères, 1 majuscule et 1 chiffre.");
      return;
    }

    setLoading(true);
    try {
      // 1. Création Auth Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      console.log("✅ Auth créé:", newUser.uid);

      // 2. Envoi email vérification
      try {
        await sendEmailVerification(newUser);
      } catch (emailErr: any) {
        console.warn("⚠️ Email verif failed:", emailErr.message);
      }

      // 3. Création du profil Firestore
      try {
        
        const profileData: UserRegistrationData = {
          username: username.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          bio: '',
          
          interests: [] as string[], 
          profileEmoji: '👤',
          
        };

        await createUserProfile(profileData);
        console.log("✅ Profil créé !");
      } catch (firestoreErr) {
        console.error("❌ Erreur profil:", firestoreErr);
      }

      setShowWelcome(true);

    } catch (error: any) {
      console.error("❌ ERREUR INSCRIPTION:", error.code);
      
      // Gestion spécifique des erreurs Firebase
      if (error.code === "auth/email-already-in-use") {
        setErrorMessage("Cet email est déjà utilisé. Connectez-vous.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMessage("L'adresse email n'est pas valide.");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("Le mot de passe est trop faible.");
      } else {
        setErrorMessage("Une erreur est survenue lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowWelcome(false);
    router.replace("/(tabs)/home");
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#FFFFFF' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={32} color="black" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>S’inscrire en tant qu’<Text style={styles.headerTitleHighlight}>apprenant</Text></Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholderTextColor="#C4C4C4" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor="#C4C4C4" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom d’utilisateur</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#C4C4C4" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#C4C4C4" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse mail</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#C4C4C4" />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.checkboxContainer}>
            <TouchableOpacity onPress={() => { setTermsAccepted(!termsAccepted); setTermsError(false); }} style={styles.checkbox}>
              <Ionicons name={termsAccepted ? "checkbox" : "square-outline"} size={24} color={termsError ? COLORS.error : "#333"} />
            </TouchableOpacity>
            <Text style={[styles.termsText, termsError && { color: COLORS.error }]}>
              J’accepte la <Text style={styles.linkText} onPress={() => router.push("/pdc")}>Politique de confidentialité</Text>, les CGU et les CGV.
            </Text>
          </View>

          <TouchableOpacity onPress={handleSignUp} style={styles.signUpButton} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.bleuNuit} /> : <Text style={styles.signUpButtonText}>S’inscrire</Text>}
          </TouchableOpacity>

          <View style={styles.loginLinkContainer}>
            <TouchableOpacity onPress={() => router.push("/auth")}>
              <Text style={styles.loginLinkText}>Vous avez déjà un compte ?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showWelcome} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bienvenue ! 🎉</Text>
            <Text style={styles.modalText}>Votre compte a été créé avec succès.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleCloseModal}>
              <Text style={styles.modalButtonText}>Commencer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, backgroundColor: '#FFFFFF' },
  headerContainer: { marginBottom: 40 },
  backButton: { marginBottom: 20, alignSelf: 'flex-start' },
  titleContainer: { alignItems: 'flex-start' },
  headerTitle: { fontSize: 42, fontWeight: 'bold', color: '#000', lineHeight: 50 },
  headerTitleHighlight: { color: COLORS.violet },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '400', color: '#333333', marginBottom: 8, marginLeft: 2 },
  input: { height: 52, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000' },
  errorText: { color: COLORS.error, textAlign: 'center', marginBottom: 10, fontSize: 14 },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 30 },
  checkbox: { marginRight: 10 },
  termsText: { flex: 1, fontSize: 14, color: "#333", lineHeight: 20 },
  linkText: { textDecorationLine: 'underline', color: '#000' },
  signUpButton: { backgroundColor: COLORS.orange, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  signUpButtonText: { color: COLORS.bleuNuit, fontSize: 18, fontWeight: '600' },
  loginLinkContainer: { alignItems: 'center', marginBottom: 20 },
  loginLinkText: { color: COLORS.bleuNuit, fontSize: 16, textDecorationLine: 'underline', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: COLORS.bleuNuit },
  modalText: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: '#666' },
  modalButton: { backgroundColor: COLORS.orange, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});