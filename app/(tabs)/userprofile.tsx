import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SwipeableVideoItem from '../../components/SwipeableVideoItem';
import { useProgress } from '../ProgressContext';

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

interface VideoItem {
    id: string;
    title: string;
    subtitle: string;
}

interface Badge {
    title: string;
    emoji: string;
}

export default function UserProfileLearner() {
    const router = useRouter();
    
    const [tab, setTab] = useState<'favorites' | 'history' | 'saved'>('favorites');
    const [openedTab, setOpenedTab] = useState<'favorites' | 'history' | 'saved' | null>(null);
    
    // Utiliser le contexte de progression
    const { progressData, badges, badgesCount } = useProgress();
    
    // États pour le profil
    const [username, setUsername] = useState('@sophiedubois');
    const [bio, setBio] = useState('');
    const [profileEmoji, setProfileEmoji] = useState('👩‍🎓');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    
    // État pour le modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    
    // États temporaires pour l'édition
    const [tempUsername, setTempUsername] = useState(username);
    const [tempBio, setTempBio] = useState(bio);
    const [tempEmoji, setTempEmoji] = useState(profileEmoji);
    const [tempImage, setTempImage] = useState<string | null>(profileImage);

    // États pour les vidéos
    const [favorites, setFavorites] = useState<VideoItem[]>([
        { id: 'f1', title: "Marketing digital pour débutants", subtitle: '5 min • favori' },
        { id: 'f2', title: "Introduction au Python", subtitle: '8 min • favori' },
    ]);

    const [history, setHistory] = useState<VideoItem[]>([
        { id: 'h1', title: 'Vidéo regardée: Growth Hacking', subtitle: 'vu il y a 2 jours' },
        { id: 'h2', title: 'Podcast: Design moderne', subtitle: 'vu il y a 5 jours' },
    ]);

    const [saved, setSaved] = useState<VideoItem[]>([
        { id: 's1', title: 'Article: SEO avancé', subtitle: 'sauvegardé' },
        { id: 's2', title: 'Checklist: Lancement produit', subtitle: 'sauvegardé' },
    ]);

    function handleTabPress(newTab: 'favorites' | 'history' | 'saved') {
        setTab(newTab);
        setOpenedTab(prev => (prev === newTab ? null : newTab));
    }

    // Fonction pour supprimer un favori
    const removeFavorite = (id: string) => {
        setFavorites(prevFavorites => prevFavorites.filter(item => item.id !== id));
    };

    // Fonction pour ouvrir le modal
    const openEditModal = () => {
        setTempUsername(username);
        setTempBio(bio);
        setTempEmoji(profileEmoji);
        setTempImage(profileImage);
        setIsModalVisible(true);
    };

    // Fonction pour sauvegarder les modifications
    const saveProfile = () => {
        setUsername(tempUsername);
        setBio(tempBio);
        setProfileEmoji(tempEmoji);
        setProfileImage(tempImage);
        setIsModalVisible(false);
    };

    // Fonction pour annuler les modifications
    const cancelEdit = () => {
        setIsModalVisible(false);
    };

    // Fonction pour choisir une image depuis la galerie
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert(
                'Permission refusée',
                'Nous avons besoin de votre permission pour accéder à vos photos.'
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setTempImage(result.assets[0].uri);
        }
    };

    // Fonction pour prendre une photo avec la caméra
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert(
                'Permission refusée',
                'Nous avons besoin de votre permission pour accéder à votre caméra.'
            );
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setTempImage(result.assets[0].uri);
        }
    };

    // Fonction pour supprimer la photo
    const removeImage = () => {
        setTempImage(null);
    };

    const emojis = ['👩‍🎓', '👨‍🎓', '🧑‍💻', '👩‍💼', '👨‍💼', '🧑‍🔬', '👩‍🏫', '👨‍🏫', '🧑‍🎨', '👩‍🚀'];

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <Pressable 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={28} color="#6b6b6b" />
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable style={styles.infoButton}>
                        <Ionicons name="settings-outline" size={24} color="#6B46FF" />
                    </Pressable>
                </View>

                {/* Center Content */}
                <View style={styles.centerColumn}>
                    <Avatar emoji={profileEmoji} imageUri={profileImage} />
                    <Text style={styles.handle}>{username}</Text>
                    
                    {/* Bio */}
                    {bio ? (
                        <Text style={styles.bioText}>{bio}</Text>
                    ) : null}

                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>Apprenant</Text>
                    </View>

                    <Pressable style={styles.editButton} onPress={openEditModal}>
                        <Text style={styles.editButtonText}>Modifier le profil</Text>
                    </Pressable>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, styles.statOrange]}>
                            <Text style={styles.statNumber}>1.2k</Text>
                            <Text style={styles.statLabel}>Aimées</Text>
                        </View>
                        <View style={[styles.statBox, styles.statPurple]}>
                            <Text style={styles.statNumber}>1.2K</Text>
                            <Text style={styles.statLabel}>Abonnées</Text>
                        </View>
                        <View style={[styles.statBox, styles.statOrange]}>
                            <Text style={styles.statNumber}>{favorites.length}</Text>
                            <Text style={styles.statLabel}>Sauvegardes</Text>
                        </View>
                    </View>

                    {/* Progress Card */}
                    <Pressable 
                        style={({ pressed }) => [
                            styles.progressCard,
                            pressed && styles.cardPressed
                        ]}
                        onPress={() => router.push('/progression' as any)}
                    >
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
                                        { width: `${(progressData.currentXP / progressData.nextLevelXP) * 100}%` }
                                    ]} />
                                </View>
                            </View>

                            <Text style={styles.progressSub}>
                                {progressData.currentXP} / {progressData.nextLevelXP} XP pour niveau {progressData.level + 1}
                            </Text>
                            
                            {/* Indicateur cliquable */}
                            <View style={styles.progressCardFooter}>
                                <Text style={styles.progressCardLink}>Voir plus de détails</Text>
                                <Ionicons name="chevron-forward" size={18} color="#6B46FF" />
                            </View>
                        </Pressable>

                    {/* Badges Card */}
                    <Pressable 
                        style={({ pressed }) => [
                            styles.card,
                            pressed && styles.cardPressed
                        ]}
                        onPress={() => router.push('/progression' as any)}
                    >
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <Ionicons name="ribbon" size={20} color="#FF9A2A" />
                                    <Text style={styles.cardTitleText}>Badges & Réalisation</Text>
                                </View>
                                <View style={styles.countBadgeContainer}>
                                    <Text style={styles.countBadge}>{badgesCount.earned}/{badgesCount.total}</Text>
                                </View>
                            </View>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                style={styles.badgesRow}
                            >
                                {badges.map((badge: Badge, index: number) => (
                                    <View key={index} style={styles.badgeItem}>
                                        <View style={styles.badgeIcon}>
                                            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                                        </View>
                                        <Text style={[styles.badgeLabel, { color: '#6B46FF' }]}>{badge.title}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                            <View style={styles.badgeCardFooter}>
                                <Text style={styles.badgeCardLink}>Voir tous les badges</Text>
                                <Ionicons name="chevron-forward" size={18} color="#6B46FF" />
                            </View>
                        </Pressable>

                    {/* Profile tabs */}
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
                                    <SwipeableVideoItem
                                        id={item.id}
                                        title={item.title}
                                        subtitle={item.subtitle}
                                        onDelete={(id: string) => {
                                            if (tab === 'favorites') {
                                                removeFavorite(id);
                                            } else if (tab === 'history') {
                                                setHistory((prev: VideoItem[]) => prev.filter((h: VideoItem) => h.id !== id));
                                            } else {
                                                setSaved((prev: VideoItem[]) => prev.filter((s: VideoItem) => s.id !== id));
                                            }
                                        }}
                                        onPress={() => {
                                            // Navigation vers la vidéo
                                            console.log('Voir vidéo:', item.id);
                                        }}
                                        showFavorite={tab === 'favorites'}
                                        isFavorite={tab === 'favorites'}
                                        onToggleFavorite={() => removeFavorite(item.id)}
                                    />
                                )}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <Pressable style={styles.navItem}>
                    <Ionicons name="home-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Accueil</Text>
                </Pressable>
                
                <Pressable style={styles.navItem}>
                    <Ionicons name="search-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Explorer</Text>
                </Pressable>
                
                <Pressable style={styles.navItemCenter}>
                    <View style={styles.plusButton}>
                        <Ionicons name="add" size={32} color="#FD9A34" />
                    </View>
                </Pressable>
                
                <Pressable style={styles.navItem}>
                    <Ionicons name="notifications-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Notifications</Text>
                </Pressable>
                
                <Pressable style={styles.navItem}>
                    <Ionicons name="person" size={26} color="#6B46FF" />
                    <Text style={[styles.navText, styles.navTextActive]}>Profil</Text>
                </Pressable>
            </View>

            {/* Modal de modification */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={cancelEdit}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Modifier le profil</Text>
                            <Pressable onPress={cancelEdit} style={styles.closeButton}>
                                <Ionicons name="close" size={28} color="#6b6b6b" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Photo de profil actuelle */}
                            <Text style={styles.sectionLabel}>Photo de profil</Text>
                            <View style={styles.currentPhotoContainer}>
                                {tempImage ? (
                                    <Image source={{ uri: tempImage }} style={styles.currentPhoto} />
                                ) : (
                                    <View style={styles.currentPhotoEmoji}>
                                        <Text style={styles.currentPhotoEmojiText}>{tempEmoji}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Boutons pour ajouter/modifier la photo */}
                            <View style={styles.photoButtons}>
                                <Pressable style={styles.photoButton} onPress={pickImage}>
                                    <Ionicons name="images-outline" size={24} color="#6B46FF" />
                                    <Text style={styles.photoButtonText}>Galerie</Text>
                                </Pressable>
                                <Pressable style={styles.photoButton} onPress={takePhoto}>
                                    <Ionicons name="camera-outline" size={24} color="#6B46FF" />
                                    <Text style={styles.photoButtonText}>Caméra</Text>
                                </Pressable>
                                {tempImage && (
                                    <Pressable style={styles.photoButton} onPress={removeImage}>
                                        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                                        <Text style={[styles.photoButtonText, { color: '#FF3B30' }]}>Supprimer</Text>
                                    </Pressable>
                                )}
                            </View>

                            {/* Sélection de l'emoji */}
                            <Text style={styles.sectionLabel}>Ou choisir un emoji</Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                style={styles.emojiScrollView}
                            >
                                {emojis.map((emoji, index) => (
                                    <Pressable 
                                        key={index}
                                        onPress={() => {
                                            setTempEmoji(emoji);
                                            setTempImage(null);
                                        }}
                                        style={[
                                            styles.emojiOption,
                                            tempEmoji === emoji && !tempImage && styles.emojiOptionSelected
                                        ]}
                                    >
                                        <Text style={styles.emojiOptionText}>{emoji}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            {/* Nom d'utilisateur */}
                            <Text style={styles.sectionLabel}>Nom d'utilisateur</Text>
                            <TextInput
                                style={styles.input}
                                value={tempUsername}
                                onChangeText={setTempUsername}
                                placeholder="@nom d'utilisateur"
                                placeholderTextColor="#B0B0B0"
                            />

                            {/* Bio */}
                            <Text style={styles.sectionLabel}>Biographie</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={tempBio}
                                onChangeText={setTempBio}
                                placeholder="Parlez-nous de vous..."
                                placeholderTextColor="#B0B0B0"
                                multiline
                                numberOfLines={4}
                                maxLength={200}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCount}>{tempBio.length}/200 caractères</Text>

                            {/* Boutons */}
                            <View style={styles.modalButtons}>
                                <Pressable style={styles.cancelButton} onPress={cancelEdit}>
                                    <Text style={styles.cancelButtonText}>Annuler</Text>
                                </Pressable>
                                <Pressable style={styles.saveButton} onPress={saveProfile}>
                                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
    screen: { 
        flex: 1,
        backgroundColor: '#FFFFFF'
    },
    content: { 
        padding: 16, 
        paddingBottom: Platform.OS === 'ios' ? 100 : 90,
        backgroundColor: '#FFFFFF'
    },

    // Header
    headerRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 8 
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center'
    },

    // Center Content
    centerColumn: { alignItems: 'center' },

    // Avatar
    avatar: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        backgroundColor: '#EEE5FF',
        alignItems: 'center', 
        justifyContent: 'center',
        marginTop: 8,
        overflow: 'hidden',
    },
    avatarEmoji: { fontSize: 48 },
    avatarImage: {
        width: '100%',
        height: '100%',
    },

    // User Info
    handle: { marginTop: 8, color: '#2b2b2b', fontWeight: '600' },
    bioText: {
        marginTop: 8,
        color: '#6b6b6b',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    roleBadge: { 
        marginTop: 6, 
        backgroundColor: '#6B46FF', 
        paddingHorizontal: 16, 
        paddingVertical: 6, 
        borderRadius: 20 
    },
    roleText: { color: '#fff', fontWeight: '600' },

    // Edit Button
    editButton: { 
        marginTop: 12, 
        backgroundColor: '#6B46FF', 
        paddingHorizontal: 24, 
        paddingVertical: 12, 
        borderRadius: 25 
    },
    editButtonText: { color: '#fff', fontWeight: '600' },

    // Stats
    statsRow: { 
        flexDirection: 'row', 
        marginTop: 16, 
        width: '100%', 
        justifyContent: 'space-between',
        paddingHorizontal: 8
    },
    statBox: { 
        flex: 1,
        minWidth: 56,
        height: 60, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center',
        marginHorizontal: 4
    },
    statOrange: { backgroundColor: '#FF9A2A' },
    statPurple: { backgroundColor: '#6B46FF' },
    statNumber: { color: '#fff', fontSize: 18, fontWeight: '700' },
    statLabel: { color: '#fff', fontSize: 11, marginTop: 2 },

    // Cards
    card: { 
        width: '100%', 
        marginTop: 16, 
        padding: 16, 
        borderRadius: 16, 
        backgroundColor: '#F8F6FF' 
    },
    cardPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitleText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    levelBadgeContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    levelBadge: {
        fontSize: 12,
        color: '#6B46FF',
        fontWeight: '600'
    },
    countBadgeContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    countBadge: {
        fontSize: 12,
        color: '#FF9A2A',
        fontWeight: '600'
    },

    // Progress Card
    progressCard: {
        width: '100%',
        backgroundColor: '#F8F6FF',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginTop: 16,
    },
    progressTitleRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    titleLeft: { flexDirection: 'row', alignItems: 'center' },
    progressTitle: { marginLeft: 8, fontSize: 16, fontWeight: '600' },
    progressBarContainer: {
        marginBottom: 8,
    },
    progressTrack: { 
        height: 8, 
        backgroundColor: '#E0D6FF', 
        borderRadius: 4, 
        overflow: 'hidden' 
    },
    progressFill: { 
        height: '100%', 
        backgroundColor: '#FF9A2A', 
        borderRadius: 4,
    },
    progressSub: { color: '#6b6b6b', fontSize: 12 },
    progressCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0D6FF',
    },
    progressCardLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B46FF',
        marginRight: 4,
    },

    // Badges
    badgesRow: { marginTop: 8 },
    badgeItem: { width: 70, alignItems: 'center', marginRight: 12 },
    badgeIcon: { 
        width: 50, 
        height: 50, 
        borderRadius: 25, 
        backgroundColor: '#6B46FF', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 6 
    },
    badgeEmoji: { fontSize: 24 },
    badgeLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13 },
    badgeCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0D6FF',
    },
    badgeCardLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B46FF',
        marginRight: 4,
    },

    // Bottom Navigation
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 75,
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 20 : 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    navItemCenter: { 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: 1,
        marginTop: -10,
    },
    plusButton: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FD9A34',
        shadowColor: '#FD9A34',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    navText: { fontSize: 10, color: '#B0B0B0', marginTop: 4, fontWeight: '500' },
    navTextActive: { color: '#6B46FF' },

    // Tabs
    tabsContainer: { 
        width: '100%', 
        marginTop: 16, 
        backgroundColor: '#F8F6FF', 
        paddingVertical: 12, 
        paddingHorizontal: 12, 
        borderRadius: 16 
    },
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    tabButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'transparent' },
    tabButtonActive: { backgroundColor: '#6B46FF' },
    tabLabel: { fontSize: 14, color: '#6b6b6b' },
    tabLabelActive: { color: '#fff' },
    contentList: { width: '100%', marginTop: 8, maxHeight: 260 },
    itemCardRow: { 
        width: '100%', 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: 14, 
        backgroundColor: '#FFFFFF', 
        borderRadius: 12, 
        marginBottom: 8 
    },
    itemCardContent: { flex: 1, paddingRight: 8 },
    itemTitle: { fontWeight: '600', fontSize: 14 },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    favoriteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFE5E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemCta: { 
        backgroundColor: '#FD9A34', 
        paddingVertical: 8, 
        paddingHorizontal: 16, 
        borderRadius: 20, 
        alignSelf: 'center' 
    },
    itemCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    itemSub: { marginTop: 4, color: '#6b6b6b', fontSize: 12 },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 12,
        marginTop: 16,
    },
    currentPhotoContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    currentPhoto: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    currentPhotoEmoji: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#EEE5FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentPhotoEmojiText: {
        fontSize: 60,
    },
    photoButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8,
    },
    photoButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    photoButtonText: {
        fontSize: 12,
        color: '#6B46FF',
        fontWeight: '600',
        marginTop: 4,
    },
    input: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#B0B0B0',
        textAlign: 'right',
        marginTop: 4,
    },
    emojiScrollView: {
        marginBottom: 8,
    },
    emojiOption: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F8F6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    emojiOptionSelected: {
        borderColor: '#6B46FF',
        backgroundColor: '#EEE5FF',
    },
    emojiOptionText: {
        fontSize: 32,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 32,
        marginBottom: 20,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 25,
        backgroundColor: '#F8F6FF',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#6B46FF',
        fontWeight: '600',
        fontSize: 16,
    },
    saveButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 25,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});