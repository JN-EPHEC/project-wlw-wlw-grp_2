import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleResetPassword = async () => {
    setError("");
    if (!email) {
      setError("Veuillez entrer une adresse mail.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError("Aucun utilisateur trouvé avec cet email.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Format d'email invalide.");
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Mot de{'\n'}passe oublié</Text>

        {!isSubmitted ? (
          <View style={styles.formContainer}>
            <View style={styles.card}>
              <Text style={styles.label}>Adresse mail</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="Ex: jean.dupont@email.com"
                placeholderTextColor="#C4C4C4"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError("");
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Réinitialiser mot de passe</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>
                Votre mot de passe a été réinitialisé
              </Text>
              <Text style={styles.successText}>
                Vérifiez votre boite mail pour confirmer le changement
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.backToLogin}>
              <Text style={{color: COLORS.bleuNuit, textDecorationLine: 'underline'}}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Footer identique */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { marginTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#000', marginBottom: 40, lineHeight: 48 },
  formContainer: { marginTop: 20 },
  card: { backgroundColor: '#fff' },
  label: { fontSize: 16, color: '#333', marginBottom: 8 },
  input: { height: 50, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, marginBottom: 24, backgroundColor: '#fff', color: '#000' },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: 12, marginTop: -20, marginBottom: 20 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitButton: { flex: 1, backgroundColor: COLORS.orange, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  successContainer: { alignItems: 'center', marginTop: 40 },
  successCard: { backgroundColor: '#fff', width: '100%', padding: 24, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', marginBottom: 12 },
  successText: { fontSize: 14, color: '#666', lineHeight: 20 },
  backToLogin: { marginTop: 30 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  footerText: { color: '#666', fontSize: 12 },
  footerDivider: { width: 1, height: 12, backgroundColor: '#666', marginHorizontal: 10 },
});