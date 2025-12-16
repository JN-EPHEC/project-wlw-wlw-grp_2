import React, { createContext, ReactNode, useContext, useState } from 'react';

// Types
export interface Goal {
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    emoji: string;
    color: string;
}

export interface ProgressData {
    level: number;
    currentXP: number;
    nextLevelXP: number;
    totalVideos: number;
    totalHours: number;
    streak: number;
}

interface ProgressContextType {
    // Données de progression
    progressData: ProgressData;
    setProgressData: (data: ProgressData) => void;
    
    // Objectifs
    goals: Goal[];
    addGoal: (goal: Goal) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    deleteGoal: (id: string) => void;
    incrementGoal: (id: string) => void;
    decrementGoal: (id: string) => void;
    
    // Badges
    badges: { title: string; emoji: string }[];
    badgesCount: { earned: number; total: number };
}

// Contexte
const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

// Provider
export function ProgressProvider({ children }: { children: ReactNode }) {
    // Données de progression initiales
    const [progressData, setProgressData] = useState<ProgressData>({
        level: 8,
        currentXP: 2450,
        nextLevelXP: 3000,
        totalVideos: 45,
        totalHours: 32,
        streak: 7,
    });

    // Objectifs initiaux
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

    // Badges
    const badges = [
        { title: 'Expert\nMarketing', emoji: '🏅' },
        { title: 'Développeur\nPython', emoji: '🐍' },
        { title: 'Expert\nData', emoji: '📊' },
        { title: 'Designer\nUI/UX', emoji: '🎨' }
    ];

    const badgesCount = {
        earned: 4,
        total: 8
    };

    // Fonctions de gestion des objectifs
    const addGoal = (goal: Goal) => {
        setGoals(prev => [...prev, goal]);
    };

    const updateGoal = (id: string, updates: Partial<Goal>) => {
        setGoals(prev =>
            prev.map(goal =>
                goal.id === id ? { ...goal, ...updates } : goal
            )
        );
    };

    const deleteGoal = (id: string) => {
        setGoals(prev => prev.filter(goal => goal.id !== id));
    };

    const incrementGoal = (id: string) => {
        setGoals(prev =>
            prev.map(goal =>
                goal.id === id && goal.current < goal.target
                    ? { ...goal, current: goal.current + 1 }
                    : goal
            )
        );
    };

    const decrementGoal = (id: string) => {
        setGoals(prev =>
            prev.map(goal =>
                goal.id === id && goal.current > 0
                    ? { ...goal, current: goal.current - 1 }
                    : goal
            )
        );
    };

    const value = {
        progressData,
        setProgressData,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        incrementGoal,
        decrementGoal,
        badges,
        badgesCount,
    };

    return (
        <ProgressContext.Provider value={value}>
            {children}
        </ProgressContext.Provider>
    );
}

// Hook personnalisé
export function useProgress() {
    const context = useContext(ProgressContext);
    if (context === undefined) {
        throw new Error('useProgress must be used within a ProgressProvider');
    }
    return context;
}