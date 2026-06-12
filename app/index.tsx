import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API = "http://192.168.1.105:8000";

type PublicHistoryItem = {
  _id: string;
  defect?: string;
  decision?: string;
  confidence?: number;
  severity?: string;
  owner_name?: string;
  timestamp?: string;
  image_path?: string;
  gradcam_path?: string;
};

type CategoryType =
  | "All"
  | "Patches"
  | "Crazing"
  | "Inclusion"
  | "Pitted Surface"
  | "Rolled In Scale"
  | "Scratches";

const categories: CategoryType[] = [
  "All",
  "Patches",
  "Crazing",
  "Inclusion",
  "Pitted Surface",
  "Rolled In Scale",
  "Scratches",
];

export default function PublicScreen() {
  const router = useRouter();

  const [data, setData] = useState<PublicHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryType>("All");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fixImageUrl = (path?: string | null) => {
    if (!path) return null;

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    if (path.startsWith("/")) {
      return `${API}${path}`;
    }

    return `${API}/${path}`;
  };

  const getProfileUrl = (name?: string) => {
    const displayName = name?.trim() || "Anonymous";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=8BCB7F&color=ffffff&bold=true&size=128`;
  };

  const normalizeDefect = (value?: string) => {
    if (!value) return "";
    return value.toLowerCase().replace(/_/g, " ").trim();
  };

  const formatDefect = (value?: string) => {
    if (!value) return "Unknown defect";

    return value
      .replace(/_/g, " ")
      .split(" ")
      .map((word) =>
        word.length ? word.charAt(0).toUpperCase() + word.slice(1) : word
      )
      .join(" ");
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return value.replace("T", " ").split(".")[0];
  };

  const getDecisionTextColor = (decision?: string) => {
    if (decision === "REJECT") return "#DC2626";
    if (decision === "ACCEPT") return "#16A34A";
    if (decision === "REWORK") return "#D97706";
    return "#2563EB";
  };

  const getDecisionBgColor = (decision?: string) => {
    if (decision === "REJECT") return "#FEE2E2";
    if (decision === "ACCEPT") return "#DCFCE7";
    if (decision === "REWORK") return "#FEF3C7";
    return "#DBEAFE";
  };

  const loadData = async () => {
    try {
      const res = await fetch(`${API}/history/public`);
      const json = await res.json();
      console.log("PUBLIC HISTORY:", json);
      setData(Array.isArray(json) ? json : []);
    } catch (error) {
      console.log("PUBLIC HISTORY ERROR:", error);
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const filteredData = useMemo(() => {
    if (selectedCategory === "All") return data;

    const target = selectedCategory.toLowerCase().trim();
    // normalize defect backend'ten alıyor filtrelerken de normalize ediyoruz ki küçük büyük harf ve alt çizgi farkı olmasın
    return data.filter((item) => {
      const defect = normalizeDefect(item.defect);

      if (target === "pitted surface") return defect === "pitted surface";
      if (target === "rolled in scale") return defect === "rolled in scale";
      return defect === target;
    });
  }, [data, selectedCategory]);

  const renderTopBar = () => {
    return (
      <View style={styles.topArea}>
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>History</Text>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/auth/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.profileButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderImageCard = (
    label: string,
    uri: string | null,
    emptyText: string
  ) => {
    return (
      <View style={styles.imageColumn}>
        <Text style={styles.imageLabel}>{label}</Text>

        {uri ? (
          <Pressable onPress={() => setPreviewImage(uri)}>
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          </Pressable>
        ) : (
          <View style={styles.emptyImageBox}>
            <Text style={styles.emptyImageText}>{emptyText}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: PublicHistoryItem }) => {
    const originalUrl = fixImageUrl(item.image_path);
    const gradcamUrl = fixImageUrl(item.gradcam_path);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.infoArea}>
            <Text style={styles.defectText}>{formatDefect(item.defect)}</Text>

            <View style={styles.ownerRow}>
              <Image
                source={{ uri: getProfileUrl(item.owner_name) }}
                style={styles.ownerAvatar}
              />
              <Text style={styles.ownerText}>
                By: {item.owner_name ?? "Anonymous"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.decisionBadge,
              { backgroundColor: getDecisionBgColor(item.decision) },
            ]}
          >
            <Text
              style={[
                styles.decisionText,
                { color: getDecisionTextColor(item.decision) },
              ]}
            >
              {item.decision ?? "-"}
            </Text>
          </View>
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.metaText}>
            Confidence:{" "}
            {typeof item.confidence === "number"
              ? `${(item.confidence * 100).toFixed(2)}%`
              : "-"}
          </Text>
          <Text style={styles.metaText}>Severity: {item.severity ?? "-"}</Text>
        </View>

        <View style={styles.imagesRow}>
          {renderImageCard("Before", originalUrl, "No Image")}
          {renderImageCard("After", gradcamUrl, "No GradCAM")}
        </View>

        <Text style={styles.timeText}>{formatDate(item.timestamp)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#5E9B59" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderTopBar}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyListBox}>
            <Text style={styles.emptyListText}>
              No history found in this category.
            </Text>
          </View>
        }
      />

      <Modal visible={!!previewImage} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPreviewImage(null)}
        >
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F5",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  centered: {
    flex: 1,
    backgroundColor: "#F7F8F5",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280",
  },
  contentContainer: {
    paddingBottom: 30,
  },
  topArea: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },
  profileButton: {
    minWidth: 82,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#E8EFE4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  profileButtonText: {
    color: "#5E9B59",
    fontSize: 14,
    fontWeight: "700",
  },
  categoryScrollContent: {
    paddingRight: 8,
  },
  categoryChip: {
    height: 42,
    borderRadius: 999,
    backgroundColor: "#ECEDE8",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: "#8BCB7F",
  },
  categoryChipText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 15,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  infoArea: {
    flex: 1,
  },
  defectText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: "#D1D5DB",
  },
  ownerText: {
    fontSize: 13,
    color: "#6B7280",
  },
  decisionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  decisionText: {
    fontSize: 12,
    fontWeight: "800",
  },
  metaBlock: {
    marginTop: 10,
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: "#4B5563",
  },
  imagesRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  imageColumn: {
    flex: 1,
  },
  imageLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  image: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  emptyImageBox: {
    height: 140,
    borderRadius: 16,
    backgroundColor: "#EEF2F7",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImageText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  timeText: {
    marginTop: 12,
    fontSize: 12,
    color: "#9CA3AF",
  },
  emptyListBox: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyListText: {
    fontSize: 15,
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "92%",
    height: "72%",
    borderRadius: 16,
  },
});