import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Goal, useProgress } from './ProgressContext';

// Types pour les parcours
interface Course {
    id: string;
    title: string;
    emoji: string;
    progress: number;
    totalVideos: number;
    watchedVideos: number;
    rating: number | null;
    status: 'ongoing' | 'completed' | 'available';
    category: string;
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    emoji: string;
    accepted: boolean;
    dueDate: string;
}

export default function ProgressionPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'progression' | 'objectifs' | 'parcours'>('progression');
    
    // Utiliser le contexte de progression
    const {
        progressData,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        incrementGoal,
        decrementGoal,
    } = useProgress();
    
    // États pour les parcours
    const [courses, setCourses] = useState<Course[]>([
        {
            id: 'c1',
            title: 'Marketing Digital Avancé',
            emoji: '📱',
            progress: 75,
            totalVideos: 12,
            watchedVideos: 9,
            rating: 4,
            status: 'ongoing',
            category: 'Marketing'
        },
        {
            id: 'c2',
            title: 'Python pour Data Science',
            emoji: '🐍',
            progress: 45,
            totalVideos: 20,
            watchedVideos: 9,
            rating: null,
            status: 'ongoing',
            category: 'Programmation'
        },
        {
            id: 'c3',
            title: 'UI/UX Design Fondamentaux',
            emoji: '🎨',
            progress: 100,
            totalVideos: 15,
            watchedVideos: 15,
            rating: 5,
            status: 'completed',
            category: 'Design'
        },
    ]);

    // États pour les défis
    const [challenges, setChallenges] = useState<Challenge[]>([
        {
            id: 'ch1',
            title: 'Défi 7 jours',
            description: 'Regardez au moins 1 vidéo par jour pendant 7 jours',
            emoji: '🔥',
            accepted: true,
            dueDate: '2025-12-10'
        },
        {
            id: 'ch2',
            title: 'Complétiste',
            description: 'Terminez 3 parcours ce mois-ci',
            emoji: '🏆',
            accepted: false,
            dueDate: '2025-12-31'
        },
    ]);
    
    // Modal pour ajouter/éditer un objectif
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

    // Supprimer un objectif
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

    // Fonction pour noter un parcours
    const rateCourse = (courseId: string) => {
        // Stocker l'ID pour l'utiliser dans la page suivante
        // Ou naviguer vers une page de notation avec navigation state
        router.push({
            pathname: '/course-rating',
            params: { courseId: courseId }
        } as any);
    };

    // Fonction pour voir les détails d'un parcours  
    const viewCourseDetails = (courseId: string) => {
        // Stocker l'ID pour l'utiliser dans la page suivante
        router.push({
            pathname: '/course-details',
            params: { courseId: courseId }
        } as any);
    };

    // Fonction pour accepter un défi
    const acceptChallenge = (challengeId: string) => {
        setChallenges(prev =>
            prev.map(ch =>
                ch.id === challengeId ? { ...ch, accepted: true } : ch
            )
        );
        Alert.alert('Défi accepté !', 'Bonne chance ! 💪');
    };

    // Fonction pour refuser un défi
    const declineChallenge = (challengeId: string) => {
        Alert.alert(
            'Refuser le défi',
            'Êtes-vous sûr de vouloir refuser ce défi ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Refuser',
                    style: 'destructive',
                    onPress: () => {
                        setChallenges(prev => prev.filter(ch => ch.id !== challengeId));
                    },
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
                        activeTab === 'parcours' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('parcours')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'parcours' && styles.tabTextActive,
                        ]}
                    >
                        Parcours
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
                {/* ONGLET VUE D'ENSEMBLE */}
                {activeTab === 'progression' && (
                    <View>
                        {/* Niveau actuel */}
                        <View style={styles.levelCard}>
                            <View style={styles.levelHeader}>
                                <Text style={styles.levelCardTitle}>
                                    Niveau actuel
                                </Text>
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
                            <View style={styles.trophyIcon}>
                                <Text style={styles.trophyEmoji}>🏆</Text>
                            </View>
                        </View>

                        {/* Statistiques */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, { backgroundColor: '#6B46FF' }]}>
                                <Text style={styles.statEmoji}>📺</Text>
                                <Text style={styles.statNumber}>
                                    {progressData.totalVideos}
                                </Text>
                                <Text style={styles.statLabel}>Vidéos vues</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#FF9A2A' }]}>
                                <Text style={styles.statEmoji}>⏱️</Text>
                                <Text style={styles.statNumber}>
                                    {progressData.totalHours}h
                                </Text>
                                <Text style={styles.statLabel}>D'étude</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
                                <Text style={styles.statEmoji}>🔥</Text>
                                <Text style={styles.statNumber}>
                                    {progressData.streak}
                                </Text>
                                <Text style={styles.statLabel}>Jours de suite</Text>
                            </View>
                        </View>

                        {/* Aperçu des objectifs de la semaine */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Objectifs de la semaine
                            </Text>
                            <Pressable onPress={() => setActiveTab('objectifs')}>
                                <Text style={styles.seeAllText}>Voir tout</Text>
                            </Pressable>
                        </View>

                        {goals.slice(0, 3).map(goal => {
                            const percentage = Math.round(
                                (goal.current / goal.target) * 100
                            );
                            return (
                                <View key={goal.id} style={styles.goalPreviewCard}>
                                    <View style={styles.goalPreviewLeft}>
                                        <View
                                            style={[
                                                styles.goalPreviewIcon,
                                                { backgroundColor: goal.color + '20' },
                                            ]}
                                        >
                                            <Text style={styles.goalPreviewEmoji}>
                                                {goal.emoji}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text style={styles.goalPreviewTitle}>
                                                {goal.title}
                                            </Text>
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

                {/* ONGLET PARCOURS */}
                {activeTab === 'parcours' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Mes parcours</Text>
                            <Text style={styles.sectionSubtitle}>
                                Suivez votre progression et évaluez vos parcours
                            </Text>
                        </View>

                        {/* Parcours en cours */}
                        <Text style={styles.categoryTitle}>En cours</Text>
                        {courses
                            .filter(c => c.status === 'ongoing')
                            .map(course => (
                                <View key={course.id} style={styles.courseCard}>
                                    <View style={styles.courseHeader}>
                                        <View style={styles.courseIconContainer}>
                                            <Text style={styles.courseEmoji}>
                                                {course.emoji}
                                            </Text>
                                        </View>
                                        <View style={styles.courseInfo}>
                                            <Text style={styles.courseTitle}>
                                                {course.title}
                                            </Text>
                                            <Text style={styles.courseProgress}>
                                                {course.watchedVideos}/{course.totalVideos} vidéos • {course.progress}%
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Barre de progression du parcours */}
                                    <View style={styles.courseProgressBarContainer}>
                                        <View style={styles.courseProgressTrack}>
                                            <View
                                                style={[
                                                    styles.courseProgressFill,
                                                    { width: `${course.progress}%` },
                                                ]}
                                            />
                                        </View>
                                    </View>

                                    {/* Visualisation des étapes (vidéos) */}
                                    <View style={styles.stepsContainer}>
                                        <Text style={styles.stepsLabel}>Étapes franchies</Text>
                                        <View style={styles.stepsRow}>
                                            {Array.from({ length: course.totalVideos }, (_, i) => (
                                                <View
                                                    key={i}
                                                    style={[
                                                        styles.stepDot,
                                                        i < course.watchedVideos
                                                            ? styles.stepDotCompleted
                                                            : styles.stepDotIncomplete,
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                    </View>

                                    {/* Bouton Voir détails */}
                                    <Pressable
                                        style={styles.courseActionButton}
                                        onPress={() => viewCourseDetails(course.id)}
                                    >
                                        <Text style={styles.courseActionButtonText}>
                                            Continuer le parcours
                                        </Text>
                                        <Ionicons
                                            name="arrow-forward"
                                            size={16}
                                            color="#6B46FF"
                                        />
                                    </Pressable>
                                </View>
                            ))}

                        {/* Parcours terminés */}
                        <Text style={styles.categoryTitle}>Terminés</Text>
                        {courses
                            .filter(c => c.status === 'completed')
                            .map(course => (
                                <View key={course.id} style={styles.courseCard}>
                                    <View style={styles.completedBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                        <Text style={styles.completedBadgeText}>
                                            Terminé
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.courseHeader}>
                                        <View style={styles.courseIconContainer}>
                                            <Text style={styles.courseEmoji}>
                                                {course.emoji}
                                            </Text>
                                        </View>
                                        <View style={styles.courseInfo}>
                                            <Text style={styles.courseTitle}>
                                                {course.title}
                                            </Text>
                                            <Text style={styles.courseProgress}>
                                                {course.totalVideos} vidéos complétées
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Note si déjà évalué */}
                                    {course.rating ? (
                                        <View style={styles.ratingContainer}>
                                            <Text style={styles.ratingLabel}>Votre note :</Text>
                                            <View style={styles.starsRow}>
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Ionicons
                                                        key={star}
                                                        name={star <= course.rating! ? 'star' : 'star-outline'}
                                                        size={20}
                                                        color={star <= course.rating! ? '#FF9A2A' : '#E0E0E0'}
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        <Pressable
                                            style={styles.rateButton}
                                            onPress={() => rateCourse(course.id)}
                                        >
                                            <Ionicons name="star-outline" size={18} color="#6B46FF" />
                                            <Text style={styles.rateButtonText}>
                                                Noter ce parcours
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            ))}

                        {/* Défis proposés */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Défis proposés</Text>
                            <Text style={styles.sectionSubtitle}>
                                Acceptez ou refusez les défis pour booster votre progression
                            </Text>
                        </View>

                        {challenges.map(challenge => (
                            <View key={challenge.id} style={styles.challengeCard}>
                                <View style={styles.challengeHeader}>
                                    <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
                                    <View style={styles.challengeInfo}>
                                        <Text style={styles.challengeTitle}>
                                            {challenge.title}
                                        </Text>
                                        <Text style={styles.challengeDescription}>
                                            {challenge.description}
                                        </Text>
                                        <Text style={styles.challengeDueDate}>
                                            Jusqu'au {new Date(challenge.dueDate).toLocaleDateString('fr-FR')}
                                        </Text>
                                    </View>
                                </View>

                                {challenge.accepted ? (
                                    <View style={styles.acceptedBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                        <Text style={styles.acceptedBadgeText}>Défi accepté</Text>
                                    </View>
                                ) : (
                                    <View style={styles.challengeActions}>
                                        <Pressable
                                            style={styles.declineButton}
                                            onPress={() => declineChallenge(challenge.id)}
                                        >
                                            <Text style={styles.declineButtonText}>Refuser</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.acceptButton}
                                            onPress={() => acceptChallenge(challenge.id)}
                                        >
                                            <Text style={styles.acceptButtonText}>Accepter</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* ONGLET OBJECTIFS (code existant conservé) */}
                {activeTab === 'objectifs' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Objectifs hebdomadaires
                            </Text>
                            <Text style={styles.sectionSubtitle}>
                                Définissez vos objectifs pour cette semaine et suivez votre
                                progression
                            </Text>
                        </View>

                        <FlatList
                            data={goals}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                            renderItem={({ item }) => {
                                const percentage = Math.round(
                                    (item.current / item.target) * 100
                                );
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
                                                    <Text style={styles.goalEmoji}>
                                                        {item.emoji}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.goalTitle}>
                                                        {item.title}
                                                    </Text>
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
                                                    <Ionicons
                                                        name="create-outline"
                                                        size={20}
                                                        color="#6B46FF"
                                                    />
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => handleDeleteGoal(item.id)}
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
                                            <View style={styles.completedBadgeGoal}>
                                                <Text style={styles.completedBadgeGoalText}>
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

            {/* Modal pour créer/éditer un objectif (code existant conservé) */}
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
                                            tempColor === color.value &&
                                                styles.colorButtonSelected,
                                        ]}
                                        onPress={() => setTempColor(color.value)}
                                    >
                                        {tempColor === color.value && (
                                            <Ionicons
                                                name="checkmark"
                                                size={24}
                                                color="#FFFFFF"
                                            />
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

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <Pressable style={styles.navItem}>
                    <Ionicons name="home-outline" size={24} color="#6b6b6b" />
                    <Text style={styles.navText}>Accueil</Text>
                </Pressable>
                <Pressable style={styles.navItem}>
                    <Ionicons name="search-outline" size={24} color="#6b6b6b" />
                    <Text style={styles.navText}>Explorer</Text>
                </Pressable>
                <Pressable style={styles.plusButton}>
                    <View style={styles.plusButtonInner}>
                        <Ionicons name="add" size={32} color="#fff" />
                    </View>
                </Pressable>
                <Pressable style={styles.navItem}>
                    <Ionicons name="notifications-outline" size={24} color="#6b6b6b" />
                    <Text style={styles.navText}>Notifications</Text>
                </Pressable>
                <Pressable style={styles.navItem}>
                    <Ionicons name="person-outline" size={24} color="#FD9A34" />
                    <Text style={[styles.navText, { color: '#FD9A34' }]}>Profil</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Screen Base
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 100 : 85,
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
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    placeholder: { width: 40 },

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F6FF',
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: '#6B46FF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B6B6B',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },

    // Section Headers
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B6B6B',
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B46FF',
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 24,
        marginBottom: 12,
    },

    // Level Card
    levelCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        position: 'relative',
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    levelBadge: {
        backgroundColor: '#6B46FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    levelBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    trophyIcon: {
        position: 'absolute',
        top: 20,
        right: 20,
    },
    trophyEmoji: {
        fontSize: 40,
    },

    // Progress Bar
    progressBarContainer: {
        marginVertical: 12,
    },
    progressTrack: {
        height: 8,
        backgroundColor: '#E8E8E8',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6B46FF',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B6B6B',
        textAlign: 'center',
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
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

    // Goal Preview (in Vue d'ensemble tab)
    goalPreviewCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    goalPreviewLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    goalPreviewIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    goalPreviewEmoji: {
        fontSize: 24,
    },
    goalPreviewTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    goalPreviewProgress: {
        fontSize: 12,
        color: '#6B6B6B',
    },
    goalPreviewPercentage: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalPreviewPercentageText: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Course Cards
    courseCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    courseHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    courseIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    courseEmoji: {
        fontSize: 32,
    },
    courseInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    courseProgress: {
        fontSize: 14,
        color: '#6B6B6B',
    },
    courseProgressBarContainer: {
        marginBottom: 12,
    },
    courseProgressTrack: {
        height: 6,
        backgroundColor: '#E8E8E8',
        borderRadius: 3,
        overflow: 'hidden',
    },
    courseProgressFill: {
        height: '100%',
        backgroundColor: '#6B46FF',
        borderRadius: 3,
    },
    stepsContainer: {
        marginBottom: 12,
    },
    stepsLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B6B6B',
        marginBottom: 8,
    },
    stepsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    stepDotCompleted: {
        backgroundColor: '#4CAF50',
    },
    stepDotIncomplete: {
        backgroundColor: '#E8E8E8',
    },
    courseActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    courseActionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B46FF',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 12,
        gap: 4,
    },
    completedBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4CAF50',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
    },
    ratingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    starsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    rateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: '#6B46FF',
        marginTop: 12,
    },
    rateButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B46FF',
    },

    // Challenge Cards
    challengeCard: {
        backgroundColor: '#FFF8E1',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#FFD54F',
    },
    challengeHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    challengeEmoji: {
        fontSize: 48,
        marginRight: 12,
    },
    challengeInfo: {
        flex: 1,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    challengeDescription: {
        fontSize: 14,
        color: '#6B6B6B',
        marginBottom: 8,
    },
    challengeDueDate: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF9A2A',
    },
    challengeActions: {
        flexDirection: 'row',
        gap: 12,
    },
    declineButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    declineButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B6B6B',
    },
    acceptButton: {
        flex: 1,
        backgroundColor: '#6B46FF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    acceptButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    acceptedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F5E9',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    acceptedBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },

    // Goal Cards (in Objectifs tab)
    goalCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    goalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    goalIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    goalEmoji: {
        fontSize: 24,
    },
    goalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    goalProgress: {
        fontSize: 14,
        color: '#6B6B6B',
    },
    goalActions: {
        flexDirection: 'row',
        gap: 8,
    },
    goalActionButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    controlButtonDisabled: {
        backgroundColor: '#F5F5F5',
    },
    percentageDisplay: {
        flex: 1,
        alignItems: 'center',
    },
    percentageText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B6B6B',
    },
    completedBadgeGoal: {
        backgroundColor: '#E8F5E9',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 12,
        alignItems: 'center',
    },
    completedBadgeGoalText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },

    // Add Button
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F6FF',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#6B46FF',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B46FF',
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
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
        marginTop: 16,
        paddingHorizontal: 20,
    },
    input: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1A1A1A',
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    emojiScroll: {
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    emojiButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F8F6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    emojiButtonSelected: {
        borderColor: '#6B46FF',
        backgroundColor: '#EEE5FF',
    },
    emojiText: {
        fontSize: 28,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    colorButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    colorButtonSelected: {
        borderColor: '#FFFFFF',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#F8F6FF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B46FF',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#6B46FF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Bottom Navigation
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 20 : 5,
        height: 75,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navText: {
        fontSize: 10,
        color: '#6b6b6b',
        marginTop: 4,
    },
    plusButton: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -28,
    },
    plusButtonInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FD9A34',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#FD9A34',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});