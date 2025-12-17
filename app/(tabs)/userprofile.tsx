import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import { Alert, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';

// 🔥 IMPORTS FIREBASE
import { auth, db } from '../../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore'; 

// 🔥 IMPORTS UTILS
import { 
    updateUserProfile, 
    updateProfileImage, 
    removeProfileImage,
    getUserProfile, // Fonction intelligente qui cherche dans les 2 collections
    UserProfile 
} from '../utils/userProfile';

import { addUserXP } from '../utils/progressManager';

// Composant Avatar
function Avatar({ emoji, imageUri }: { emoji: string; imageUri: string | null }) {
    return (
        <View style={styles.avatar}> 
            {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatarImage} />
            ) : (
                <Text style={styles.avatarEmoji}>{emoji}</Text>
            )}
        </View>
    );
}

interface VideoItem { id: string; title: string; subtitle: string; }
interface Badge { title: string; emoji: string; }

export default function UserProfileLearner() {
    const router = useRouter();
    const [tab, setTab] = useState<'favorites' | 'history' | 'saved'>('favorites');
    const [openedTab, setOpenedTab] = useState<'favorites' | 'history' | 'saved' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // États Profil
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [profileEmoji, setProfileEmoji] = useState('👤');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    
    // 🔥 NOUVEAUX ÉTATS POUR LE RÔLE
    const [roleLabel, setRoleLabel] = useState('Apprenant'); // Par défaut
    const [roleColor, setRoleColor] = useState('#6B46FF');   // Violet par défaut
    
    // États Stats & Progression
    const [stats, setStats] = useState({ likesCount: 0, followersCount: 0, savedCount: 0 });
    const [progressData, setProgressData] = useState({ level: 1, currentXP: 0, nextLevelXP: 100 });

    // États Modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [tempUsername, setTempUsername] = useState('');
    const [tempBio, setTempBio] = useState('');
    const [tempEmoji, setTempEmoji] = useState('');
    const [tempImage, setTempImage] = useState<string | null>(null);

    // Mock Data
    const [favorites, setFavorites] = useState<VideoItem[]>([
        { id: 'f1', title: 'Vidéo favorite: Marketing Digital', subtitle: '5 min' },
    ]);
    const history: VideoItem[] = [{ id: 'h1', title: 'Vidéo regardée: Growth Hacking', subtitle: 'vu il y a 2 jours' }];
    const saved: VideoItem[] = [{ id: 's1', title: 'Article: SEO avancé', subtitle: 'sauvegardé' }];
    const badges: Badge[] = [
        { title: 'Expert\nMarketing', emoji: '🏅' },
        { title: 'Développeur\nPython', emoji: '🐍' },
        { title: 'Expert\nData', emoji: '📊' },
    ];

    // 🔥 1. CHARGEMENT INITIAL (Pour définir la collection à écouter)
    useEffect(() => {
        const initProfile = async () => {
            const user = auth.currentUser;
            if (!user) {
                router.replace('/auth');
                return;
            }

            try {
                // On utilise getUserProfile une fois pour savoir qui on est (rôle + collection)
                // getUserProfile est assez malin pour chercher dans 'users' ou 'formateurs'
                const initialData = await getUserProfile(user.uid);
                
                // Définition de la collection à écouter en temps réel
                const collectionName = initialData.role === 'creator' ? 'formateurs' : 'users';
                
                console.log(`🔌 Connexion au profil (${initialData.role}) dans la collection: ${collectionName}`);
                
                // On lance l'écouteur sur la bonne collection
                setupRealtimeListener(user.uid, collectionName);

            } catch (error) {
                console.error("Erreur identification profil:", error);
                setIsLoading(false);
            }
        };

        initProfile();
    }, []);

    // 🔥 2. ÉCOUTEUR TEMPS RÉEL (Dynamique selon la collection)
    const setupRealtimeListener = (uid: string, collectionName: string) => {
        const userRef = doc(db, collectionName, uid);

        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                
                setUsername(data.username || "Utilisateur");
                setBio(data.bio || "");
                setProfileEmoji(data.profileEmoji || "👤");
                setProfileImage(data.profileImage || null);
                
                // 🔥 MISE À JOUR DU RÔLE DANS L'INTERFACE
                if (data.role === 'creator') {
                    setRoleLabel('Formateur');
                    setRoleColor('#FBA31A'); // Orange pour les formateurs
                } else {
                    setRoleLabel('Apprenant');
                    setRoleColor('#6B46FF'); // Violet pour les apprenants
                }

                if (data.stats) setStats(data.stats);
                if (data.progressData) setProgressData(data.progressData);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("❌ Erreur onSnapshot:", error);
            setIsLoading(false);
        });

        // Nettoyage impossible ici facilement car dans useEffect, 
        // mais pour ce use-case simple c'est acceptable.
    };

    function handleTabPress(newTab: 'favorites' | 'history' | 'saved') {
        setTab(newTab);
        setOpenedTab(prev => (prev === newTab ? null : newTab));
    }
    const removeFavorite = (id: string) => setFavorites(prev => prev.filter(i => i.id !== id));
    
    // Modal & Save Logic
    const openEditModal = () => {
        setTempUsername(username); setTempBio(bio); setTempEmoji(profileEmoji); setTempImage(profileImage);
        setIsModalVisible(true);
    };
    const cancelEdit = () => setIsModalVisible(false);
    
    const saveProfile = async () => {
        if (!auth.currentUser) return;
        setIsSaving(true);
        try {
            let finalImageUrl = profileImage;
            if (tempImage && tempImage !== profileImage) {
                if (!tempImage.startsWith('http')) {
                    const result = await updateProfileImage(tempImage);
                    finalImageUrl = result.imageUrl; 
                }
            } else if (!tempImage && profileImage) {
                await removeProfileImage();
                finalImageUrl = null;
            }
            const updates = { username: tempUsername, bio: tempBio, profileEmoji: tempEmoji, profileImage: finalImageUrl };
            await updateUserProfile(updates);
            setIsModalVisible(false);
            Alert.alert('✅ Succès', 'Profil mis à jour !');
        } catch (error) {
            Alert.alert("Erreur", "Impossible de mettre à jour.");
        } finally {
            setIsSaving(false);
        }
    };

    // Fonctions Image
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Erreur', 'Permission refusée');
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        if (!res.canceled) setTempImage(res.assets[0].uri);
    };
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Erreur', 'Permission refusée');
        const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        if (!res.canceled) setTempImage(res.assets[0].uri);
    };
    const removeImage = () => setTempImage(null);
    const emojis = ['👩‍🎓', '👨‍🎓', '🧑‍💻', '👩‍💼', '👨‍💼', '🧑‍🔬', '👩‍🏫', '👨‍🏫', '🧑‍🎨', '👩‍🚀'];

    const handleTestXP = async () => {
        try {
            await addUserXP(50);
        } catch (e) {
            Alert.alert("Erreur XP", "Impossible d'ajouter l'XP");
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#6B46FF" />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <Link href="/" asChild>
                        <Pressable style={styles.backButton}><Ionicons name="chevron-back" size={28} color="#6b6b6b" /></Pressable>
                    </Link>
                    <View style={{ flex: 1 }} />
                    <Pressable style={styles.infoButton} onPress={() => Alert.alert("Paramètres", "À venir...")}>
                        <Ionicons name="settings-outline" size={24} color="#6B46FF" />
                    </Pressable>
                </View>

                {/* Center Content */}
                <View style={styles.centerColumn}>
                    <Avatar emoji={profileEmoji} imageUri={profileImage} />
                    <Text style={styles.handle}>@{username}</Text>
                    {bio ? <Text style={styles.bioText}>{bio}</Text> : null}
                    
                    {/* 🔥 BADGE DE RÔLE DYNAMIQUE */}
                    <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
                        <Text style={styles.roleText}>{roleLabel}</Text>
                    </View>

                    <Pressable style={styles.editButton} onPress={openEditModal}><Text style={styles.editButtonText}>Modifier le profil</Text></Pressable>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, styles.statOrange]}>
                            <Text style={styles.statNumber}>{stats.likesCount}</Text>
                            <Text style={styles.statLabel}>Aimées</Text>
                        </View>
                        <View style={[styles.statBox, styles.statPurple]}>
                            <Text style={styles.statNumber}>{stats.followersCount}</Text>
                            <Text style={styles.statLabel}>Abonnés</Text>
                        </View>
                        <View style={[styles.statBox, styles.statOrange]}>
                            <Text style={styles.statNumber}>{stats.savedCount}</Text>
                            <Text style={styles.statLabel}>Sauvegardes</Text>
                        </View>
                    </View>

                    {/* Progress Card */}
                    <Link href="/progression" asChild>
                        <Pressable style={({ pressed }) => [styles.progressCard, pressed && styles.cardPressed]}>
                            <View style={styles.progressTitleRow}>
                                <View style={styles.titleLeft}>
                                    <Ionicons name="trending-up" size={20} color="#FF9A2A" />
                                    <Text style={styles.progressTitle}>Progression globale</Text>
                                </View>
                                <View style={styles.levelBadgeContainer}>
                                    <Text style={styles.levelBadge}>Niveau {progressData.level}</Text>
                                </View>
                            </View>

                            <View style={styles.progressBarContainer}>
                                <View style={styles.progressTrack}>
                                    <View style={[
                                        styles.progressFill, 
                                        { width: `${Math.min((progressData.currentXP / progressData.nextLevelXP) * 100, 100)}%` }
                                    ]} />
                                </View>
                            </View>

                            <Text style={styles.progressSub}>
                                {progressData.currentXP} / {progressData.nextLevelXP} XP pour niveau {progressData.level + 1}
                            </Text>
                            
                            <Pressable 
                                onPress={(e) => {
                                    e.preventDefault();
                                    handleTestXP();
                                }} 
                                style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#E0D6FF', padding: 5, borderRadius: 5 }}
                            >
                                <Text style={{ color: '#6B46FF', fontSize: 10, fontWeight: 'bold' }}>⚡ TEST: +50 XP</Text>
                            </Pressable>

                            <View style={styles.progressCardFooter}>
                                <Text style={styles.progressCardLink}>Voir plus de détails</Text>
                                <Ionicons name="chevron-forward" size={18} color="#6B46FF" />
                            </View>
                        </Pressable>
                    </Link>

                    {/* Badges & Tabs */}
                    <Link href="/progression" asChild>
                        <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <Ionicons name="ribbon" size={20} color="#FF9A2A" />
                                    <Text style={styles.cardTitleText}>Badges & Réalisation</Text>
                                </View>
                                <View style={styles.countBadgeContainer}><Text style={styles.countBadge}>3/8</Text></View>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesRow}>
                                {badges.map((badge, index) => (
                                    <View key={index} style={styles.badgeItem}>
                                        <View style={styles.badgeIcon}><Text style={styles.badgeEmoji}>{badge.emoji}</Text></View>
                                        <Text style={[styles.badgeLabel, { color: '#6B46FF' }]}>{badge.title}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                            <View style={styles.badgeCardFooter}>
                                <Text style={styles.badgeCardLink}>Voir tous les badges</Text>
                                <Ionicons name="chevron-forward" size={18} color="#6B46FF" />
                            </View>
                        </Pressable>
                    </Link>

                    <View style={styles.tabsContainer}>
                        <View style={styles.tabRow}>
                            <Pressable onPress={() => handleTabPress('favorites')} style={[styles.tabButton, tab === 'favorites' && styles.tabButtonActive]}>
                                <Text style={[styles.tabLabel, tab === 'favorites' && styles.tabLabelActive]}>Favoris</Text>
                            </Pressable>
                            <Pressable onPress={() => handleTabPress('history')} style={[styles.tabButton, tab === 'history' && styles.tabButtonActive]}>
                                <Text style={[styles.tabLabel, tab === 'history' && styles.tabLabelActive]}>Historique</Text>
                            </Pressable>
                            <Pressable onPress={() => handleTabPress('saved')} style={[styles.tabButton, tab === 'saved' && styles.tabButtonActive]}>
                                <Text style={[styles.tabLabel, tab === 'saved' && styles.tabLabelActive]}>Sauvegardés</Text>
                            </Pressable>
                        </View>
                        {openedTab === tab && (
                            <FlatList
                                data={tab === 'favorites' ? favorites : tab === 'history' ? history : saved}
                                keyExtractor={(item) => item.id}
                                style={styles.contentList}
                                renderItem={({ item }) => (
                                    <View style={styles.itemCardRow}>
                                        <View style={styles.itemCardContent}>
                                            <Text style={styles.itemTitle}>{item.title}</Text>
                                            <Text style={styles.itemSub}>{item.subtitle}</Text>
                                        </View>
                                        <View style={styles.itemActions}>
                                            {tab === 'favorites' && (
                                                <Pressable style={styles.favoriteButton} onPress={() => removeFavorite(item.id)}>
                                                    <Ionicons name="heart" size={24} color="#FF3B30" />
                                                </Pressable>
                                            )}
                                            <Pressable style={styles.itemCta}><Text style={styles.itemCtaText}>Voir</Text></Pressable>
                                        </View>
                                    </View>
                                )}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </View>
            </ScrollView>

            <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={cancelEdit}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Modifier le profil</Text>
                            <Pressable onPress={cancelEdit} style={styles.closeButton}><Ionicons name="close" size={28} color="#6b6b6b" /></Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.sectionLabel}>Photo de profil</Text>
                            <View style={styles.currentPhotoContainer}>
                                {tempImage ? <Image source={{ uri: tempImage }} style={styles.currentPhoto} /> : <View style={styles.currentPhotoEmoji}><Text style={styles.currentPhotoEmojiText}>{tempEmoji}</Text></View>}
                            </View>
                            <View style={styles.photoButtons}>
                                <Pressable style={styles.photoButton} onPress={pickImage}><Ionicons name="images-outline" size={24} color="#6B46FF" /><Text style={styles.photoButtonText}>Galerie</Text></Pressable>
                                <Pressable style={styles.photoButton} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color="#6B46FF" /><Text style={styles.photoButtonText}>Caméra</Text></Pressable>
                                {tempImage && <Pressable style={styles.photoButton} onPress={removeImage}><Ionicons name="trash-outline" size={24} color="#FF3B30" /><Text style={[styles.photoButtonText, { color: '#FF3B30' }]}>Supprimer</Text></Pressable>}
                            </View>
                            <Text style={styles.sectionLabel}>Ou choisir un emoji</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScrollView}>
                                {emojis.map((emoji, index) => (
                                    <Pressable key={index} onPress={() => { setTempEmoji(emoji); setTempImage(null); }} style={[styles.emojiOption, tempEmoji === emoji && !tempImage && styles.emojiOptionSelected]}>
                                        <Text style={styles.emojiOptionText}>{emoji}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                            <Text style={styles.sectionLabel}>Nom d’utilisateur</Text>
                            <TextInput style={styles.input} value={tempUsername} onChangeText={setTempUsername} placeholder="@nom" placeholderTextColor="#B0B0B0" />
                            <Text style={styles.sectionLabel}>Biographie</Text>
                            <TextInput style={[styles.input, styles.textArea]} value={tempBio} onChangeText={setTempBio} placeholder="Bio..." placeholderTextColor="#B0B0B0" multiline numberOfLines={4} maxLength={200} textAlignVertical="top" />
                            <Text style={styles.charCount}>{tempBio.length}/200</Text>
                            <View style={styles.modalButtons}>
                                <Pressable style={styles.cancelButton} onPress={cancelEdit} disabled={isSaving}><Text style={styles.cancelButtonText}>Annuler</Text></Pressable>
                                <Pressable style={styles.saveButton} onPress={saveProfile} disabled={isSaving}>
                                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 100 : 90, backgroundColor: '#FFFFFF' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    infoButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    centerColumn: { alignItems: 'center' },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEE5FF', alignItems: 'center', justifyContent: 'center', marginTop: 8, overflow: 'hidden' },
    avatarEmoji: { fontSize: 48 },
    avatarImage: { width: '100%', height: '100%' },
    handle: { marginTop: 8, color: '#2b2b2b', fontWeight: '600' },
    bioText: { marginTop: 8, color: '#6b6b6b', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
    roleBadge: { marginTop: 6, backgroundColor: '#6B46FF', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    roleText: { color: '#fff', fontWeight: '600' },
    editButton: { marginTop: 12, backgroundColor: '#6B46FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
    editButtonText: { color: '#fff', fontWeight: '600' },
    statsRow: { flexDirection: 'row', marginTop: 16, width: '100%', justifyContent: 'space-between', paddingHorizontal: 8 },
    statBox: { flex: 1, minWidth: 56, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
    statOrange: { backgroundColor: '#FF9A2A' },
    statPurple: { backgroundColor: '#6B46FF' },
    statNumber: { color: '#fff', fontSize: 18, fontWeight: '700' },
    statLabel: { color: '#fff', fontSize: 11, marginTop: 2 },
    card: { width: '100%', marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#F8F6FF' },
    cardPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
    cardTitleText: { marginLeft: 8, fontSize: 16, fontWeight: '600' },
    levelBadgeContainer: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    levelBadge: { fontSize: 12, color: '#6B46FF', fontWeight: '600' },
    countBadgeContainer: { backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    countBadge: { fontSize: 12, color: '#FF9A2A', fontWeight: '600' },
    progressCard: { width: '100%', backgroundColor: '#F8F6FF', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, marginTop: 16 },
    progressTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    titleLeft: { flexDirection: 'row', alignItems: 'center' },
    progressTitle: { marginLeft: 8, fontSize: 16, fontWeight: '600' },
    progressBarContainer: { marginBottom: 8 },
    progressTrack: { height: 8, backgroundColor: '#E0D6FF', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#FF9A2A', borderRadius: 4 },
    progressSub: { color: '#6b6b6b', fontSize: 12 },
    progressCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0D6FF' },
    progressCardLink: { fontSize: 14, fontWeight: '600', color: '#6B46FF', marginRight: 4 },
    badgesRow: { marginTop: 8 },
    badgeItem: { width: 70, alignItems: 'center', marginRight: 12 },
    badgeIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6B46FF', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    badgeEmoji: { fontSize: 24 },
    badgeLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13 },
    badgeCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0D6FF' },
    badgeCardLink: { fontSize: 14, fontWeight: '600', color: '#6B46FF', marginRight: 4 },
    tabsContainer: { width: '100%', marginTop: 16, backgroundColor: '#F8F6FF', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    tabButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'transparent' },
    tabButtonActive: { backgroundColor: '#6B46FF' },
    tabLabel: { fontSize: 14, color: '#6b6b6b' },
    tabLabelActive: { color: '#fff' },
    contentList: { width: '100%', marginTop: 8, maxHeight: 260 },
    itemCardRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8 },
    itemCardContent: { flex: 1, paddingRight: 8 },
    itemTitle: { fontWeight: '600', fontSize: 14 },
    itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    favoriteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE5E5', alignItems: 'center', justifyContent: 'center' },
    itemCta: { backgroundColor: '#FD9A34', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: 'center' },
    itemCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    itemSub: { marginTop: 4, color: '#6b6b6b', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    sectionLabel: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 12, marginTop: 16 },
    currentPhotoContainer: { alignItems: 'center', marginBottom: 16 },
    currentPhoto: { width: 120, height: 120, borderRadius: 60 },
    currentPhotoEmoji: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEE5FF', alignItems: 'center', justifyContent: 'center' },
    currentPhotoEmojiText: { fontSize: 60 },
    photoButtons: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
    photoButton: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#F8F6FF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E8E8' },
    photoButtonText: { fontSize: 12, color: '#6B46FF', fontWeight: '600', marginTop: 4 },
    input: { backgroundColor: '#F8F6FF', borderRadius: 12, padding: 14, fontSize: 16, color: '#1A1A1A', borderWidth: 1, borderColor: '#E8E8E8' },
    textArea: { height: 100, textAlignVertical: 'top' },
    charCount: { fontSize: 12, color: '#B0B0B0', textAlign: 'right', marginTop: 4 },
    emojiScrollView: { marginBottom: 8 },
    emojiOption: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F8F6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2, borderColor: 'transparent' },
    emojiOptionSelected: { borderColor: '#6B46FF', backgroundColor: '#EEE5FF' },
    emojiOptionText: { fontSize: 32 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, marginBottom: 20, gap: 12 },
    cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 25, backgroundColor: '#F8F6FF', alignItems: 'center' },
    cancelButtonText: { color: '#6B46FF', fontWeight: '600', fontSize: 16 },
    saveButton: { flex: 1, paddingVertical: 14, borderRadius: 25, backgroundColor: '#6B46FF', alignItems: 'center' },
    saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});