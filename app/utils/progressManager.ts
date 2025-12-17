import { auth, db } from '../../firebaseConfig';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

/**
 * 📈 Ajoute de l'XP à l'utilisateur connecté.
 * Gère automatiquement le passage de niveau (Level Up).
 * * @param amount Quantité d'XP à ajouter (ex: 50 pour une vidéo vue)
 */
export async function addUserXP(amount: number) {
    const user = auth.currentUser;
    if (!user) throw new Error("Utilisateur non connecté");

    const userRef = doc(db, 'users', user.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("Document utilisateur introuvable");

            const userData = userDoc.data();
            
            // Récupérer les données actuelles ou mettre des valeurs par défaut
            let { currentXP, level, nextLevelXP } = userData.progressData || { 
                currentXP: 0, 
                level: 1, 
                nextLevelXP: 100 
            };

            // Ajouter l'XP
            let newXP = currentXP + amount;
            let newLevel = level;
            let newNextLevelXP = nextLevelXP;

            // 🔄 Boucle de Level Up (au cas où on gagne beaucoup d'XP d'un coup)
            while (newXP >= newNextLevelXP) {
                newXP -= newNextLevelXP; // On garde le surplus
                newLevel++;              // Niveau suivant
                newNextLevelXP = Math.floor(newNextLevelXP * 1.5); // Le prochain niveau est 50% plus dur
            }

            // Mise à jour atomique dans la base de données
            transaction.update(userRef, {
                'progressData.currentXP': newXP,
                'progressData.level': newLevel,
                'progressData.nextLevelXP': newNextLevelXP,
                'updatedAt': serverTimestamp()
            });

            console.log(`🎉 XP Ajouté ! Niveau: ${newLevel} | XP: ${newXP}/${newNextLevelXP}`);
        });
        
        return { success: true };
    } catch (error) {
        console.error("❌ Erreur lors de l'ajout d'XP:", error);
        throw error;
    }
}