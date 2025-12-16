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
import { createUserProfile } from "./utils/userProfile";

// Couleurs extraites de ta charte
const COLORS = {
  orange: '#FBA31A',
  bleuNuit: '#242A65',
  violet: '#7459F0', // Couleur pour "apprenant"
  gris: '#6B7280',
  grisClair: '#E5E7EB',
  blanc: '#FFFFFF',
  text: '#000000',
  error: '#FF3B30'
};

export default function SignUp() {
  const router = useRouter();
  
  // États du formulaire
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  
  // États de validation / UI
  const [showWelcome, setShowWelcome] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Gestion de l'inscription
  const handleSignUp = async () => {
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

      // 2. Envoi email vérification
      try {
        await sendEmailVerification(newUser);
      } catch (emailErr) {
        console.warn("Envoi email de vérification échoué:", emailErr);
      }

      // 3. Création du profil Firestore
      try {
        await createUserProfile({
          username: username.trim(),
          bio: '',
          interests: [],
          profileEmoji: '👤',
        });
        console.log("✅ Profil utilisateur créé avec succès !");
      } catch (firestoreErr) {
        console.error("❌ Erreur lors de la création du profil :", firestoreErr);
      }

      setShowWelcome(true);
    } catch (error: any) {
      if (error.code === "auth/invalid-email") {
        setErrorMessage("Format d'email invalide.");
      } else if (error.code === "auth/email-already-in-use") {
        setErrorMessage("Cet email est déjà utilisé.");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("Mot de passe trop faible.");
      } else {
        setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
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
        
        {/* Header avec Flèche retour et Titre personnalisé */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={32} color="black" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>S’inscrire en</Text>
            <Text style={styles.headerTitle}>tant</Text>
            <Text style={styles.headerTitle}>
              qu’<Text style={styles.headerTitleHighlight}>apprenant</Text>
            </Text>
          </View>
        </View>

        {/* Formulaire */}
        <View style={styles.formContainer}>
          
          {/* Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor="#C4C4C4"
            />
          </View>

          {/* Prénom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor="#C4C4C4"
            />
          </View>

          {/* Nom d'utilisateur */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom d’utilisateur</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor="#C4C4C4"
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#C4C4C4"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#C4C4C4"
            />
          </View>

          {/* Message d'erreur global */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Checkbox Conditions */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              onPress={() => {
                setTermsAccepted(!termsAccepted);
                setTermsError(false);
              }}
              style={styles.checkbox}
            >
              <Ionicons 
                name={termsAccepted ? "checkbox" : "square-outline"} 
                size={24} 
                color={termsError ? COLORS.error : "#333"} 
              />
            </TouchableOpacity>
            
            <Text style={[styles.termsText, termsError && { color: COLORS.error }]}>
              J’accepte la{' '}
              <Text 
                style={styles.linkText}
                onPress={() => router.push("/pdc")}
              >
                Politique de confidentialité
              </Text>
              , les CGU et les CGV.
            </Text>
          </View>

          {/* Bouton Inscription */}
          <TouchableOpacity
            onPress={handleSignUp}
            style={styles.signUpButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.bleuNuit} />
            ) : (
              <Text style={styles.signUpButtonText}>S’inscrire</Text>
            )}
          </TouchableOpacity>

          {/* Lien Login */}
          <View style={styles.loginLinkContainer}>
            <TouchableOpacity onPress={() => router.push("/auth")}>
              <Text style={styles.loginLinkText}>Vous avez déjà un compte ?</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Modal Bienvenue */}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60, // Espace pour la status bar
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  // --- Header Styles ---
  headerContainer: {
    marginBottom: 40,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 50, // Ajustement pour l'espacement entre les lignes
  },
  headerTitleHighlight: {
    color: COLORS.violet, // Couleur violette pour "apprenant"
  },
  // --- Form Styles ---
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333333',
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  // --- Checkbox & Links ---
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  linkText: {
    textDecorationLine: 'underline',
    color: '#000',
  },
  // --- Buttons ---
  signUpButton: {
    backgroundColor: COLORS.orange,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signUpButtonText: {
    color: COLORS.bleuNuit,
    fontSize: 18,
    fontWeight: '600',
  },
  loginLinkContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loginLinkText: {
    color: COLORS.bleuNuit,
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  // --- Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.bleuNuit,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  modalButton: {
    backgroundColor: COLORS.orange,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});