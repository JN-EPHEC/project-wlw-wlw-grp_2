import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Composant Avatar pour l'utilisateur apprenant
function Avatar() {
    return (
        <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>👩‍🎓</Text>
        </View>
    );
}

// Composant Badge pour afficher un badge individuel
interface BadgeProps {
    title: string;
    emoji: string;
}

function Badge({ title, emoji }: BadgeProps) {
    return (
        <View style={styles.badgeItem}>
            <View style={styles.badgeIcon}>
                <Text style={styles.badgeEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.badgeLabel}>{title}</Text>
        </View>
    );
}

// Composant Statistique
interface StatBoxProps {
    value: string;
    label: string;
    variant: 'orange' | 'purple';
}

function StatBox({ value, label, variant }: StatBoxProps) {
    return (
        <View style={[styles.statBox, variant === 'orange' ? styles.statOrange : styles.statPurple]}>
            <Text style={styles.statNumber}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// Page principale du profil utilisateur (apprenant)
export default function UserProfileLearner() {
    // Données des badges de l'utilisateur
    const badges = [
        { title: 'Expert\nMarketing', emoji: '🏅' },
        { title: 'Développeur\nPython', emoji: '🐍' },
        { title: 'Expert\nData', emoji: '📊' },
        { title: 'Designer\nUI/UX', emoji: '🎨' },
    ];

    // Calcul de la progression (exemple: 200/3000 XP = ~6.67%)
    const currentXP = 200;
    const targetXP = 3000;
    const progressPercentage = (currentXP / targetXP) * 100;

    return (
        <View style={styles.screen}>
            <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* En-tête avec navigation */}
                <View style={styles.headerRow}>
                    <Link href="/" asChild>
                        <Pressable style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#6b6b6b" />
                        </Pressable>
                    </Link>
                    <View style={styles.headerSpacer} />
                    <Pressable style={styles.settingsButton}>
                        <Ionicons name="settings-outline" size={24} color="#6B46FF" />
                    </Pressable>
                </View>

                {/* Section centrale du profil */}
                <View style={styles.centerColumn}>
                    {/* Avatar utilisateur */}
                    <Avatar />

                    {/* Nom d'utilisateur */}
                    <Text style={styles.handle}>@sophiedubois</Text>

                    {/* Badge de rôle - Apprenant */}
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>Apprenant</Text>
                    </View>

                    {/* Bouton Modifier le profil */}
                    <Pressable style={styles.editButton}>
                        <Text style={styles.editButtonText}>Modifier le profil</Text>
                    </Pressable>

                    {/* Statistiques */}
                    <View style={styles.statsRow}>
                        <StatBox value="1.2K" label="Aimées" variant="orange" />
                        <StatBox value="1.2K" label="Abonnées" variant="purple" />
                        <StatBox value="124" label="Sauvegardes" variant="orange" />
                    </View>

                    {/* Carte de progression globale */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressTitleRow}>
                            <View style={styles.titleLeft}>
                                <Ionicons name="trending-up" size={20} color="#FF9A2A" />
                                <Text style={styles.progressTitle}>Progression globale</Text>
                            </View>
                            <View style={styles.levelBadgeContainer}>
                                <Text style={styles.levelBadgeText}>Niveau 2</Text>
                            </View>
                        </View>

                        {/* Barre de progression */}
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressTrack}>
                                <View 
                                    style={[
                                        styles.progressFill, 
                                        { width: `${progressPercentage}%` }
                                    ]} 
                                />
                            </View>
                        </View>

                        <Text style={styles.progressSub}>
                            {currentXP}/ {targetXP.toLocaleString()} XP pour niveau 8
                        </Text>
                    </View>

                    {/* Carte Badges & Réalisations */}
                    <View style={styles.badgesCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleRow}>
                                <Ionicons name="ribbon" size={20} color="#FF9A2A" />
                                <Text style={styles.cardTitle}>Badges & Réalisation</Text>
                            </View>
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>4/8</Text>
                            </View>
                        </View>

                        {/* Liste horizontale des badges */}
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.badgesScrollContent}
                        >
                            {badges.map((badge, index) => (
                                <Badge 
                                    key={index} 
                                    title={badge.title} 
                                    emoji={badge.emoji} 
                                />
                            ))}
                        </ScrollView>

                        {/* Bouton voir certificats */}
                        <Pressable style={styles.ctaButton}>
                            <Text style={styles.ctaText}>Voir mes certificats</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            {/* Navigation en bas de page */}
            <View style={styles.bottomNav}>
                <Pressable style={styles.navItem}>
                    <Ionicons name="home-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Accueil</Text>
                </Pressable>

                <Pressable style={styles.navItem}>
                    <Ionicons name="search-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Explorer</Text>
                </Pressable>

                <View style={styles.navItemCenter}>
                    <View style={styles.addButton}>
                        <Ionicons name="add" size={32} color="#FD9A34" />
                    </View>
                </View>

                <Pressable style={styles.navItem}>
                    <Ionicons name="notifications-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Notifications</Text>
                </Pressable>

                <Pressable style={styles.navItem}>
                    <Ionicons name="person" size={26} color="#6B46FF" />
                    <Text style={[styles.navText, styles.navTextActive]}>Profil</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: Platform.OS === 'ios' ? 100 : 90,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
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
    settingsButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerColumn: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0E6FF',
        overflow: 'hidden',
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEmoji: {
        fontSize: 50,
    },
    handle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    roleBadge: {
        backgroundColor: '#6B46FF',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
    },
    roleText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    editButton: {
        backgroundColor: '#6B46FF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        marginBottom: 20,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    statBox: {
        flex: 1,
        height: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
    },
    statOrange: {
        backgroundColor: '#FF9A2A',
    },
    statPurple: {
        backgroundColor: '#6B46FF',
    },
    statNumber: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        color: '#FFFFFF',
        fontSize: 11,
        marginTop: 2,
    },
    progressCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    progressTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    titleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginLeft: 8,
    },
    levelBadgeContainer: {
        backgroundColor: '#F8F6FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    levelBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B46FF',
    },
    progressBarContainer: {
        marginBottom: 8,
    },
    progressTrack: {
        height: 8,
        backgroundColor: '#E0D6FF',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FF9A2A',
        borderRadius: 4,
    },
    progressSub: {
        fontSize: 12,
        color: '#6b6b6b',
        textAlign: 'left',
    },
    badgesCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginLeft: 8,
    },
    countBadge: {
        backgroundColor: '#F8F6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF9A2A',
    },
    badgesScrollContent: {
        paddingRight: 16,
    },
    badgeItem: {
        width: 70,
        alignItems: 'center',
        marginRight: 12,
    },
    badgeIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    badgeEmoji: {
        fontSize: 24,
    },
    badgeLabel: {
        fontSize: 10,
        color: '#6B46FF',
        textAlign: 'center',
        lineHeight: 13,
    },
    ctaButton: {
        backgroundColor: '#FF9A2A',
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 16,
    },
    ctaText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 75,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
        paddingBottom: Platform.OS === 'ios' ? 20 : 5,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    navItemCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginTop: -10,
    },
    addButton: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FD9A34',
        shadowColor: '#FD9A34',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    navText: {
        fontSize: 10,
        color: '#B0B0B0',
        marginTop: 4,
        fontWeight: '500',
    },
    navTextActive: {
        color: '#6B46FF',
    },
});