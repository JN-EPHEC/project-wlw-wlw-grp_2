import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, TextInput, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { auth, db, storage } from '../../firebaseConfig'; 
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useUserProgress } from '../../hooks/useuserprogress'; // Import du hook

const { width } = Dimensions.get('window');

export default function ProfileApprenantScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('progress');
  
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Utilisation du hook de progression avec système XP
  const { stats, videosProgress, loading: progressLoading, getXPProgressPercentage } = useUserProgress();
  const xpPercentage = getXPProgressPercentage();

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
        setEditedBio(data.bio || "Passionné d'apprentissage continu 📚");
      }
    } catch (error) {
      console.error("Erreur Firebase:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Désolé', 'Nous avons besoin des permissions pour accéder à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
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

      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL
      });

      setUserProfile((prev: any) => ({ ...prev, photoURL: downloadURL }));
      Alert.alert("Succès", "Photo de profil mise à jour !");
    } catch (e) { 
      console.error(e);
      Alert.alert("Erreur", "Le téléchargement de l'image a échoué."); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const [prenom, ...nomArray] = editedName.split(' ');
      await updateDoc(doc(db, 'users', user.uid), {
        prenom: prenom || '', 
        nom: nomArray.join(' ') || '', 
        bio: editedBio
      });
      setIsEditing(false);
      loadProfile();
    } catch (e) { 
      console.error(e);
      Alert.alert("Erreur", "Mise à jour impossible"); 
    } finally { 
      setLoading(false); 
    }
  };

  if (loading || !userProfile || progressLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
      
      <View style={styles.headerWrapper}>
        <LinearGradient colors={['#9333ea', '#7e22ce']} style={styles.headerGradient}>
          <View style={styles.topIcons}>
            <TouchableOpacity style={styles.glassIcon}>
                <Ionicons name="share-social-outline" size={20} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.glassIcon, { backgroundColor: 'rgba(239, 68, 68, 0.4)' }]} 
              onPress={signOut}
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
                <Text style={styles.avatarInit}>{userProfile.prenom?.[0] || 'A'}</Text>
              </View>
            )}
            
            <View style={styles.roleBadge}>
              <Ionicons name="flash" size={10} color="#9333ea" />
              <Text style={styles.roleText}>Apprenant</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.identitySection}>
        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput style={styles.input} value={editedName} onChangeText={setEditedName} placeholder="Nom" />
            <TextInput style={styles.input} value={editedBio} onChangeText={setEditedBio} multiline />
            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}><Text style={styles.saveBtnText}>Valider</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{userProfile.prenom} {userProfile.nom}</Text>
            <Text style={styles.bio}>{userProfile.bio || "Passionné d'apprentissage continu 📚"}</Text>
            <Text style={styles.memberSince}>Membre depuis décembre 2025</Text>
            <TouchableOpacity style={styles.modifyBtn} onPress={() => setIsEditing(true)}>
              <Ionicons name="create-outline" size={16} color="#9333ea" />
              <Text style={styles.modifyText}>Modifier le profil</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* STATS DYNAMIQUES depuis Firebase */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.videosVues}</Text>
          <Text style={styles.statLabel}>Vidéos vues</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.joursConsecutifs} 🔥</Text>
          <Text style={styles.statLabel}>Jours série</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{Math.floor(stats.minutesVisionnees)}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
      </View>

      {/* NIVEAU DYNAMIQUE avec système XP */}
      <View style={styles.levelSection}>
        <View style={styles.levelHeader}>
          <View style={styles.levelIcon}>
            <Text style={styles.levelIconText}>{stats.progressData.level}</Text>
          </View>
          <Text style={styles.levelName}>Niveau {stats.progressData.level}</Text>
          <Text style={styles.levelPercent}>{Math.round(xpPercentage)}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${xpPercentage}%` }]} />
        </View>
        <Text style={styles.progressSub}>
          {stats.progressData.currentXP} / {stats.progressData.nextLevelXP} XP pour le niveau {stats.progressData.level + 1}
        </Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'progress' && styles.activeTab]} 
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabLabel, activeTab === 'progress' && styles.activeLabel]}>
            📊 Progrès
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'fav' && styles.activeTab]} 
          onPress={() => setActiveTab('fav')}
        >
          <Text style={[styles.tabLabel, activeTab === 'fav' && styles.activeLabel]}>
            ⭐ Favoris
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENU DES ONGLETS */}
      {activeTab === 'progress' && (
        <View style={styles.contentSection}>
          {videosProgress.length > 0 ? (
            videosProgress.map((video, index) => (
              <View key={index} style={styles.videoCard}>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{video.titre}</Text>
                  <Text style={styles.videoProgress}>{video.progression}% complété</Text>
                </View>
                <View style={styles.videoProgressBar}>
                  <View style={[styles.videoProgressFill, { width: `${video.progression}%` }]} />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>📺</Text>
              <Text style={styles.emptyText}>Aucune vidéo en cours</Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'fav' && (
        <View style={styles.contentSection}>
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>⭐</Text>
            <Text style={styles.emptyText}>Aucun favori pour le moment</Text>
          </View>
        </View>
      )}

      <View style={styles.badgesSection}>
        <Text style={styles.sectionTitle}>Badges débloqués</Text>
        {stats.badges.length > 0 ? (
          <View style={styles.badgesGrid}>
            {stats.badges.map((badge, index) => (
              <View key={index} style={styles.badgeCard}>
                <Text style={{ fontSize: 32 }}>{badge.icon}</Text>
                <Text style={styles.badgeName}>{badge.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.badgeEmptyCard}>
            <Text style={{ fontSize: 32 }}>🏆</Text>
            <Text style={styles.badgeEmptyText}>Regardez des vidéos pour débloquer vos badges !</Text>
          </View>
        )}
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
  levelSection: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#F5EEFF', padding: 18, borderRadius: 24 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  levelIcon: { width: 28, height: 28, backgroundColor: '#9333ea', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  levelIconText: { color: 'white', fontWeight: 'bold' },
  levelName: { flex: 1, marginLeft: 10, fontWeight: 'bold', color: '#18181B' },
  levelPercent: { color: '#71717A', fontWeight: 'bold' },
  progressBg: { height: 8, backgroundColor: 'rgba(147, 51, 234, 0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#9333ea' },
  progressSub: { fontSize: 11, color: '#71717A', textAlign: 'center', marginTop: 10 },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 30, backgroundColor: '#F9FAFB', padding: 4, borderRadius: 15 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  activeTab: { backgroundColor: 'white', elevation: 2 },
  tabLabel: { fontSize: 12, color: '#71717A', fontWeight: '600' },
  activeLabel: { color: '#9333ea' },
  contentSection: { marginHorizontal: 20, marginTop: 20 },
  videoCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  videoInfo: { marginBottom: 8 },
  videoTitle: { fontSize: 14, fontWeight: 'bold', color: '#18181B', marginBottom: 4 },
  videoProgress: { fontSize: 12, color: '#71717A' },
  videoProgressBar: { height: 6, backgroundColor: '#E4E4E7', borderRadius: 3, overflow: 'hidden' },
  videoProgressFill: { height: '100%', backgroundColor: '#9333ea' },
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', borderStyle: 'dashed' },
  emptyText: { textAlign: 'center', color: '#71717A', fontSize: 13, marginTop: 10 },
  badgesSection: { marginHorizontal: 20, marginTop: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#18181B', marginBottom: 15 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: (width - 60) / 3, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  badgeName: { fontSize: 11, color: '#18181B', marginTop: 8, textAlign: 'center' },
  badgeEmptyCard: { padding: 40, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', borderStyle: 'dashed', marginTop: 15 },
  badgeEmptyText: { textAlign: 'center', color: '#71717A', fontSize: 13, marginTop: 10 },
  editForm: { width: '100%' },
  input: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E4E4E7' },
  saveBtn: { backgroundColor: '#9333ea', padding: 12, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold' }
});