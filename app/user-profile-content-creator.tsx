import React, { useState } from 'react';
import { Dimensions, FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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

export default function UserProfileContentCreator() {
    const [tab, setTab] = useState<'videos' | 'history' | 'saved'>('videos');
    const [openedTab, setOpenedTab] = useState<'videos' | 'history' | 'saved' | null>(null);

    function handleTabPress(newTab: 'videos' | 'history' | 'saved') {
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
        { title: 'Expert\nMarketing', emoji: '🏅' },
        { title: 'Développeur\nPython', emoji: '🐍' },
        { title: 'Expert\nData', emoji: '📊' },
        { title: 'Designer\nUI/UX', emoji: '🎨' }
    ];

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
                    <ThemedText type="title">Profile - créateur</ThemedText>
                    <Pressable style={styles.infoButton}>
                        <Ionicons name="settings-outline" size={24} color="#6B46FF" />
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
                        <Pressable style={styles.ctaButton}>
                            <ThemedText style={styles.ctaText}>Voir mes certificats</ThemedText>
                        </Pressable>
                    </View>

                    {/* Profile tabs */}
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
        alignItems: 'center', 
        justifyContent: 'center',
        marginTop: 8
    },
    avatarEmoji: { fontSize: 48 },

    // User Info
    handle: { marginTop: 8, color: '#2b2b2b' },
    roleBadge: { 
        marginTop: 6, 
        backgroundColor: '#FF9A2A', 
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
    progressTitle: { marginLeft: 8, fontSize: 16 },
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
        backgroundColor: '#FD9A34', 
        paddingVertical: 12, 
        borderRadius: 25, 
        alignItems: 'center' 
    },
    ctaText: { color: '#fff', fontWeight: '600' },

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
    itemCta: { backgroundColor: '#FD9A34', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: 'center' },
    itemCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    itemSub: { marginTop: 4, color: '#6b6b6b', fontSize: 12 }
});