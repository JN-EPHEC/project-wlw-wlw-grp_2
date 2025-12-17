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

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Gestion de l'inscription
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
        console.log("🔄 Création du profil Firestore...");
        console.log("Username:", `${firstName.trim()} ${lastName.trim()}`);
        
        await createUserProfile({
          username: `${firstName.trim()} ${lastName.trim()}`,
          bio: '',
          
          interests: [] as string[], 
          profileEmoji: '👤',
        });
        
        console.log("✅ Profil Firestore créé avec succès !");
        console.log("=== INSCRIPTION TERMINÉE AVEC SUCCÈS ===");
        
        setShowWelcome(true);
        
      } catch (firestoreErr: any) {
        console.error("❌ ERREUR FIRESTORE !");
        console.error("Message:", firestoreErr.message);
        console.error("Code:", firestoreErr.code);
        console.error("Stack:", firestoreErr.stack);
        
        setErrorMessage(`Erreur lors de la création du profil: ${firestoreErr.message}`);
        
        // Supprimer l'utilisateur d'Auth si le profil Firestore échoue
        try {
          await newUser.delete();
          console.log("🗑️ Utilisateur Auth supprimé (rollback)");
        } catch (deleteErr: any) {
          console.error("❌ Impossible de supprimer l'utilisateur:", deleteErr.message);
        }
      }
      
    } catch (error: any) {
      console.error("❌ ERREUR AUTHENTICATION !");
      console.error("Code:", error.code);
      console.error("Message:", error.message);
      
      if (error.code === "auth/invalid-email") {
        setErrorMessage("Email ou mot de passe incorrect");
      } else if (error.code === "auth/email-already-in-use") {
        setErrorMessage("Cet email est déjà utilisé");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("Le mot de passe est trop faible");
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
    <View style={{ flex: 1, padding: 20 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={24} color="#00b7ff9a" />
      </TouchableOpacity>

      <View style={styles.container}>
        <Text style={styles.title}>Création de compte</Text>

        {errorMessage ? <Text style={styles.generalError}>{errorMessage}</Text> : null}

        {/* Prénom */}
        <TextInput
          style={[styles.input, (nameError || nameFormatError) && { borderColor: "red" }]}
          placeholder="Prénom*"
          value={firstName}
          maxLength={50}
          onChangeText={(text) => {
            const filteredText = text.replace(/[^a-zA-ZÀ-ÿ\s-]/g, "");
            setNameFormatError(text !== filteredText);
            setFirstName(filteredText);
            setNameError(false);
          }}
        />
        {nameError && <Text style={styles.fieldError}>Cette case doit être remplie</Text>}
        {nameFormatError && <Text style={styles.fieldError}>Seules les lettres et accents sont autorisés</Text>}

        {/* Nom */}
        <TextInput
          style={[styles.input, (lastNameError || lastNameFormatError) && { borderColor: "red" }]}
          placeholder="Nom*"
          value={lastName}
          maxLength={50}
          onChangeText={(text) => {
            const filteredText = text.replace(/[^a-zA-ZÀ-ÿ\s-]/g, "");
            setLastNameFormatError(text !== filteredText);
            setLastName(filteredText);
            setLastNameError(false);
          }}
        />
        {lastNameError && <Text style={styles.fieldError}>Cette case doit être remplie</Text>}
        {lastNameFormatError && <Text style={styles.fieldError}>Seules les lettres et accents sont autorisés</Text>}

        {/* Email */}
        <TextInput
          style={[styles.input, (emailError || emailFormatError) && { borderColor: "red" }]}
          placeholder="Email*"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError(false);
            setEmailFormatError(text.length > 0 && !text.includes("@"));
          }}
          autoCapitalize="none"
        />
        {emailFormatError && <Text style={styles.fieldError}>L'email doit contenir un @xxx.xx</Text>}

        {/* Mot de passe */}
        <TextInput
          style={[styles.input, (passwordError || passwordFormatError) && { borderColor: "red" }]}
          placeholder="Mot de passe*"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError(false);
            const hasNumber = /\d/.test(text);
            const hasUpperCase = /[A-Z]/.test(text);
            setPasswordFormatError(text.length > 0 && (text.length < 6 || !hasNumber || !hasUpperCase));
          }}
          secureTextEntry
        />
        {passwordError && (
          <Text style={styles.fieldError}>Le mot de passe doit contenir au moins 6 caractères, 1 chiffre et 1 majuscule</Text>
        )}
        {passwordFormatError && (
          <Text style={styles.fieldError}>Min 6 caractères, 1 chiffre et 1 majuscule requis</Text>
        )}

        {/* Date de naissance */}
        <TextInput
          style={[styles.input, birthDateFormatError && { borderColor: "red" }]}
          placeholder="Date de naissance (JJ/MM/AAAA)"
          value={birthDate}
          keyboardType="numeric"
          maxLength={10}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, "");
            let formatted = digits;
            if (digits.length > 2 && digits.length <= 4) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
            else if (digits.length > 4)
              formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
            setBirthDate(formatted);
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            setBirthDateFormatError(formatted.length > 0 && (formatted.length < 10 || (formatted.length === 10 && !dateRegex.test(formatted))));
          }}
        />
        {birthDateFormatError && <Text style={styles.fieldError}>Format attendu: JJ/MM/AAAA</Text>}

        {/* Conditions */}
        <View style={styles.termsContainer}>
          <TouchableOpacity
            onPress={() => {
              setTermsAccepted(!termsAccepted);
              setTermsError(false);
            }}
            style={styles.checkboxContainer}
          >
            <Ionicons name={termsAccepted ? "checkbox" : "square-outline"} size={24} color={termsError ? "red" : "#00b7ff9a"} />
          </TouchableOpacity>
          
          <Text style={[styles.termsText, termsError && { color: "red" }]}>
            J'accepte la{' '}
            <Text 
              style={{textDecorationLine: 'underline', fontWeight: 'bold'}}
              onPress={() => router.push("/pdc")}
            >
              Politique de confidentialité
            </Text>
            , les CGU et les CGV.
          </Text>
        </View>
        {termsError && <Text style={styles.fieldError}>Vous devez accepter les conditions pour continuer</Text>}

        {/* Bouton inscription */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          {(() => {
            const hasNumber = /\d/.test(password);
            const hasUpperCase = /[A-Z]/.test(password);
            const isPasswordValid = password.length >= 6 && hasNumber && hasUpperCase;
            const isFormValid =
              firstName.trim() !== "" &&
              lastName.trim() !== "" &&
              email.trim() !== "" &&
              email.includes("@") &&
              isPasswordValid &&
              termsAccepted &&
              !nameFormatError &&
              !lastNameFormatError &&
              !emailFormatError &&
              !birthDateFormatError;
            return (
              <TouchableOpacity
                onPress={handleSignUp}
                style={[styles.signUpButton, !isFormValid && styles.signUpButtonDisabled]}
                disabled={loading || !isFormValid}
              >
                <Text style={styles.signUpText}>{loading ? "Inscription..." : "S'inscrire"}</Text>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Lien login */}
        <View style={{ alignItems: "center", marginTop: 10 }}>
          <TouchableOpacity onPress={() => router.push("/auth")}>
            <Text style={{ color: "navy", textDecorationLine: "underline", fontSize: 12 }}>Vous avez déjà un compte ?</Text>
          </TouchableOpacity>
        </View>

        {/* Modal bienvenue */}
        <Modal visible={showWelcome} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Bienvenue ! Votre compte a été créé avec succès.</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                <Text style={styles.closeText}>x</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, borderRadius: 20 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20, borderRadius: 20 },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    fontStyle: "italic",
    color: "rgba(100, 100, 100, 0.7)",
    borderRadius: 15,
  },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: 250, padding: 20, backgroundColor: "white", borderRadius: 10, alignItems: "center" },
  modalText: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  closeButton: { marginTop: 10, padding: 5 },
  closeText: { fontSize: 18, fontWeight: "bold" },
  signUpButton: { backgroundColor: "#00b7ff9a", paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, alignItems: "center", marginTop: 10 },
  signUpButtonDisabled: { backgroundColor: "rgba(0, 183, 255, 0.3)", opacity: 0.5 },
  signUpText: { color: "white", fontSize: 16, fontWeight: "bold" },
  fieldError: { color: "red", marginTop: -5, marginBottom: 8, textAlign: "left", fontSize: 13 },
  generalError: { color: "red", textAlign: "center", marginBottom: 10 },
  termsContainer: { flexDirection: "row", alignItems: "center", marginTop: 15, marginBottom: 5, paddingHorizontal: 5 },
  checkboxContainer: { marginRight: 10 },
  termsText: { flex: 1, fontSize: 12, color: "#666", lineHeight: 16 },
});