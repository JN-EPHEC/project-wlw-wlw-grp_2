import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

type EventItem = {
  id: string;
  title: string;
  done?: boolean;
  createdAt?: number;
};

export default function FirestorePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const col = collection(db, "events");
    const unsub = onSnapshot(
      col,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setEvents(docs as EventItem[]);
      },
      (err) => {
        console.error("Firestore onSnapshot error:", err);
        Alert.alert("Erreur Firestore", String(err));
      }
    );

    return () => unsub();
  }, []);

  const addEvent = async () => {
    if (!title.trim()) return Alert.alert("Erreur", "Titre vide");
    const user = auth.currentUser;
    try {
      await addDoc(collection(db, "events"), {
        title: title.trim(),
        done: false,
        createdAt: Date.now(),
        owner: user?.uid ?? null,
      });
      setTitle("");
    } catch (err: any) {
      console.error("addEvent error:", err);
      Alert.alert("Erreur", err?.message ?? String(err));
    }
  };

  const toggleDone = async (item: EventItem) => {
    try {
      await updateDoc(doc(db, "events", item.id), { done: !item.done });
    } catch (err: any) {
      console.error("toggleDone error:", err);
      Alert.alert("Erreur", String(err));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (err: any) {
      console.error("delete error:", err);
      Alert.alert("Erreur", String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firestore — Events (CRUD)</Text>

      <View style={styles.row}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titre de l'event"
          style={styles.input}
        />
        <TouchableOpacity style={styles.addButton} onPress={addEvent}>
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={[styles.itemTitle, item.done && styles.done]}>
              {item.title}
            </Text>
            <View style={styles.itemActions}>
              <TouchableOpacity
                onPress={() => toggleDone(item)}
                style={styles.smallButton}
              >
                <Text style={styles.smallButtonText}>
                  {item.done ? "Undo" : "Done"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => remove(item.id)}
                style={[styles.smallButton, styles.deleteButton]}
              >
                <Text style={styles.smallButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 6,
  },
  addButton: {
    marginLeft: 8,
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 6,
  },
  addButtonText: { color: "white", fontWeight: "700" },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: { fontSize: 16 },
  done: { textDecorationLine: "line-through", color: "#888" },
  itemActions: { flexDirection: "row", gap: 8 },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#34C759",
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteButton: { backgroundColor: "#FF3B30" },
  smallButtonText: { color: "white", fontWeight: "700" },
});