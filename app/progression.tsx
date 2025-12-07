import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Goal, useProgress } from './ProgressContext';

export default function ProgressionPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'progression' | 'objectifs'>('progression');
    
    const {
        progressData,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        incrementGoal,
        decrementGoal,
    } = useProgress();
    
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [tempTitle, setTempTitle] = useState('');
    const [tempTarget, setTempTarget] = useState('');
    const [tempEmoji, setTempEmoji] = useState('🎯');
    const [tempColor, setTempColor] = useState('#6B46FF');

    const emojis = ['🎯', '📺', '📚', '⏱️', '✅', '🎓', '💪', '🔥', '⭐', '🏆'];
    const colors = [
        { name: 'Violet', value: '#6B46FF' },
        { name: 'Orange', value: '#FF9A2A' },
        { name: 'Vert', value: '#4CAF50' },
        { name: 'Rouge', value: '#FF3B30' },
        { name: 'Bleu', value: '#007AFF' },
        { name: 'Rose', value: '#FF2D55' },
    ];

    const openAddGoalModal = () => {
        setEditingGoal(null);
        setTempTitle('');
        setTempTarget('');
        setTempEmoji('🎯');
        setTempColor('#6B46FF');
        setIsModalVisible(true);
    };

    const openEditGoalModal = (goal: Goal) => {
        setEditingGoal(goal);
        setTempTitle(goal.title);
        setTempTarget(goal.target.toString());
        setTempEmoji(goal.emoji);
        setTempColor(goal.color);
        setIsModalVisible(true);
    };

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
            updateGoal(editingGoal.id, {
                title: tempTitle,
                target: Number(tempTarget),
                emoji: tempEmoji,
                color: tempColor,
            });
        } else {
            const newGoal: Goal = {
                id: `g${Date.now()}`,
                title: tempTitle,
                target: Number(tempTarget),
                current: 0,
                unit: 'unités',
                emoji: tempEmoji,
                color: tempColor,
            };
            addGoal(newGoal);
        }

        setIsModalVisible(false);
    };

    const handleDeleteGoal = (id: string) => {
        Alert.alert(
            'Supprimer l\'objectif',
            'Êtes-vous sûr de vouloir supprimer cet objectif ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => deleteGoal(id),
                },
            ]
        );
    };

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={28} color="#6b6b6b" />
                </Pressable>
                <Text style={styles.headerTitle}>Progression</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <Pressable
                    style={[
                        styles.tab,
                        activeTab === 'progression' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('progression')}
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
                    style={[
                        styles.tab,
                        activeTab === 'objectifs' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('objectifs')}
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

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* VUE D'ENSEMBLE */}
                {activeTab === 'progression' && (
                    <View>
                        {/* Niveau */}
                        <View style={styles.levelCard}>
                            <View style={styles.levelHeader}>
                                <Text style={styles.levelCardTitle}>Niveau actuel</Text>
                                <View style={styles.levelBadge}>
                                    <Text style={styles.levelBadgeText}>
                                        Niveau {progressData.level}
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
                                                    (progressData.currentXP /
                                                        progressData.nextLevelXP) *
                                                    100
                                                }%`,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                            <Text style={styles.progressText}>
                                {progressData.currentXP} / {progressData.nextLevelXP} XP
                            </Text>
                        </View>

                        {/* Stats */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, { backgroundColor: '#6B46FF' }]}>
                                <Text style={styles.statEmoji}>📺</Text>
                                <Text style={styles.statNumber}>{progressData.totalVideos}</Text>
                                <Text style={styles.statLabel}>Vidéos vues</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#FF9A2A' }]}>
                                <Text style={styles.statEmoji}>⏱️</Text>
                                <Text style={styles.statNumber}>{progressData.totalHours}h</Text>
                                <Text style={styles.statLabel}>D'étude</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
                                <Text style={styles.statEmoji}>🔥</Text>
                                <Text style={styles.statNumber}>{progressData.streak}</Text>
                                <Text style={styles.statLabel}>Jours de suite</Text>
                            </View>
                        </View>

                        {/* Aperçu objectifs */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Objectifs de la semaine</Text>
                            <Pressable onPress={() => setActiveTab('objectifs')}>
                                <Text style={styles.seeAllText}>Voir tout</Text>
                            </Pressable>
                        </View>

                        {goals.slice(0, 3).map(goal => {
                            const percentage = Math.round((goal.current / goal.target) * 100);
                            return (
                                <View key={goal.id} style={styles.goalPreviewCard}>
                                    <View style={styles.goalPreviewLeft}>
                                        <View
                                            style={[
                                                styles.goalPreviewIcon,
                                                { backgroundColor: goal.color + '20' },
                                            ]}
                                        >
                                            <Text style={styles.goalPreviewEmoji}>{goal.emoji}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.goalPreviewTitle}>{goal.title}</Text>
                                            <Text style={styles.goalPreviewProgress}>
                                                {goal.current} / {goal.target} {goal.unit}
                                            </Text>
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            styles.goalPreviewPercentage,
                                            { borderColor: goal.color },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.goalPreviewPercentageText,
                                                { color: goal.color },
                                            ]}
                                        >
                                            {percentage}%
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* OBJECTIFS */}
                {activeTab === 'objectifs' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Objectifs hebdomadaires</Text>
                            <Text style={styles.sectionSubtitle}>
                                Définissez vos objectifs pour cette semaine
                            </Text>
                        </View>

                        <FlatList
                            data={goals}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                            renderItem={({ item }) => {
                                const percentage = Math.round((item.current / item.target) * 100);
                                const isCompleted = item.current >= item.target;

                                return (
                                    <View style={styles.goalCard}>
                                        <View style={styles.goalHeader}>
                                            <View style={styles.goalTitleRow}>
                                                <View
                                                    style={[
                                                        styles.goalIcon,
                                                        { backgroundColor: item.color + '20' },
                                                    ]}
                                                >
                                                    <Text style={styles.goalEmoji}>{item.emoji}</Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.goalTitle}>{item.title}</Text>
                                                    <Text style={styles.goalProgress}>
                                                        {item.current} / {item.target} {item.unit}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.goalActions}>
                                                <Pressable
                                                    onPress={() => openEditGoalModal(item)}
                                                    style={styles.goalActionButton}
                                                >
                                                    <Ionicons name="create-outline" size={20} color="#6B46FF" />
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => handleDeleteGoal(item.id)}
                                                    style={styles.goalActionButton}
                                                >
                                                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                                </Pressable>
                                            </View>
                                        </View>

                                        <View style={styles.progressBarContainer}>
                                            <View style={styles.progressTrack}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        {
                                                            width: `${Math.min(percentage, 100)}%`,
                                                            backgroundColor: item.color,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.controlsRow}>
                                            <Pressable
                                                style={[
                                                    styles.controlButton,
                                                    item.current === 0 && styles.controlButtonDisabled,
                                                ]}
                                                onPress={() => decrementGoal(item.id)}
                                                disabled={item.current === 0}
                                            >
                                                <Ionicons
                                                    name="remove"
                                                    size={20}
                                                    color={item.current === 0 ? '#B0B0B0' : '#6B6B6B'}
                                                />
                                            </Pressable>

                                            <View style={styles.percentageDisplay}>
                                                <Text style={styles.percentageText}>
                                                    {percentage}% complété
                                                </Text>
                                            </View>

                                            <Pressable
                                                style={[
                                                    styles.controlButton,
                                                    isCompleted && styles.controlButtonDisabled,
                                                ]}
                                                onPress={() => incrementGoal(item.id)}
                                                disabled={isCompleted}
                                            >
                                                <Ionicons
                                                    name="add"
                                                    size={20}
                                                    color={isCompleted ? '#B0B0B0' : '#6B6B6B'}
                                                />
                                            </Pressable>
                                        </View>

                                        {isCompleted && (
                                            <View style={styles.completedBadge}>
                                                <Text style={styles.completedBadgeText}>
                                                    Objectif atteint ! 🎉
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                        />

                        <Pressable style={styles.addButton} onPress={openAddGoalModal}>
                            <Ionicons name="add" size={24} color="#6B46FF" />
                            <Text style={styles.addButtonText}>Ajouter un objectif</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>

            {/* Modal */}
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
                            <Pressable onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#6b6b6b" />
                            </Pressable>
                        </View>

                        <ScrollView>
                            <Text style={styles.inputLabel}>Titre de l'objectif</Text>
                            <TextInput
                                style={styles.input}
                                value={tempTitle}
                                onChangeText={setTempTitle}
                                placeholder="Ex: Vidéos regardées"
                                placeholderTextColor="#B0B0B0"
                            />

                            <Text style={styles.inputLabel}>Objectif à atteindre</Text>
                            <TextInput
                                style={styles.input}
                                value={tempTarget}
                                onChangeText={setTempTarget}
                                placeholder="Ex: 10"
                                placeholderTextColor="#B0B0B0"
                                keyboardType="numeric"
                            />

                            <Text style={styles.inputLabel}>Choisir un emoji</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.emojiScroll}
                            >
                                {emojis.map(emoji => (
                                    <Pressable
                                        key={emoji}
                                        style={[
                                            styles.emojiButton,
                                            tempEmoji === emoji && styles.emojiButtonSelected,
                                        ]}
                                        onPress={() => setTempEmoji(emoji)}
                                    >
                                        <Text style={styles.emojiText}>{emoji}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            <Text style={styles.inputLabel}>Choisir une couleur</Text>
                            <View style={styles.colorGrid}>
                                {colors.map(color => (
                                    <Pressable
                                        key={color.value}
                                        style={[
                                            styles.colorButton,
                                            { backgroundColor: color.value },
                                            tempColor === color.value && styles.colorButtonSelected,
                                        ]}
                                        onPress={() => setTempColor(color.value)}
                                    >
                                        {tempColor === color.value && (
                                            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                                        )}
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>

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
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Version SANS navbar fixe en bas
// La navbar est déjà gérée par le _layout.tsx principal

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { padding: 16, paddingBottom: 100 },
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
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    placeholder: { width: 40 },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F6FF',
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: '#6B46FF' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#6B6B6B' },
    tabTextActive: { color: '#FFFFFF' },
    levelCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelCardTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
    levelBadge: { backgroundColor: '#6B46FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    levelBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    progressBarContainer: { marginVertical: 12 },
    progressTrack: { height: 8, backgroundColor: '#E8E8E8', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#6B46FF', borderRadius: 4 },
    progressText: { fontSize: 14, fontWeight: '600', color: '#6B6B6B', textAlign: 'center' },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
    statEmoji: { fontSize: 32, marginBottom: 8 },
    statNumber: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    statLabel: { fontSize: 12, color: '#FFFFFF', textAlign: 'center' },
    sectionHeader: { marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
    sectionSubtitle: { fontSize: 14, color: '#6B6B6B' },
    seeAllText: { fontSize: 14, fontWeight: '600', color: '#6B46FF' },
    goalPreviewCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    goalPreviewLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    goalPreviewIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    goalPreviewEmoji: { fontSize: 24 },
    goalPreviewTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
    goalPreviewProgress: { fontSize: 12, color: '#6B6B6B' },
    goalPreviewPercentage: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    goalPreviewPercentageText: { fontSize: 14, fontWeight: '700' },
    goalCard: { backgroundColor: '#F8F6FF', borderRadius: 16, padding: 16, marginBottom: 16 },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    goalTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    goalIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    goalEmoji: { fontSize: 24 },
    goalTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
    goalProgress: { fontSize: 14, color: '#6B6B6B' },
    goalActions: { flexDirection: 'row', gap: 8 },
    goalActionButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 8 },
    controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    controlButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8E8E8' },
    controlButtonDisabled: { backgroundColor: '#F5F5F5' },
    percentageDisplay: { flex: 1, alignItems: 'center' },
    percentageText: { fontSize: 14, fontWeight: '600', color: '#6B6B6B' },
    completedBadge: { backgroundColor: '#E8F5E9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
    completedBadgeText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F6FF', borderWidth: 2, borderStyle: 'dashed', borderColor: '#6B46FF', borderRadius: 12, paddingVertical: 16, gap: 8 },
    addButtonText: { fontSize: 16, fontWeight: '600', color: '#6B46FF' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8, marginTop: 16, paddingHorizontal: 20 },
    input: { backgroundColor: '#F8F6FF', borderRadius: 12, padding: 14, fontSize: 16, color: '#1A1A1A', marginHorizontal: 20, borderWidth: 1, borderColor: '#E8E8E8' },
    emojiScroll: { paddingHorizontal: 20, marginBottom: 8 },
    emojiButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F8F6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2, borderColor: 'transparent' },
    emojiButtonSelected: { borderColor: '#6B46FF', backgroundColor: '#EEE5FF' },
    emojiText: { fontSize: 28 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
    colorButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
    colorButtonSelected: { borderColor: '#FFFFFF', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
    modalButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 20 },
    cancelButton: { flex: 1, backgroundColor: '#F8F6FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#6B46FF' },
    saveButton: { flex: 1, backgroundColor: '#6B46FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});