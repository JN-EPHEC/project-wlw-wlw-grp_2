import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface Goal {
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    emoji: string;
    color: string;
}

export default function ProgressionPage() {
    const [activeTab, setActiveTab] = useState<'progression' | 'objectifs'>('progression');
    
    // Modal pour ajouter/éditer un objectif
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [tempTitle, setTempTitle] = useState('');
    const [tempTarget, setTempTarget] = useState('');
    const [tempEmoji, setTempEmoji] = useState('🎯');
    const [tempColor, setTempColor] = useState('#6B46FF');

    // États pour les objectifs
    const [goals, setGoals] = useState<Goal[]>([
        {
            id: 'g1',
            title: 'Vidéos regardées',
            target: 10,
            current: 6,
            unit: 'vidéos',
            emoji: '📺',
            color: '#6B46FF'
        },
        {
            id: 'g2',
            title: 'Heures d\'étude',
            target: 15,
            current: 8,
            unit: 'heures',
            emoji: '⏱️',
            color: '#FF9A2A'
        },
        {
            id: 'g3',
            title: 'Quiz complétés',
            target: 5,
            current: 5,
            unit: 'quiz',
            emoji: '✅',
            color: '#4CAF50'
        },
    ]);

    // Données de progression générale
    const overallStats = {
        level: 8,
        currentXP: 2450,
        nextLevelXP: 3000,
        totalVideos: 45,
        totalHours: 32,
        streak: 7,
    };

    const emojis = ['🎯', '📺', '📚', '⏱️', '✅', '🎓', '💪', '🔥', '⭐', '🏆'];
    const colors = [
        { name: 'Violet', value: '#6B46FF' },
        { name: 'Orange', value: '#FF9A2A' },
        { name: 'Vert', value: '#4CAF50' },
        { name: 'Rouge', value: '#FF3B30' },
        { name: 'Bleu', value: '#007AFF' },
        { name: 'Rose', value: '#FF2D55' },
    ];

    // Ouvrir le modal pour créer un objectif
    const openAddGoalModal = () => {
        setEditingGoal(null);
        setTempTitle('');
        setTempTarget('');
        setTempEmoji('🎯');
        setTempColor('#6B46FF');
        setIsModalVisible(true);
    };

    // Ouvrir le modal pour éditer un objectif
    const openEditGoalModal = (goal: Goal) => {
        setEditingGoal(goal);
        setTempTitle(goal.title);
        setTempTarget(goal.target.toString());
        setTempEmoji(goal.emoji);
        setTempColor(goal.color);
        setIsModalVisible(true);
    };

    // Sauvegarder l'objectif
    const saveGoal = () => {
        if (!tempTitle.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un titre pour l\'objectif');
            return;
        }
        if (!tempTarget.trim() || isNaN(Number(tempTarget)) || Number(tempTarget) <= 0) {
            Alert.alert('Erreur', 'Veuillez entrer un objectif valide (nombre supérieur à 0)');
            return;
        }

        if (editingGoal) {
            // Modifier l'objectif existant
            setGoals(prevGoals =>
                prevGoals.map(g =>
                    g.id === editingGoal.id
                        ? {
                              ...g,
                              title: tempTitle,
                              target: Number(tempTarget),
                              emoji: tempEmoji,
                              color: tempColor,
                          }
                        : g
                )
            );
        } else {
            // Créer un nouveau objectif
            const newGoal: Goal = {
                id: `g${Date.now()}`,
                title: tempTitle,
                target: Number(tempTarget),
                current: 0,
                unit: 'unités',
                emoji: tempEmoji,
                color: tempColor,
            };
            setGoals(prevGoals => [...prevGoals, newGoal]);
        }

        setIsModalVisible(false);
    };

    // Supprimer un objectif
    const deleteGoal = (id: string) => {
        Alert.alert(
            'Supprimer l\'objectif',
            'Êtes-vous sûr de vouloir supprimer cet objectif ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => {
                        setGoals(prevGoals => prevGoals.filter(g => g.id !== id));
                    },
                },
            ]
        );
    };

    // Incrémenter la progression d'un objectif
    const incrementGoal = (id: string) => {
        setGoals(prevGoals =>
            prevGoals.map(g =>
                g.id === id && g.current < g.target
                    ? { ...g, current: g.current + 1 }
                    : g
            )
        );
    };

    // Décrémenter la progression d'un objectif
    const decrementGoal = (id: string) => {
        setGoals(prevGoals =>
            prevGoals.map(g =>
                g.id === id && g.current > 0
                    ? { ...g, current: g.current - 1 }
                    : g
            )
        );
    };

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Link href="/" asChild>
                    <Pressable style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#6b6b6b" />
                    </Pressable>
                </Link>
                <Text style={styles.headerTitle}>Progression</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsRow}>
                <Pressable
                    onPress={() => setActiveTab('progression')}
                    style={[
                        styles.tab,
                        activeTab === 'progression' && styles.tabActive,
                    ]}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'progression' && styles.tabTextActive,
                        ]}
                    >
                        Vue d'ensemble
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setActiveTab('objectifs')}
                    style={[
                        styles.tab,
                        activeTab === 'objectifs' && styles.tabActive,
                    ]}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'objectifs' && styles.tabTextActive,
                        ]}
                    >
                        Objectifs
                    </Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {activeTab === 'progression' ? (
                    // Vue d'ensemble
                    <>
                        {/* Carte Niveau */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <Ionicons name="trophy" size={24} color="#FF9A2A" />
                                    <Text style={styles.cardTitle}>Niveau actuel</Text>
                                </View>
                                <View style={styles.levelBadge}>
                                    <Text style={styles.levelBadgeText}>
                                        Niveau {overallStats.level}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={styles.progressTrack}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${
                                                    (overallStats.currentXP /
                                                        overallStats.nextLevelXP) *
                                                    100
                                                }%`,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                            <Text style={styles.progressText}>
                                {overallStats.currentXP} / {overallStats.nextLevelXP} XP
                            </Text>
                        </View>

                        {/* Statistiques */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, { backgroundColor: '#6B46FF' }]}>
                                <Text style={styles.statEmoji}>📺</Text>
                                <Text style={styles.statNumber}>
                                    {overallStats.totalVideos}
                                </Text>
                                <Text style={styles.statLabel}>Vidéos vues</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#FF9A2A' }]}>
                                <Text style={styles.statEmoji}>⏱️</Text>
                                <Text style={styles.statNumber}>
                                    {overallStats.totalHours}h
                                </Text>
                                <Text style={styles.statLabel}>D'étude</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
                                <Text style={styles.statEmoji}>🔥</Text>
                                <Text style={styles.statNumber}>
                                    {overallStats.streak}
                                </Text>
                                <Text style={styles.statLabel}>Jours de suite</Text>
                            </View>
                        </View>

                        {/* Objectifs de la semaine */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Objectifs de la semaine</Text>
                                <Pressable onPress={() => setActiveTab('objectifs')}>
                                    <Text style={styles.seeAllText}>Voir tout</Text>
                                </Pressable>
                            </View>
                            {goals.slice(0, 3).map(goal => (
                                <View key={goal.id} style={styles.goalPreview}>
                                    <View style={styles.goalPreviewLeft}>
                                        <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                                        <View>
                                            <Text style={styles.goalTitle}>{goal.title}</Text>
                                            <Text style={styles.goalProgress}>
                                                {goal.current} / {goal.target} {goal.unit}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.goalProgressCircle}>
                                        <Text
                                            style={[
                                                styles.goalProgressPercent,
                                                { color: goal.color },
                                            ]}
                                        >
                                            {Math.round((goal.current / goal.target) * 100)}%
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                ) : (
                    // Onglet Objectifs
                    <>
                        <Text style={styles.sectionTitle}>Objectifs hebdomadaires</Text>
                        <Text style={styles.sectionSubtitle}>
                            Définissez vos objectifs pour cette semaine et suivez votre
                            progression
                        </Text>

                        <FlatList
                            data={goals}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                            renderItem={({ item }) => (
                                <View style={styles.goalCard}>
                                    <View style={styles.goalCardHeader}>
                                        <View style={styles.goalCardLeft}>
                                            <View
                                                style={[
                                                    styles.goalEmojiContainer,
                                                    { backgroundColor: item.color + '20' },
                                                ]}
                                            >
                                                <Text style={styles.goalEmojiLarge}>
                                                    {item.emoji}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={styles.goalCardTitle}>
                                                    {item.title}
                                                </Text>
                                                <Text style={styles.goalCardProgress}>
                                                    {item.current} / {item.target} {item.unit}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.goalActions}>
                                            <Pressable
                                                onPress={() => openEditGoalModal(item)}
                                                style={styles.goalActionButton}
                                            >
                                                <Ionicons
                                                    name="create-outline"
                                                    size={20}
                                                    color="#6B46FF"
                                                />
                                            </Pressable>
                                            <Pressable
                                                onPress={() => deleteGoal(item.id)}
                                                style={styles.goalActionButton}
                                            >
                                                <Ionicons
                                                    name="trash-outline"
                                                    size={20}
                                                    color="#FF3B30"
                                                />
                                            </Pressable>
                                        </View>
                                    </View>

                                    {/* Barre de progression */}
                                    <View style={styles.progressBarContainer}>
                                        <View style={styles.progressTrack}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        backgroundColor: item.color,
                                                        width: `${
                                                            (item.current / item.target) * 100
                                                        }%`,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>

                                    {/* Boutons de contrôle */}
                                    <View style={styles.controlButtons}>
                                        <Pressable
                                            onPress={() => decrementGoal(item.id)}
                                            style={[
                                                styles.controlButton,
                                                item.current === 0 && styles.controlButtonDisabled,
                                            ]}
                                            disabled={item.current === 0}
                                        >
                                            <Ionicons
                                                name="remove"
                                                size={20}
                                                color={
                                                    item.current === 0 ? '#B0B0B0' : item.color
                                                }
                                            />
                                        </Pressable>
                                        <Text style={styles.controlText}>
                                            {Math.round((item.current / item.target) * 100)}%
                                            complété
                                        </Text>
                                        <Pressable
                                            onPress={() => incrementGoal(item.id)}
                                            style={[
                                                styles.controlButton,
                                                item.current >= item.target &&
                                                    styles.controlButtonDisabled,
                                            ]}
                                            disabled={item.current >= item.target}
                                        >
                                            <Ionicons
                                                name="add"
                                                size={20}
                                                color={
                                                    item.current >= item.target
                                                        ? '#B0B0B0'
                                                        : item.color
                                                }
                                            />
                                        </Pressable>
                                    </View>

                                    {/* Badge de completion */}
                                    {item.current >= item.target && (
                                        <View style={styles.completedBadge}>
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={16}
                                                color="#4CAF50"
                                            />
                                            <Text style={styles.completedText}>
                                                Objectif atteint ! 🎉
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                            ListFooterComponent={
                                <Pressable
                                    style={styles.addButton}
                                    onPress={openAddGoalModal}
                                >
                                    <Ionicons name="add-circle" size={24} color="#6B46FF" />
                                    <Text style={styles.addButtonText}>
                                        Ajouter un objectif
                                    </Text>
                                </Pressable>
                            }
                        />
                    </>
                )}
            </ScrollView>

            {/* Modal pour ajouter/éditer un objectif */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingGoal ? 'Modifier l\'objectif' : 'Nouvel objectif'}
                            </Text>
                            <Pressable
                                onPress={() => setIsModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={28} color="#6b6b6b" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Titre */}
                            <Text style={styles.inputLabel}>Titre de l'objectif</Text>
                            <TextInput
                                style={styles.input}
                                value={tempTitle}
                                onChangeText={setTempTitle}
                                placeholder="Ex: Vidéos regardées"
                                placeholderTextColor="#B0B0B0"
                            />

                            {/* Objectif */}
                            <Text style={styles.inputLabel}>Objectif à atteindre</Text>
                            <TextInput
                                style={styles.input}
                                value={tempTarget}
                                onChangeText={setTempTarget}
                                placeholder="Ex: 10"
                                placeholderTextColor="#B0B0B0"
                                keyboardType="numeric"
                            />

                            {/* Emoji */}
                            <Text style={styles.inputLabel}>Choisir un emoji</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.emojiScroll}
                            >
                                {emojis.map((emoji, index) => (
                                    <Pressable
                                        key={index}
                                        onPress={() => setTempEmoji(emoji)}
                                        style={[
                                            styles.emojiOption,
                                            tempEmoji === emoji && styles.emojiOptionSelected,
                                        ]}
                                    >
                                        <Text style={styles.emojiOptionText}>{emoji}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            {/* Couleur */}
                            <Text style={styles.inputLabel}>Choisir une couleur</Text>
                            <View style={styles.colorGrid}>
                                {colors.map((color, index) => (
                                    <Pressable
                                        key={index}
                                        onPress={() => setTempColor(color.value)}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: color.value },
                                            tempColor === color.value &&
                                                styles.colorOptionSelected,
                                        ]}
                                    >
                                        {tempColor === color.value && (
                                            <Ionicons
                                                name="checkmark"
                                                size={20}
                                                color="#FFFFFF"
                                            />
                                        )}
                                    </Pressable>
                                ))}
                            </View>

                            {/* Boutons */}
                            <View style={styles.modalButtons}>
                                <Pressable
                                    style={styles.cancelButton}
                                    onPress={() => setIsModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Annuler</Text>
                                </Pressable>
                                <Pressable style={styles.saveButton} onPress={saveGoal}>
                                    <Text style={styles.saveButtonText}>
                                        {editingGoal ? 'Enregistrer' : 'Créer'}
                                    </Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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
                    <Ionicons name="person-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Profil</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Screen Base
    screen: { 
        flex: 1,
        backgroundColor: '#FFFFFF'
    },
    content: { 
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 100 : 90
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    placeholder: { width: 40 },

    // Tabs
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    tabActive: { backgroundColor: '#6B46FF' },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B6B6B',
    },
    tabTextActive: { color: '#FFFFFF' },

    // Section Headers
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B6B6B',
        marginBottom: 24,
        lineHeight: 20,
    },

    // Cards
    card: {
        width: '100%',
        backgroundColor: '#F8F6FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
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
    levelBadge: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    levelBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B46FF',
    },

    // Progress Bar
    progressBarContainer: { marginBottom: 8 },
    progressTrack: { 
        height: 8, 
        backgroundColor: '#E0D6FF', 
        borderRadius: 4, 
        overflow: 'hidden' 
    },
    progressFill: { 
        height: '100%', 
        backgroundColor: '#FF9A2A', 
        borderRadius: 4 
    },
    progressText: { 
        fontSize: 12, 
        color: '#6B6B6B' 
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    statEmoji: { fontSize: 32, marginBottom: 8 },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#FFFFFF',
        textAlign: 'center',
    },

    // Goal Preview (dans vue d'ensemble)
    goalPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    goalPreviewLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    goalEmoji: { fontSize: 32, marginRight: 12 },
    goalTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    goalProgress: {
        fontSize: 12,
        color: '#6B6B6B',
        marginTop: 2,
    },
    goalProgressCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalProgressPercent: {
        fontSize: 14,
        fontWeight: '700',
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B46FF',
    },

    // Goal Cards (dans onglet objectifs)
    goalCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    goalCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    goalCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    goalEmojiContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    goalEmojiLarge: { fontSize: 28 },
    goalCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    goalCardProgress: {
        fontSize: 12,
        color: '#6B6B6B',
        marginTop: 2,
    },
    goalActions: {
        flexDirection: 'row',
        gap: 8,
    },
    goalActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Control Buttons
    controlButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlButtonDisabled: { opacity: 0.5 },
    controlText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B6B6B',
    },

    // Completed Badge
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
        padding: 8,
        marginTop: 12,
    },
    completedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
        marginLeft: 6,
    },

    // Add Button
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F6FF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#6B46FF',
        borderStyle: 'dashed',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B46FF',
        marginLeft: 8,
    },

    // Modal
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

    // Input Fields
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
        marginTop: 16,
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

    // Emoji Selection
    emojiScroll: { marginBottom: 8 },
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
    emojiOptionText: { fontSize: 32 },

    // Color Selection
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 8,
    },
    colorOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: { borderColor: '#1A1A1A' },

    // Modal Buttons
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
    navItem: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        flex: 1 
    },
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
    navText: { 
        fontSize: 10, 
        color: '#B0B0B0', 
        marginTop: 4, 
        fontWeight: '500' 
    },
});