// SADECE EKLENENLERİ DEĞİL TAM DOSYA

import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "http://192.168.1.105:8000";

type HistoryItem = {
  _id: string;
  defect?: string;
  decision?: string;
  confidence?: number;
  severity?: string;
  timestamp?: string;
  image_path?: string;
  gradcam_path?: string;
};

const defectCategories = [
  "All",
  "Patches",
  "Crazing",
  "Inclusion",
  "Pitted Surface",
  "Rolled In Scale",
  "Scratches",
];

const decisionCategories = ["All", "ACCEPT", "REJECT"];

export default function MyHistoryScreen() {
  const router = useRouter();

  const [data, setData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDecision, setSelectedDecision] = useState("All");
  const [selectedDefect, setSelectedDefect] = useState("All");

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fixImageUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (path.startsWith("/")) return `${API}${path}`;
    return `${API}/${path}`;
  };

  const normalize = (v?: string) =>
    v?.toLowerCase().replace(/_/g, " ").trim();

  // DELETE FUNCTION
  const deleteItem = async (id: string) => {
    try {
      const token = await SecureStore.getItemAsync("token");

      const res = await fetch(`${API}/history/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Delete failed");

      // UI'dan direkt sil
      setData((prev) => prev.filter((item) => item._id !== id));
    } catch (e) {
      Alert.alert("Error", "Failed to delete item");
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteItem(id),
      },
    ]);
  };

  const loadHistory = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        setData([]);
        router.replace("/auth/login");
        return;
      }

      const res = await fetch(`${API}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (!res.ok) throw new Error("Failed");

      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHistory();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
  };

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchDecision =
        selectedDecision === "All" || item.decision === selectedDecision;

      const matchDefect =
        selectedDefect === "All" ||
        normalize(item.defect) === normalize(selectedDefect);

      return matchDecision && matchDefect;
    });
  }, [data, selectedDecision, selectedDefect]);

  const renderImage = (uri: string | null, label: string) => (
    <View style={{ flex: 1 }}>
      <Text style={styles.imageLabel}>{label}</Text>
      {uri ? (
        <Pressable onPress={() => setPreviewImage(uri)}>
          <Image source={{ uri }} style={styles.image} />
        </Pressable>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No Image</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const img = fixImageUrl(item.image_path);
    const grad = fixImageUrl(item.gradcam_path);

    return (
      <View style={styles.card}>
        {/*  DELETE BUTTON */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => confirmDelete(item._id)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {item.defect?.replace(/_/g, " ") || "-"}
        </Text>

        <Text style={styles.infoText}>Decision: {item.decision ?? "-"}</Text>
        <Text style={styles.infoText}>
          Confidence:{" "}
          {typeof item.confidence === "number"
            ? `${(item.confidence * 100).toFixed(2)}%`
            : "-"}
        </Text>
        <Text style={styles.infoText}>Severity: {item.severity ?? "-"}</Text>

        <View style={styles.row}>
          {renderImage(img, "Before")}
          {renderImage(grad, "After")}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#5E9B59" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(i, index) => i._id || String(index)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <Text style={styles.header}>My History</Text>
          </>
        }
      />

      <Modal visible={!!previewImage} transparent>
        <Pressable style={styles.modal} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.preview} />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F2", padding: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 10,
  },

  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
  },

  title: { fontSize: 18, fontWeight: "bold" },

  infoText: { marginTop: 3 },

  row: { flexDirection: "row", gap: 10, marginTop: 10 },

  image: { width: "100%", height: 120, borderRadius: 10 },

  imageLabel: { fontSize: 12 },

  emptyBox: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: { color: "#999" },

  modal: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },

  preview: {
    width: "90%",
    height: "70%",
  },

  //  DELETE STYLE
  deleteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#E53935",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    zIndex: 10,
  },

  deleteText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
});