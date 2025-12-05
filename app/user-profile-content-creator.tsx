import React, { useState } from 'react';
import { Dimensions, FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
// Removed react-native-svg usage because the dependency/types were causing a build error.

function Avatar() {
    const bg = useThemeColor({ light: '#EEE5FF', dark: '#2A2540' }, 'background');
    return (
        <View style={[styles.avatar, { backgroundColor: bg }]}> 
            <ThemedText style={styles.avatarEmoji}>👩‍💼</ThemedText>
        </View>
    );
}

export default function UserProfileContentCreator() {
    const [tab, setTab] = useState<'videos' | 'history' | 'saved'>('videos');
    // `openedTab` is the category currently expanded (shows its contents). Null = none expanded.
    const [openedTab, setOpenedTab] = useState<'videos' | 'history' | 'saved' | null>(null);

    function handleTabPress(newTab: 'videos' | 'history' | 'saved') {
        // If user clicks the same tab again -> collapse it. Otherwise open the clicked tab.
        setTab(newTab);
        setOpenedTab(prev => (prev === newTab ? null : newTab));
    }

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
        { title: 'Expert\nMarketing' },
        { title: 'Développeur\nPython' },
        { title: 'Expert\nData' },
        { title: 'Designer\nUI/UX' }
    ];

    return (
        <ThemedView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <Link href="/">
                        <Link.Trigger>
                            <IconSymbol name="chevron.left" size={28} color="#6b6b6b" />
                        </Link.Trigger>
                    </Link>
                    <ThemedText type="title">Profile - créateur</ThemedText>
                    <Pressable style={styles.infoButton}>
                        <MaterialIcons name="settings" size={20} color="#6B46FF" />
                    </Pressable>
                </View>

                {/* Center Content */}
                <View style={styles.centerColumn}>
                    <Avatar />
                    <ThemedText type="defaultSemiBold" style={styles.handle}>@clairedubois</ThemedText>
                    <View style={styles.roleBadge}>
                        <ThemedText style={styles.roleText}>Professionnelle</ThemedText>
                    </View>

                    <Pressable style={styles.editButton}>
                        <ThemedText style={styles.editButtonText}>Modifier le profil</ThemedText>
                    </Pressable>

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

                    {/* Progress Card (styled like mock) */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressTitleRow}>
                            <View style={styles.titleLeft}>
                                <MaterialIcons name="trending-up" size={18} color="#FF9A2A" />
                                <ThemedText type="subtitle" style={styles.progressTitle}>Progression globale</ThemedText>
                            </View>
                            <ThemedText style={styles.levelBadge}>Niveau 2</ThemedText>
                        </View>

                        {/* Simple progress track (no external svg dependency) */}
                        {(() => {
                            const barWidth = Math.min(SCREEN_WIDTH - 48, 360);
                            return (
                                <View style={{ width: barWidth, height: 36, marginTop: 6, justifyContent: 'center' }}>
                                    <View style={[styles.progressTrack, { width: barWidth }]} />
                                    {/* orange fill (current progress) */}
                                    <View style={{ position: 'absolute', left: 0, top: 16, width: barWidth * 0.2, height: 6, borderRadius: 8, backgroundColor: '#FF9A2A' }} />
                                </View>
                            );
                        })()}

                        <ThemedText style={styles.progressSub}>200 / 3,000 XP pour niveau 8</ThemedText>
                    </View>

                    {/* Badges Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <ThemedText type="subtitle">🏅 Badges & Réalisation</ThemedText>
                            <ThemedText style={styles.countBadge}>4/8</ThemedText>
                        </View>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            style={styles.badgesRow}
                        >
                            {badges.map((badge, index) => (
                                    <View key={index} style={styles.badgeItem}>
                                            <View style={styles.badgeIcon}>
                                                <ThemedText style={styles.badgeEmoji}>🏅</ThemedText>
                                            </View>
                                        <ThemedText style={[styles.badgeLabel, { color: '#6B46FF' }]}>{badge.title}</ThemedText>
                                    </View>
                                ))}
                        </ScrollView>
                        <Pressable style={styles.ctaButton}>
                            <ThemedText style={styles.ctaText}>Voir mes certificats</ThemedText>
                        </Pressable>
                    </View>

                    {/* Profile tabs: Vidéos / Historique / Sauvegardés */}
                    <View style={styles.tabsContainer}>
                        <View style={styles.tabRow}>
                            <Pressable onPress={() => handleTabPress('videos')} style={[styles.tabButton, tab === 'videos' && styles.tabButtonActive]}>
                                <ThemedText style={[styles.tabLabel, tab === 'videos' && styles.tabLabelActive]}>Vidéos</ThemedText>
                            </Pressable>
                            <Pressable onPress={() => handleTabPress('history')} style={[styles.tabButton, tab === 'history' && styles.tabButtonActive]}>
                                <ThemedText style={[styles.tabLabel, tab === 'history' && styles.tabLabelActive]}>Historique</ThemedText>
                            </Pressable>
                            <Pressable onPress={() => handleTabPress('saved')} style={[styles.tabButton, tab === 'saved' && styles.tabButtonActive]}>
                                <ThemedText style={[styles.tabLabel, tab === 'saved' && styles.tabLabelActive]}>Sauvegardés</ThemedText>
                            </Pressable>
                        </View>

                        {/* (Removed subcategory row — actions are shown per-item on the right) */}

                        {openedTab === tab && (
                            <FlatList
                                data={tab === 'videos' ? videos : tab === 'history' ? history : saved}
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
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <a href ="home">
                <Pressable style={styles.navItem}>
                    <IconSymbol name="house" size={24} color="#999" />
                    <ThemedText style={styles.navText}>Accueil</ThemedText>
                </Pressable>
                </a>

                <a href = "search">
                <Pressable style={styles.navItem}>
                    <IconSymbol name="magnifyingglass" size={24} color="#999" />
                    <ThemedText style={styles.navText}>Explorer</ThemedText>
                </Pressable>
                </a>
                
                <Pressable style={styles.navItemActive}>
                    <View style={styles.plusButton}>
                        <ThemedText style={styles.plusText}>+</ThemedText>
                    </View>
                </Pressable>
                
                <a href = "notifications">
                <Pressable style={styles.navItem}>
                    <IconSymbol name="bell" size={24} color="#999" />
                    <ThemedText style={styles.navText}>Notifications</ThemedText>
                </Pressable>
                </a>

                <a href = "profil-content-creator">
                <Pressable style={styles.navItem}>
                    <IconSymbol name="person" size={24} color="#6B46FF" />
                    <ThemedText style={[styles.navText, { color: '#6B46FF' }]}>Profil</ThemedText>
                </Pressable>
                </a>
            </View>
        </ThemedView>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 100 : 90 },

    // Header
    headerRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 8 
    },
    infoButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center'
    },
    infoText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // Center Content
    centerColumn: { alignItems: 'center' },

    // Avatar
    avatar: { 
        width: SCREEN_WIDTH > 420 ? 120 : 96, 
        height: SCREEN_WIDTH > 420 ? 120 : 96, 
        borderRadius: 120, 
        alignItems: 'center', 
        justifyContent: 'center',
        marginTop: 8
    },
    avatarEmoji: { fontSize: SCREEN_WIDTH > 420 ? 60 : 48 },

    // User Info
    handle: { marginTop: 8, color: '#2b2b2b' },
    roleBadge: { 
        marginTop: 6, 
        backgroundColor: '#FF9A2A', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 16 
    },
    roleText: { color: '#fff', fontWeight: '600' },

    // Edit Button
    editButton: { 
        marginTop: 12, 
        backgroundColor: '#6B46FF', 
        paddingHorizontal: 20, 
        paddingVertical: 10, 
        borderRadius: 8 
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
        height: 52, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center',
        marginHorizontal: 2
    },
    statOrange: { backgroundColor: '#FF9A2A' },
    statPurple: { backgroundColor: '#6B46FF' },
    statNumber: { color: '#fff', fontSize: 14 },
    statLabel: { color: '#fff', fontSize: 10 },

    // Cards
    card: { 
        width: '100%', 
        marginTop: 16, 
        padding: 14, 
        borderRadius: 12, 
        backgroundColor: 'rgba(0,0,0,0.03)' 
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    levelBadge: {
        fontSize: 12,
        color: '#6B46FF',
        fontWeight: 'bold'
    },
    countBadge: {
        fontSize: 12,
        color: '#FF9A2A',
        fontWeight: 'bold'
    },

    // Progress Bar
    progressBarBackground: { 
        height: 8, 
        backgroundColor: 'rgba(0,0,0,0.06)', 
        borderRadius: 8, 
        marginTop: 8, 
        overflow: 'hidden' 
    },
    progressBar: { height: '100%', backgroundColor: '#FF9A2A' },
    progressSub: { marginTop: 8, color: '#6b6b6b', fontSize: 12 },

    /* New styles for progress card that matches the mock */
    progressCard: {
        backgroundColor: 'rgba(106,78,251,0.06)',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    progressTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    titleLeft: { flexDirection: 'row', alignItems: 'center' },
    progressTitle: { marginLeft: 8, fontSize: 22, lineHeight: 26 },
    waveRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
    waveDot: { width: 18, height: 6, borderRadius: 6, backgroundColor: '#6B46FF', marginHorizontal: -3, opacity: 1, shadowColor: '#6B46FF', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 1 },
    progressTrack: { height: 4, backgroundColor: '#FFD6B8', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#FF9A2A', borderRadius: 8, shadowColor: '#FF9A2A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },

    // Badges
    badgesRow: { marginTop: 12 },
    badgeItem: { width: SCREEN_WIDTH > 420 ? 84 : 72, alignItems: 'center', marginRight: 12 },
    badgeIcon: { 
        width: SCREEN_WIDTH > 420 ? 48 : 40, 
        height: SCREEN_WIDTH > 420 ? 48 : 40, 
        borderRadius: SCREEN_WIDTH > 420 ? 24 : 20, 
        backgroundColor: '#6B46FF', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 8 
    },
    badgeEmoji: { fontSize: SCREEN_WIDTH > 420 ? 22 : 18 },
    badgeLabel: { fontSize: 11, textAlign: 'center', lineHeight: 14 },

    // CTA Button
    ctaButton: { 
        marginTop: 12, 
        backgroundColor: '#FD9A34', 
        paddingVertical: 10, 
        borderRadius: 8, 
        alignItems: 'center' 
    },
    ctaText: { color: '#fff', fontWeight: '600' },

    // Bottom Navigation
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0
    },
    navItem: { alignItems: 'center', marginTop: 4, flex: 1 },
    navItemActive: { alignItems: 'center', flex: 1 },
    plusButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FF9A2A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff'
    },
    plusText: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginTop: -2 },
    navText: { fontSize: 10, color: '#999' }
    ,
    tabsContainer: { width: '100%', marginTop: 16, backgroundColor: 'rgba(106,78,251,0.06)', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    tabButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'transparent' },
    tabButtonActive: { backgroundColor: '#6B46FF' },
    tabLabel: { fontSize: 14, color: '#6b6b6b' },
    tabLabelActive: { color: '#fff' },
    contentList: { width: '100%', marginTop: 6, maxHeight: 260 },
    subTabRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 8, paddingHorizontal: 6 },
    subTabButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'transparent', marginRight: 8 },
    subTabButtonActive: { backgroundColor: '#6A4EFB' },
    subTabLabel: { fontSize: 13, color: '#6b6b6b' },
    subTabLabelActive: { color: '#fff' },
    itemCard: { width: '100%', padding: 12, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 10, marginBottom: 8 },
    itemCardRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 10, marginBottom: 8 },
    itemCardContent: { flex: 1, paddingRight: 8 },
    itemCta: { backgroundColor: '#FD9A34', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'center' },
    itemCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    actionStack: { marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
    actionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    actionButtonGradient: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
    actionGradientInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6A4EFB' },
    itemSub: { marginTop: 4, color: '#6b6b6b', fontSize: 12 }
});
