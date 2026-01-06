import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  ToastAndroid
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Firebase
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  userProfile: any;
  userRole: 'apprenant' | 'formateur';
}

export default function SettingsScreen({ visible, onClose, userProfile, userRole }: SettingsScreenProps) {
  const router = useRouter();

  // --- ÉTATS ---
  const [pushNotifications, setPushNotifications] = useState(true);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (visible && userProfile?.settings) {
      setPushNotifications(userProfile.settings.pushNotifications ?? true);
    }
  }, [visible, userProfile]);

  // --- FONCTION MESSAGE DE CONFIRMATION ---
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Succès", message);
    }
  };

  // --- ACTIONS DE NAVIGATION ---
  // On ferme la modal d'abord pour que la page appelée soit visible immédiatement
  const handleOpenHelp = () => {
    onClose(); 
    router.push('/help'); 
  };

  const handleOpenPrivacy = () => {
    onClose(); 
    router.push('/privacy-policy'); 
  };

  // --- ACTIONS FIREBASE ---
  const handleToggleNotifications = async (value: boolean) => {
    setPushNotifications(value);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          'settings.pushNotifications': value
        });
        showToast(value ? "Notifications activées" : "Notifications désactivées");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour vos préférences.");
    }
  };

  const executeDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert("Erreur", "Mot de passe requis.");
      return;
    }
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      router.replace('/login');
    } catch (error) {
      Alert.alert("Erreur", "Vérifiez votre mot de passe.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        
        {/* HEADER - DÉGRADÉ MAUVE EXACT */}
        <LinearGradient
          colors={['#7459f0', '#242A65']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Paramètres</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionTitle}>COMPTE</Text>
          <View style={styles.settingsGroup}>
            {/* Profil - Ferme simplement la modal */}
            <TouchableOpacity style={styles.settingsRow} onPress={onClose}>
              <View style={[styles.iconBg, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="person-outline" size={20} color="#7459f0" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Profil</Text>
                <Text style={styles.rowSubtitle}>{userProfile?.prenom || 'Ines'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <View style={styles.separator} />

            {/* Notifications */}
            <View style={styles.settingsRow}>
              <View style={[styles.iconBg, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.rowTitle, { flex: 1, marginLeft: 12 }]}>Notifications Push</Text>
              <Switch 
                value={pushNotifications} 
                onValueChange={handleToggleNotifications} 
                trackColor={{ false: "#D1D5DB", true: "#7459f0" }}
              />
            </View>

            <View style={styles.separator} />

            {/* Confidentialité */}
            <TouchableOpacity style={styles.settingsRow} onPress={handleOpenPrivacy}>
              <View style={[styles.iconBg, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#0284C7" />
              </View>
              <Text style={[styles.rowTitle, { flex: 1, marginLeft: 12 }]}>Confidentialité</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.settingsRow} onPress={handleOpenHelp}>
              <View style={[styles.iconBg, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="help-circle-outline" size={20} color="#16A34A" />
              </View>
              <Text style={[styles.rowTitle, { flex: 1, marginLeft: 12 }]}>Aide & FAQ</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>ACTIONS</Text>
          <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setShowDeleteAccount(true)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.deleteAccountText}>Supprimer mon compte</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>SwipeSkills v1.0.0</Text>
        </ScrollView>
      </View>

      {/* MODAL DE SUPPRESSION */}
      <Modal visible={showDeleteAccount} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmer la suppression</Text>
            <TextInput 
              style={styles.modalInput}
              placeholder="Mot de passe"
              secureTextEntry
              onChangeText={setDeletePassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowDeleteAccount(false)}>
                <Text style={styles.modalBtnSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDanger} onPress={executeDeleteAccount}>
                {isDeleting ? <ActivityIndicator color="white" /> : <Text style={{color:'white', fontWeight:'bold'}}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginTop: 20, marginBottom: 8, marginLeft: 4 },
  settingsGroup: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowContent: { flex: 1, marginLeft: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  rowSubtitle: { fontSize: 13, color: '#6B7280' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 64 },
  deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA' },
  deleteAccountText: { fontWeight: '700', color: '#EF4444' },
  versionText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalBtnSecondary: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalBtnSecondaryText: { color: '#4B5563', fontWeight: 'bold' },
  modalBtnDanger: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center' },
});