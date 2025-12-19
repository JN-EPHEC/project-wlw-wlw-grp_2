import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, TextInput, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
// Vérifie tes chemins d'import ici
import { auth, db, storage } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// 1. AJOUT DE L'IMPORT SIGNOUT
import { signOut } from 'firebase/auth';

const { width } = Dimensions.get('window');

export default function ProfileFormateurScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('videos'); 
  
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data);
        setEditedName(`${data.prenom || ''} ${data.nom || ''}`);
        setEditedBio(data.bio || "Formateur expert sur SwipeSkills 🎓");
      }
    } catch (error) {
      console.error("Erreur Firebase:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. FONCTION DE DÉCONNEXION
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Désolé', 'Accès aux photos requis.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);

      await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });
      setUserProfile((prev: any) => ({ ...prev, photoURL: downloadURL }));
      
      Alert.alert("Succès", "Photo de profil mise à jour !");
    } catch (e) { 
      Alert.alert("Erreur", "Le téléchargement a échoué."); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const [prenom, ...nomArray] = editedName.split(' ');
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        prenom, nom: nomArray.join(' '), bio: editedBio
      });
      setIsEditing(false);
      loadProfile();
    } catch (e) { Alert.alert("Erreur", "Mise à jour impossible"); }
    finally { setLoading(false); }
  };

  if (loading || !userProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
      
      {/* 1. HEADER VIOLET */}
      <View style={styles.headerWrapper}>
        <LinearGradient colors={['#9333ea', '#7e22ce']} style={styles.headerGradient}>
          <View style={styles.topIcons}>
            <TouchableOpacity style={styles.glassIcon}>
                <Ionicons name="share-social-outline" size={20} color="white" />
            </TouchableOpacity>
            
            {/* 3. BOUTON DÉCONNEXION (Remplacement de Settings) */}
            <TouchableOpacity 
              style={[styles.glassIcon, { backgroundColor: 'rgba(239, 68, 68, 0.4)' }]} 
              onPress={handleLogout}
            >
                <Ionicons name="log-out-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarBorder} disabled={isUploading}>
            {isUploading ? (
              <View style={styles.center}><ActivityIndicator color="white" /></View>
            ) : userProfile.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInit}>{userProfile.prenom?.[0] || 'F'}</Text>
              </View>
            )}
            
            <View style={styles.roleBadge}>
              <Ionicons name="school" size={10} color="#9333ea" />
              <Text style={styles.roleText}>Formateur</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. INFOS IDENTITÉ */}
      <View style={styles.identitySection}>
        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput style={styles.input} value={editedName} onChangeText={setEditedName} placeholder="Nom Complet" />
            <TextInput style={styles.input} value={editedBio} onChangeText={setEditedBio} multiline />
            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}><Text style={styles.saveBtnText}>Valider</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{userProfile.prenom} {userProfile.nom}</Text>
            <Text style={styles.bio}>{userProfile.bio || "Formateur expert sur SwipeSkills 🎓"}</Text>
            <Text style={styles.memberSince}>Membre depuis décembre 2025</Text>
            <TouchableOpacity style={styles.modifyBtn} onPress={() => setIsEditing(true)}>
              <Ionicons name="create-outline" size={16} color="#9333ea" />
              <Text style={styles.modifyText}>Modifier mon espace</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 3. STATS CRÉATEUR */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statNum}>0</Text><Text style={styles.statLabel}>Vues totales</Text></View>
        <View style={styles.statCard}><Text style={styles.statNum}>0 💖</Text><Text style={styles.statLabel}>Mentions J'aime</Text></View>
        <View style={styles.statCard}><Text style={styles.statNum}>0</Text><Text style={styles.statLabel}>Abonnés</Text></View>
      </View>

      {/* 4. ANALYTIQUES RAPIDES */}
      <View style={styles.analyticsSection}>
        <View style={styles.levelHeader}>
          <View style={styles.levelIcon}><Ionicons name="trending-up" size={16} color="white" /></View>
          <Text style={styles.levelName}>Performances</Text>
          <Text style={styles.levelPercent}>Nouveau</Text>
        </View>
        <View style={styles.progressBg}><View style={[styles.progressFill, { width: '10%' }]} /></View>
        <Text style={styles.progressSub}>Postez votre première vidéo pour voir vos statistiques</Text>
      </View>

      {/* 5. TABS */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'videos' && styles.activeTab]} onPress={() => setActiveTab('videos')}>
          <Text style={[styles.tabLabel, activeTab === 'videos' && styles.activeLabel]}>🎬 Mes Vidéos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'stats' && styles.activeTab]} onPress={() => setActiveTab('stats')}>
          <Text style={[styles.tabLabel, activeTab === 'stats' && styles.activeLabel]}>📊 Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* 6. CONTENU */}
      <View style={styles.contentSection}>
        <View style={styles.emptyCard}>
          <Ionicons name={activeTab === 'videos' ? "videocam-outline" : "stats-chart-outline"} size={40} color="#D1D1D6" />
          <Text style={styles.emptyText}>
            {activeTab === 'videos' 
              ? "Vous n'avez pas encore publié de contenu." 
              : "Les données analytiques s'afficheront après vos premières vues."}
          </Text>
          {activeTab === 'videos' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/upload')}>
              <Text style={styles.addBtnText}>Publier ma première vidéo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrapper: { height: 180, marginBottom: 60 },
  headerGradient: { height: 160, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: 50, paddingHorizontal: 20 },
  topIcons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  glassIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 },
  avatarSection: { position: 'absolute', bottom: -50, width: width, alignItems: 'center' },
  avatarBorder: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: 'white', backgroundColor: '#9333ea', elevation: 5, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 55 },
  avatarCircle: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#9333ea' },
  avatarInit: { color: 'white', fontSize: 40, fontWeight: 'bold' },
  roleBadge: { position: 'absolute', bottom: 5, alignSelf: 'center', backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, borderWidth: 1, borderColor: '#F3E8FF', zIndex: 10 },
  roleText: { fontSize: 10, color: '#9333ea', fontWeight: 'bold', marginLeft: 4 },
  identitySection: { alignItems: 'center', marginTop: 10, paddingHorizontal: 30 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#18181B' },
  bio: { fontSize: 14, color: '#71717A', marginTop: 4, textAlign: 'center' },
  memberSince: { fontSize: 11, color: '#A1A1AA', marginTop: 4 },
  modifyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E9D5FF' },
  modifyText: { color: '#9333ea', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 25 },
  statCard: { width: (width - 60) / 3, backgroundColor: '#F9FAFB', paddingVertical: 15, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#18181B' },
  statLabel: { fontSize: 11, color: '#71717A', marginTop: 2 },
  analyticsSection: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#F0FDF4', padding: 18, borderRadius: 24 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  levelIcon: { width: 28, height: 28, backgroundColor: '#22C55E', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  levelName: { flex: 1, marginLeft: 10, fontWeight: 'bold', color: '#18181B' },
  levelPercent: { color: '#15803D', fontWeight: 'bold', fontSize: 12 },
  progressBg: { height: 8, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22C55E' },
  progressSub: { fontSize: 11, color: '#71717A', textAlign: 'center', marginTop: 10 },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 30, backgroundColor: '#F9FAFB', padding: 4, borderRadius: 15 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  activeTab: { backgroundColor: 'white', elevation: 2 },
  tabLabel: { fontSize: 12, color: '#71717A', fontWeight: '600' },
  activeLabel: { color: '#9333ea' },
  contentSection: { marginHorizontal: 20, marginTop: 20 },
  emptyCard: { padding: 40, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', borderStyle: 'dashed' },
  emptyText: { textAlign: 'center', color: '#71717A', fontSize: 13, marginTop: 15, lineHeight: 20 },
  addBtn: { marginTop: 20, backgroundColor: '#9333ea', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 15 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  editForm: { width: '100%' },
  input: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E4E4E7' },
  saveBtn: { backgroundColor: '#9333ea', padding: 12, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold' }
});