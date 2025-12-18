import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

interface SignupScreenProps {
  role: 'formateur' | 'apprenant';
}

export default function SignupScreen({ role }: SignupScreenProps) {
      const router = useRouter();

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
  });
  const [profileLevel, setProfileLevel] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [diplomaFile, setDiplomaFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setEmailError('L\'adresse e-mail ne correspond pas au format valide');
      } else {
        setEmailError('');
      }
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      // Vérifier la taille (max 5MB)
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('Erreur', 'Le fichier est trop volumineux. Taille maximale : 5MB');
        return;
      }

      setDiplomaFile(file);
      Alert.alert('Succès', 'Fichier ajouté avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const isFormValid = () => {
    const requiredFields = [
      formData.nom,
      formData.prenom,
      formData.email,
      formData.telephone,
      formData.password,
      formData.confirmPassword,
    ];

    if (role === 'formateur' && !profileLevel) {
      return false;
    }

    if (requiredFields.some(field => !field.trim())) {
      return false;
    }

    if (emailError) {
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      return false;
    }

    if (!acceptedPolicy) {
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!acceptedPolicy) {
      Alert.alert('Erreur', 'Veuillez accepter les conditions générales');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (role === 'formateur' && !profileLevel) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre niveau de profil');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Créer le profil utilisateur dans Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        role: role,
        profileLevel: role === 'formateur' ? profileLevel : null,
        createdAt: new Date().toISOString(),
      });

     Alert.alert('Succès', 'Inscription réussie !');
// Rediriger vers l'onboarding selon le rôle
if (role === 'formateur') {
  router.replace('/onboarding-formateur');
} else {
  router.replace('/onboarding-apprenant');
}
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Erreur', 'Cet e-mail est déjà utilisé');
        setEmailError('Cet e-mail est déjà utilisé');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Erreur', 'Adresse e-mail invalide');
        setEmailError('Adresse e-mail invalide');
      } else {
        Alert.alert('Erreur', 'Une erreur est survenue lors de l\'inscription');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={20} color="#52525b" />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>SS</Text>
        </View>
      </View>

      {/* Content */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Inscription</Text>
            <Text style={styles.subtitle}>
              En tant que <Text style={styles.roleText}>{role}</Text>
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Nom */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={formData.nom}
                onChangeText={(text) => handleChange('nom', text)}
                placeholder="Votre nom"
                placeholderTextColor="#a1a1aa"
                editable={!loading}
              />
            </View>

            {/* Prénom */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Prénom <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={formData.prenom}
                onChangeText={(text) => handleChange('prenom', text)}
                placeholder="Votre prénom"
                placeholderTextColor="#a1a1aa"
                editable={!loading}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse e-mail <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                placeholder="exemple@email.com"
                placeholderTextColor="#a1a1aa"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Téléphone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numéro de téléphone <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={formData.telephone}
                onChangeText={(text) => handleChange('telephone', text)}
                placeholder="+32 XXX XX XX XX"
                placeholderTextColor="#a1a1aa"
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

           {/* Niveau de profil (formateur uniquement) */}
{role === 'formateur' && (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>Niveau de profil <Text style={styles.required}>*</Text></Text>
    <View style={styles.levelsContainer}>
      <TouchableOpacity
        style={[styles.levelButton, profileLevel === 'amateur' && styles.levelButtonSelected]}
        onPress={() => setProfileLevel('amateur')}
        disabled={loading}
      >
        <Text style={[styles.levelButtonText, profileLevel === 'amateur' && styles.levelButtonTextSelected]}>
          Amateur
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.levelButton, profileLevel === 'diplome' && styles.levelButtonSelected]}
        onPress={() => setProfileLevel('diplome')}
        disabled={loading}
      >
        <Text style={[styles.levelButtonText, profileLevel === 'diplome' && styles.levelButtonTextSelected]}>
          Diplômé
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.levelButton, profileLevel === 'expert' && styles.levelButtonSelected]}
        onPress={() => setProfileLevel('expert')}
        disabled={loading}
      >
        <Text style={[styles.levelButtonText, profileLevel === 'expert' && styles.levelButtonTextSelected]}>
          Expert
        </Text>
      </TouchableOpacity>
    </View>
  </View>
)}

            {/* Upload diplôme (formateur uniquement) */}
            {role === 'formateur' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Preuve de diplôme (PNG, PDF)</Text>
                {!diplomaFile ? (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleFileUpload}
                    disabled={loading}
                  >
                    <Ionicons name="cloud-upload" size={20} color="#71717a" />
                    <Text style={styles.uploadButtonText}>Cliquez pour télécharger</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.filePreview}>
                    <Text style={styles.fileName} numberOfLines={1}>{diplomaFile.name}</Text>
                    <TouchableOpacity onPress={() => setDiplomaFile(null)} disabled={loading}>
                      <Ionicons name="close-circle" size={20} color="#9333ea" />
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.helpText}>Format accepté : PNG, PDF (max 5MB)</Text>
              </View>
            )}

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                placeholder="••••••••"
                placeholderTextColor="#a1a1aa"
                secureTextEntry
                editable={!loading}
              />
              <Text style={styles.helpText}>Minimum 6 caractères</Text>
            </View>

            {/* Confirmation mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                placeholder="••••••••"
                placeholderTextColor="#a1a1aa"
                secureTextEntry
                editable={!loading}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <Text style={styles.errorText}>Les mots de passe ne correspondent pas</Text>
              )}
            </View>

            {/* Checkbox politique */}
            <View style={styles.checkboxRow}>
  <TouchableOpacity
    style={styles.checkboxButton}
    onPress={() => setAcceptedPolicy(!acceptedPolicy)}
    disabled={loading}
  >
    <View style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}>
      {acceptedPolicy && <Ionicons name="checkmark" size={16} color="#fff" />}
    </View>
  </TouchableOpacity>
  
  <View style={styles.checkboxTextContainer}>
    <Text style={styles.checkboxLabel}>
      J'accepte les{' '}
    </Text>
    <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
      <Text style={styles.link}>conditions générales</Text>
    </TouchableOpacity>
    <Text style={styles.checkboxLabel}> et la </Text>
    <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
      <Text style={styles.link}>politique de confidentialité</Text>
    </TouchableOpacity>
    <Text style={styles.required}> *</Text>
  </View>
</View>

            {/* Bouton S'inscrire */}
            <TouchableOpacity
              style={[styles.submitButton, (!isFormValid() || loading) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid() || loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Inscription...' : 'S\'inscrire'}
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Vous avez déjà un compte ?</Text>
              <TouchableOpacity onPress={() => router.back()} disabled={loading}>
                <Text style={styles.footerLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Links */}
      <View style={styles.bottomFooter}>
        <TouchableOpacity onPress={() => router.push('/privacy-policy')} disabled={loading}>
          <Text style={styles.bottomLink}>Politique de confidentialité</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/help')} disabled={loading}>
          <Text style={styles.bottomLink}>Besoin d'aide ?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#52525b',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f4f4f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9333ea',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 100,
  },
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#52525b',
  },
  roleText: {
    color: '#9333ea',
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#3f3f46',
    fontWeight: '500',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    height: 48,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#18181b',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  pickerContainer: {
    position: 'relative',
  },
  picker: {
    height: 48,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTextPlaceholder: {
    fontSize: 15,
    color: '#a1a1aa',
  },
  pickerTextSelected: {
    fontSize: 15,
    color: '#18181b',
  },
  uploadButton: {
    height: 48,
    backgroundColor: '#f4f4f5',
    borderWidth: 2,
    borderColor: '#e4e4e7',
    borderStyle: 'dashed',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#52525b',
  },
  filePreview: {
    height: 48,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: '#7e22ce',
  },
  checkboxRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
  paddingTop: 8,
},
checkboxButton: {
  marginTop: 2,
},
checkbox: {
  width: 20,
  height: 20,
  borderWidth: 2,
  borderColor: '#e4e4e7',
  borderRadius: 4,
  justifyContent: 'center',
  alignItems: 'center',
},
checkboxChecked: {
  backgroundColor: '#9333ea',
  borderColor: '#9333ea',
},
checkboxTextContainer: {
  flex: 1,
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
},
checkboxLabel: {
  fontSize: 13,
  color: '#3f3f46',
},
  link: {
    color: '#9333ea',
    textDecorationLine: 'underline',
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
  footerContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#52525b',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    color: '#9333ea',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    backgroundColor: '#fff',
  },levelsContainer: {
  flexDirection: 'row',
  gap: 8,
},
levelButton: {
  flex: 1,
  height: 48,
  backgroundColor: '#f4f4f5',
  borderWidth: 2,
  borderColor: '#e4e4e7',
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
},
levelButtonSelected: {
  backgroundColor: '#9333ea',
  borderColor: '#9333ea',
},
levelButtonText: {
  fontSize: 14,
  color: '#52525b',
  fontWeight: '500',
},
levelButtonTextSelected: {
  color: '#fff',
  fontWeight: '600',
},
  bottomLink: {
    fontSize: 13,
    color: '#52525b',
  },
});