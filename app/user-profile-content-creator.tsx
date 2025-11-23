import React, { useState } from 'react';
import { Dimensions, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

function Avatar() {
    const bg = useThemeColor({ light: '#EEE5FF', dark: '#2A2540' }, 'background');
    return (
        <View style={[styles.avatar, { backgroundColor: bg }]}> 
            <ThemedText style={styles.avatarEmoji}>👩‍💼</ThemedText>
        </View>
    );
}

export default function UserProfileContentCreatorComplete() {
    const [tab, setTab] = useState<'videos' | 'history' | 'saved' | 'myvideos'>('myvideos');
    const [openedTab, setOpenedTab] = useState<'videos' | 'history' | 'saved' | 'myvideos' | null>(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [showDiplomaModal, setShowDiplomaModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [isPremium] = useState(false); // Simuler un compte non-premium
    const [creatorLevel] = useState<'amateur' | 'diplome' | 'expert'>('expert'); // Niveau du créateur

    function handleTabPress(newTab: 'videos' | 'history' | 'saved' | 'myvideos') {
        setTab(newTab);
        setOpenedTab(prev => (prev === newTab ? null : newTab));
    }

    const handleSendMessage = () => {
        console.log('Message envoyé:', messageText);
        setMessageText('');
        setShowMessageModal(false);
    };

    const handleEditVideo = (videoId: string) => {
        console.log('Éditer vidéo:', videoId);
        // Navigation vers l'éditeur
    };

    const handleDeleteVideo = (videoId: string) => {
        console.log('Supprimer vidéo:', videoId);
        // Logique de suppression
    };

    const handleVideoMenu = (videoId: string) => {
        setSelectedVideo(videoId);
    };

    // Mes vidéos créées
    const myVideos = [
        { 
            id: 'mv1', 
            title: "Marketing Digital 2024", 
            views: '12.5K',
            likes: '1.2K',
            status: 'validated', // validated, rejected, pending
            duration: '15:30',
            thumbnail: '🎯'
        },
        { 
            id: 'mv2', 
            title: "Growth Hacking Stratégies", 
            views: '8.3K',
            likes: '890',
            status: 'validated',
            duration: '12:45',
            thumbnail: '📈'
        },
        { 
            id: 'mv3', 
            title: "SEO Avancé 2024", 
            views: '5.1K',
            likes: '450',
            status: 'pending',
            duration: '18:20',
            thumbnail: '🔍'
        },
    ];

    const videos = [
        { id: 'v1', title: "Comment créer une campagne", subtitle: '3 min • publié' },
        { id: 'v2', title: "Tuto React Native", subtitle: '12 min • publié' },
    ];
    const history = [
        { id: 'h1', title: 'Vidéo regardée: Growth Hacking', subtitle: 'vu il y a 2 jours' },
        { id: 'h2', title: 'Podcast: Design moderne', subtitle: 'vu il y a 5 jours' },
    ];
    const saved = [
        { id: 's1', title: 'Article: SEO avancé', subtitle: 'sauvegardé' },
        { id: 's2', title: 'Checklist: Lancement produit', subtitle: 'sauvegardé' },
    ];

    const badges = [
        { title: 'Expert\nMarketing', emoji: '🏅' },
        { title: 'Développeur\nPython', emoji: '🐍' },
        { title: 'Expert\nData', emoji: '📊' },
        { title: 'Designer\nUI/UX', emoji: '🎨' }
    ];

    // Diplômes du créateur
    const diplomas = [
        { id: 'd1', title: 'Master Marketing Digital', institution: 'HEC Paris', year: '2020' },
        { id: 'd2', title: 'Certification Google Ads', institution: 'Google', year: '2022' },
    ];

    // Stats du créateur
    const creatorStats = {
        totalViews: '156.8K',
        totalLikes: '23.4K',
        totalVideos: '47',
        growthRate: '+12%'
    };

    // Badge de vérification selon le niveau
    const getVerificationBadge = (): { icon: any; color: string; label: string } => {
        switch(creatorLevel) {
            case 'expert':
                return { icon: 'shield-checkmark', color: '#FFD700', label: 'Expert Vérifié' };
            case 'diplome':
                return { icon: 'school', color: '#6B46FF', label: 'Diplômé' };
            case 'amateur':
                return { icon: 'checkmark-circle', color: '#4CAF50', label: 'Vérifié' };
        }
    };

    const verificationBadge = getVerificationBadge();

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <Link href="/" asChild>
                        <Pressable style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#6b6b6b" />
                        </Pressable>
                    </Link>
                    <View style={styles.headerSpacer} />
                    <Pressable style={styles.infoButton}>
                        <Ionicons name="settings-outline" size={24} color="#6B46FF" />
                    </Pressable>
                </View>

                {/* Center Content */}
                <View style={styles.centerColumn}>
                    {/* Avatar avec badge premium */}
                    <View style={styles.avatarWrapper}>
                        <Avatar />
                        {isPremium && (
                            <View style={styles.premiumBadge}>
                                <Ionicons name="star" size={16} color="#FFD700" />
                            </View>
                        )}
                        {/* Badge de vérification */}
                        <View style={styles.verificationBadge}>
                            <Ionicons name={verificationBadge.icon as any} size={14} color={verificationBadge.color} />
                        </View>
                    </View>

                    <ThemedText type="defaultSemiBold" style={styles.handle}>@clairedubois</ThemedText>
                    
                    {/* Bio avec vérification */}
                    <View style={styles.bioContainer}>
                        <ThemedText style={styles.bio}>
                            Experte Marketing Digital 🚀 | Formatrice | Partagez vos stratégies de croissance
                        </ThemedText>
                        <View style={styles.verificationLabel}>
                            <Ionicons name={verificationBadge.icon as any} size={12} color={verificationBadge.color} />
                            <ThemedText style={[styles.verificationText, { color: verificationBadge.color }]}>
                                {verificationBadge.label}
                            </ThemedText>
                        </View>
                    </View>

                    <View style={styles.roleBadge}>
                        <ThemedText style={styles.roleText}>Professionnelle</ThemedText>
                    </View>

                    {/* Boutons d'action */}
                    <View style={styles.actionButtons}>
                        <Pressable style={styles.editButton}>
                            <ThemedText style={styles.editButtonText}>Modifier le profil</ThemedText>
                        </Pressable>
                        <Pressable 
                            style={styles.messageButton}
                            onPress={() => setShowMessageModal(true)}
                        >
                            <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, styles.statOrange]}>
                            <ThemedText type="defaultSemiBold" style={styles.statNumber}>1.2k</ThemedText>
                            <ThemedText style={styles.statLabel}>Aimées</ThemedText>
                        </View>
                        <View style={[styles.statBox, styles.statPurple]}>
                            <ThemedText type="defaultSemiBold" style={styles.statNumber}>1.2K</ThemedText>
                            <ThemedText style={styles.statLabel}>Abonnées</ThemedText>
                        </View>
                        <View style={[styles.statBox, styles.statOrange]}>
                            <ThemedText type="defaultSemiBold" style={styles.statNumber}>124</ThemedText>
                            <ThemedText style={styles.statLabel}>Sauvegardes</ThemedText>
                        </View>
                    </View>

                    {/* Statistiques du créateur */}
                    <View style={styles.creatorStatsCard}>
                        <View style={styles.creatorStatsHeader}>
                            <Ionicons name="stats-chart" size={20} color="#6B46FF" />
                            <ThemedText type="subtitle" style={styles.creatorStatsTitle}>Mes statistiques</ThemedText>
                            <View style={styles.growthBadge}>
                                <ThemedText style={styles.growthText}>{creatorStats.growthRate}</ThemedText>
                            </View>
                        </View>
                        <View style={styles.creatorStatsGrid}>
                            <View style={styles.creatorStatItem}>
                                <ThemedText style={styles.creatorStatValue}>{creatorStats.totalViews}</ThemedText>
                                <ThemedText style={styles.creatorStatLabel}>Vues totales</ThemedText>
                            </View>
                            <View style={styles.creatorStatItem}>
                                <ThemedText style={styles.creatorStatValue}>{creatorStats.totalLikes}</ThemedText>
                                <ThemedText style={styles.creatorStatLabel}>Likes totaux</ThemedText>
                            </View>
                            <View style={styles.creatorStatItem}>
                                <ThemedText style={styles.creatorStatValue}>{creatorStats.totalVideos}</ThemedText>
                                <ThemedText style={styles.creatorStatLabel}>Vidéos</ThemedText>
                            </View>
                        </View>
                        <Pressable style={styles.viewAnalyticsButton}>
                            <ThemedText style={styles.viewAnalyticsText}>Voir les analyses détaillées</ThemedText>
                            <Ionicons name="chevron-forward" size={16} color="#6B46FF" />
                        </Pressable>
                    </View>

                    {/* Progress Card */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressTitleRow}>
                            <View style={styles.titleLeft}>
                                <Ionicons name="trending-up" size={20} color="#FF9A2A" />
                                <ThemedText type="subtitle" style={styles.progressTitle}>Progression globale</ThemedText>
                            </View>
                            <View style={styles.levelBadgeContainer}>
                                <ThemedText style={styles.levelBadge}>Niveau 2</ThemedText>
                            </View>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: '20%' }]} />
                            </View>
                        </View>

                        <ThemedText style={styles.progressSub}>200 / 3,000 XP pour niveau 8</ThemedText>
                    </View>

                    {/* Badges Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleRow}>
                                <Ionicons name="ribbon" size={20} color="#FF9A2A" />
                                <ThemedText type="subtitle" style={styles.cardTitleText}>Badges & Réalisation</ThemedText>
                            </View>
                            <View style={styles.countBadgeContainer}>
                                <ThemedText style={styles.countBadge}>4/8</ThemedText>
                            </View>
                        </View>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            style={styles.badgesRow}
                        >
                            {badges.map((badge, index) => (
                                <View key={index} style={styles.badgeItem}>
                                    <View style={styles.badgeIcon}>
                                        <ThemedText style={styles.badgeEmoji}>{badge.emoji}</ThemedText>
                                    </View>
                                    <ThemedText style={[styles.badgeLabel, { color: '#6B46FF' }]}>{badge.title}</ThemedText>
                                </View>
                            ))}
                        </ScrollView>
                        <Pressable 
                            style={styles.ctaButton}
                            onPress={() => setShowDiplomaModal(true)}
                        >
                            <ThemedText style={styles.ctaText}>Voir mes certificats et diplômes</ThemedText>
                        </Pressable>
                    </View>

                    {/* Profile tabs */}
                    <View style={styles.tabsContainer}>
                        <View style={styles.tabRow}>
                            <Pressable onPress={() => handleTabPress('myvideos')} style={[styles.tabButton, tab === 'myvideos' && styles.tabButtonActive]}>
                                <ThemedText style={[styles.tabLabel, tab === 'myvideos' && styles.tabLabelActive]}>Mes Vidéos</ThemedText>
                            </Pressable>
                            <Pressable onPress={() => handleTabPress('videos')} style={[styles.tabButton, tab === 'videos' && styles.tabButtonActive]}>
                                <ThemedText style={[styles.tabLabel, tab === 'videos' && styles.tabLabelActive]}>Publiées</ThemedText>
                            </Pressable>
                            <Pressable onPress={() => handleTabPress('history')} style={[styles.tabButton, tab === 'history' && styles.tabButtonActive]}>
                                <ThemedText style={[styles.tabLabel, tab === 'history' && styles.tabLabelActive]}>Historique</ThemedText>
                            </Pressable>
                            <Pressable onPress={() => handleTabPress('saved')} style={[styles.tabButton, tab === 'saved' && styles.tabButtonActive]}>
                                <ThemedText style={[styles.tabLabel, tab === 'saved' && styles.tabLabelActive]}>Sauvegardés</ThemedText>
                            </Pressable>
                        </View>

                        {openedTab === tab && (
                            <View style={styles.tabContentContainer}>
                                {tab === 'myvideos' && (
                                    <FlatList
                                        data={myVideos}
                                        keyExtractor={(item) => item.id}
                                        style={styles.contentList}
                                        renderItem={({ item }) => (
                                            <View style={styles.myVideoCard}>
                                                {/* Indicateur de validation */}
                                                <View style={[
                                                    styles.validationIndicator,
                                                    item.status === 'validated' && styles.validationGreen,
                                                    item.status === 'rejected' && styles.validationRed,
                                                    item.status === 'pending' && styles.validationYellow
                                                ]} />
                                                
                                                <View style={styles.myVideoThumbnail}>
                                                    <ThemedText style={styles.thumbnailEmoji}>{item.thumbnail}</ThemedText>
                                                    <View style={styles.videoDuration}>
                                                        <ThemedText style={styles.durationText}>{item.duration}</ThemedText>
                                                    </View>
                                                </View>
                                                
                                                <View style={styles.myVideoInfo}>
                                                    <ThemedText type="defaultSemiBold" style={styles.myVideoTitle}>{item.title}</ThemedText>
                                                    <View style={styles.myVideoStats}>
                                                        <View style={styles.videoStat}>
                                                            <Ionicons name="eye-outline" size={14} color="#6b6b6b" />
                                                            <ThemedText style={styles.videoStatText}>{item.views}</ThemedText>
                                                        </View>
                                                        <View style={styles.videoStat}>
                                                            <Ionicons name="heart-outline" size={14} color="#6b6b6b" />
                                                            <ThemedText style={styles.videoStatText}>{item.likes}</ThemedText>
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* Menu contextuel */}
                                                <Pressable 
                                                    style={styles.videoMenuButton}
                                                    onPress={() => handleVideoMenu(item.id)}
                                                >
                                                    <Ionicons name="ellipsis-vertical" size={20} color="#6b6b6b" />
                                                </Pressable>

                                                {/* Menu options */}
                                                {selectedVideo === item.id && (
                                                    <View style={styles.videoMenu}>
                                                        <Pressable 
                                                            style={styles.menuItem}
                                                            onPress={() => handleEditVideo(item.id)}
                                                        >
                                                            <Ionicons name="create-outline" size={18} color="#6B46FF" />
                                                            <ThemedText style={styles.menuItemText}>Modifier</ThemedText>
                                                        </Pressable>
                                                        <Pressable 
                                                            style={styles.menuItem}
                                                            onPress={() => handleDeleteVideo(item.id)}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                                            <ThemedText style={[styles.menuItemText, { color: '#FF6B6B' }]}>Supprimer</ThemedText>
                                                        </Pressable>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}

                                {tab === 'videos' && (
                                    <FlatList
                                        data={videos}
                                        keyExtractor={(item) => item.id}
                                        style={styles.contentList}
                                        renderItem={({ item }) => (
                                            <View style={styles.itemCardRow}>
                                                <View style={styles.itemCardContent}>
                                                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                                                    <ThemedText style={styles.itemSub}>{item.subtitle}</ThemedText>
                                                </View>
                                                <Pressable style={styles.itemCta} android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                                                    <ThemedText style={styles.itemCtaText}>Voir</ThemedText>
                                                </Pressable>
                                            </View>
                                        )}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}

                                {tab === 'history' && (
                                    <FlatList
                                        data={history}
                                        keyExtractor={(item) => item.id}
                                        style={styles.contentList}
                                        renderItem={({ item }) => (
                                            <View style={styles.itemCardRow}>
                                                <View style={styles.itemCardContent}>
                                                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                                                    <ThemedText style={styles.itemSub}>{item.subtitle}</ThemedText>
                                                </View>
                                                <Pressable style={styles.itemCta} android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                                                    <ThemedText style={styles.itemCtaText}>Voir</ThemedText>
                                                </Pressable>
                                            </View>
                                        )}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}

                                {tab === 'saved' && (
                                    <FlatList
                                        data={saved}
                                        keyExtractor={(item) => item.id}
                                        style={styles.contentList}
                                        renderItem={({ item }) => (
                                            <View style={styles.itemCardRow}>
                                                <View style={styles.itemCardContent}>
                                                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                                                    <ThemedText style={styles.itemSub}>{item.subtitle}</ThemedText>
                                                </View>
                                                <Pressable style={styles.itemCta} android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                                                    <ThemedText style={styles.itemCtaText}>Voir</ThemedText>
                                                </Pressable>
                                            </View>
                                        )}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Modal de message */}
            <Modal
                visible={showMessageModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowMessageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Envoyer un message</ThemedText>
                            <Pressable onPress={() => setShowMessageModal(false)}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </Pressable>
                        </View>
                        <TextInput
                            style={styles.messageInput}
                            placeholder="Écrivez votre message..."
                            multiline
                            value={messageText}
                            onChangeText={setMessageText}
                            maxLength={500}
                        />
                        <Pressable 
                            style={styles.sendButton}
                            onPress={handleSendMessage}
                        >
                            <ThemedText style={styles.sendButtonText}>Envoyer</ThemedText>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Modal des diplômes */}
            <Modal
                visible={showDiplomaModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDiplomaModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Mes diplômes et certifications</ThemedText>
                            <Pressable onPress={() => setShowDiplomaModal(false)}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </Pressable>
                        </View>
                        <ScrollView style={styles.diplomaList}>
                            {diplomas.map((diploma) => (
                                <View key={diploma.id} style={styles.diplomaItem}>
                                    <View style={styles.diplomaIcon}>
                                        <Ionicons name="school" size={24} color="#6B46FF" />
                                    </View>
                                    <View style={styles.diplomaInfo}>
                                        <ThemedText style={styles.diplomaTitle}>{diploma.title}</ThemedText>
                                        <ThemedText style={styles.diplomaDetails}>
                                            {diploma.institution} • {diploma.year}
                                        </ThemedText>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <Pressable style={styles.navItem}>
                    <Ionicons name="home-outline" size={26} color="#B0B0B0" />
                    <ThemedText style={styles.navText}>Accueil</ThemedText>
                </Pressable>
                
                <Pressable style={styles.navItem}>
                    <Ionicons name="search-outline" size={26} color="#B0B0B0" />
                    <ThemedText style={styles.navText}>Explorer</ThemedText>
                </Pressable>
                
                <Pressable style={styles.navItemCenter}>
                    <View style={styles.plusButton}>
                        <Ionicons name="add" size={32} color="#FD9A34" />
                    </View>
                </Pressable>
                
                <Pressable style={styles.navItem}>
                    <Ionicons name="notifications-outline" size={26} color="#B0B0B0" />
                    <ThemedText style={styles.navText}>Notifications</ThemedText>
                </Pressable>
                
                <Pressable style={styles.navItem}>
                    <Ionicons name="person" size={26} color="#6B46FF" />
                    <ThemedText style={[styles.navText, styles.navTextActive]}>Profil</ThemedText>
                </Pressable>
            </View>
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
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: Platform.OS === 'ios' ? 100 : 90,
        backgroundColor: '#FFFFFF'
    },

    // Header
    headerRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 16
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {
        flex: 1,
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
    avatarWrapper: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        alignItems: 'center', 
        justifyContent: 'center',
    },
    avatarEmoji: { fontSize: 50 },
    premiumBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#1A1A1A',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    verificationBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E8E8E8',
    },

    // User Info
    handle: { 
        marginBottom: 8,
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: '600'
    },
    bioContainer: {
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 20,
    },
    bio: {
        fontSize: 14,
        color: '#6b6b6b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 6,
    },
    verificationLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F8F6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verificationText: {
        fontSize: 11,
        fontWeight: '600',
    },
    roleBadge: { 
        marginBottom: 12,
        backgroundColor: '#FF9A2A', 
        paddingHorizontal: 16, 
        paddingVertical: 6, 
        borderRadius: 20 
    },
    roleText: { 
        color: '#FFFFFF', 
        fontWeight: '600',
        fontSize: 14
    },

    // Action Buttons
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    editButton: { 
        backgroundColor: '#6B46FF', 
        paddingHorizontal: 24, 
        paddingVertical: 12, 
        borderRadius: 25 
    },
    editButtonText: { 
        color: '#FFFFFF', 
        fontWeight: '600',
        fontSize: 14
    },
    messageButton: {
        backgroundColor: '#FF9A2A',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Stats
    statsRow: { 
        flexDirection: 'row', 
        marginBottom: 20,
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
    statNumber: { 
        color: '#FFFFFF', 
        fontSize: 18, 
        fontWeight: '700' 
    },
    statLabel: { 
        color: '#FFFFFF', 
        fontSize: 11, 
        marginTop: 2 
    },

    // Creator Stats Card
    creatorStatsCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    creatorStatsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    creatorStatsTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    growthBadge: {
        backgroundColor: '#E8FFE8',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    growthText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4CAF50',
    },
    creatorStatsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    creatorStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    creatorStatValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6B46FF',
        marginBottom: 4,
    },
    creatorStatLabel: {
        fontSize: 11,
        color: '#6b6b6b',
        textAlign: 'center',
    },
    viewAnalyticsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F6FF',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    viewAnalyticsText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B46FF',
    },

    // Cards
    card: { 
        width: '100%', 
        marginBottom: 16,
        padding: 16, 
        borderRadius: 16, 
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8E8E8'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitleText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A'
    },
    levelBadgeContainer: {
        backgroundColor: '#F8F6FF',
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
        backgroundColor: '#F8F6FF',
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
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8'
    },
    progressTitleRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    titleLeft: { flexDirection: 'row', alignItems: 'center' },
    progressTitle: { 
        marginLeft: 8, 
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A'
    },
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
    progressSub: { 
        color: '#6b6b6b', 
        fontSize: 12,
        textAlign: 'left'
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

    // CTA Button
    ctaButton: { 
        marginTop: 16, 
        backgroundColor: '#FF9A2A', 
        paddingVertical: 12, 
        borderRadius: 25, 
        alignItems: 'center' 
    },
    ctaText: { 
        color: '#FFFFFF', 
        fontWeight: '600',
        fontSize: 14
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
        marginTop: 0,
        backgroundColor: '#FFFFFF',
        paddingVertical: 12, 
        paddingHorizontal: 12, 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8'
    },
    tabRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        marginBottom: 8,
        flexWrap: 'wrap',
        gap: 8,
    },
    tabButton: { 
        paddingVertical: 8, 
        paddingHorizontal: 12, 
        borderRadius: 20, 
        backgroundColor: 'transparent',
        minWidth: 70,
    },
    tabButtonActive: { backgroundColor: '#6B46FF' },
    tabLabel: { fontSize: 12, color: '#6b6b6b', textAlign: 'center' },
    tabLabelActive: { color: '#fff' },
    tabContentContainer: {
        width: '100%',
    },
    contentList: { 
        width: '100%', 
        marginTop: 8, 
        maxHeight: 400,
    },
    itemCardRow: { 
        width: '100%', 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: 14, 
        backgroundColor: '#F8F6FF', 
        borderRadius: 12, 
        marginBottom: 8 
    },
    itemCardContent: { flex: 1, paddingRight: 8 },
    itemCta: { 
        backgroundColor: '#FD9A34', 
        paddingVertical: 8, 
        paddingHorizontal: 16, 
        borderRadius: 20, 
        alignSelf: 'center' 
    },
    itemCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    itemSub: { marginTop: 4, color: '#6b6b6b', fontSize: 12 },

    // My Videos
    myVideoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        marginBottom: 8,
        position: 'relative',
    },
    validationIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    validationGreen: {
        backgroundColor: '#4CAF50',
    },
    validationRed: {
        backgroundColor: '#FF6B6B',
    },
    validationYellow: {
        backgroundColor: '#FFC107',
    },
    myVideoThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        marginRight: 12,
        position: 'relative',
    },
    thumbnailEmoji: {
        fontSize: 32,
    },
    videoDuration: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    durationText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    myVideoInfo: {
        flex: 1,
    },
    myVideoTitle: {
        fontSize: 14,
        color: '#1A1A1A',
        marginBottom: 6,
    },
    myVideoStats: {
        flexDirection: 'row',
        gap: 12,
    },
    videoStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    videoStatText: {
        fontSize: 12,
        color: '#6b6b6b',
        fontWeight: '500',
    },
    videoMenuButton: {
        padding: 8,
    },
    videoMenu: {
        position: 'absolute',
        right: 12,
        top: 50,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        gap: 10,
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1A1A',
    },

    // Modals
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
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    messageInput: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        fontSize: 14,
        marginBottom: 16,
    },
    sendButton: {
        backgroundColor: '#6B46FF',
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    diplomaList: {
        maxHeight: 400,
    },
    diplomaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        marginBottom: 12,
    },
    diplomaIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    diplomaInfo: {
        flex: 1,
    },
    diplomaTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    diplomaDetails: {
        fontSize: 13,
        color: '#6b6b6b',
    },
});