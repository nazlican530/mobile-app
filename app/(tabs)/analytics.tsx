import { useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "http://192.168.1.105:8000";

type DefectStat = {
  _id: string;
  count: number;
  images?: string[];
  avg_confidence?: number;
  accept_count?: number;
  rework_count?: number;
  reject_count?: number;
};

type AnalyticsResponse = {
  total_inspections?: number;
  decision_overview?: {
    accept?: number;
    rework?: number;
    reject?: number;
  };
  defect_statistics?: DefectStat[];
};

type Severity = "Low" | "Medium" | "High";

const SEVERITY_MAP: Record<string, Severity> = {
  scratches: "Low",
  crazing: "Medium",
  inclusion: "Medium",
  pitted_surface: "Medium",
  patches: "High",
  rolled_in_scale: "High",
};

const DEFECT_INSIGHTS: Record<string, string> = {
  scratches:
    "Scratches are usually related to mechanical friction, handling, or conveyor contact during production.",
  pitted_surface:
    "Pitted surface defects may indicate localized surface damage, corrosion-like marks, or material irregularities.",
  patches:
    "Patches may show coating inconsistency or non-uniform surface regions that require careful inspection.",
  inclusion:
    "Inclusion defects are generally associated with foreign particles or impurities inside the material surface.",
  crazing:
    "Crazing represents fine crack-like surface patterns and may affect surface durability.",
  rolled_in_scale:
    "Rolled-in scale is a high-risk surface defect caused by scale particles pressed into the material.",
};

const CONFUSION_MAP: Record<string, string> = {
  scratches: "Frequently confused with pitted_surface.",
  pitted_surface: "Frequently confused with scratches.",
  patches: "Frequently confused with rolled_in_scale.",
  rolled_in_scale: "Frequently confused with patches.",
  inclusion: "May be confused with crazing in low-confidence cases.",
  crazing: "May be confused with inclusion in unclear images.",
};

export default function AnalyticsScreen() {
  const [stats, setStats] = useState<DefectStat[]>([]);
  const [decisionOverview, setDecisionOverview] = useState({
    accept: 0,
    rework: 0,
    reject: 0,
  });
  const [apiTotal, setApiTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const calculatedTotal = useMemo(() => {
    return stats.reduce((sum, item) => sum + Number(item.count || 0), 0);
  }, [stats]);

  const totalInspections = apiTotal ?? calculatedTotal;

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
  }, [stats]);

  const mostCommonDefect = sortedStats[0]?._id || "-";

  const averageConfidence = useMemo(() => {
    const validStats = stats.filter(
      (item) => typeof item.avg_confidence === "number"
    );

    if (validStats.length === 0) return 0;

    const weightedSum = validStats.reduce((sum, item) => {
      return sum + Number(item.avg_confidence || 0) * Number(item.count || 0);
    }, 0);

    const totalCount = validStats.reduce((sum, item) => {
      return sum + Number(item.count || 0);
    }, 0);

    if (!totalCount) return 0;

    return Math.round(weightedSum / totalCount * 100);
  }, [stats]);

  const loadAnalytics = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Error", "Please login again.");
        setStats([]);
        setDecisionOverview({ accept: 0, rework: 0, reject: 0 });
        setApiTotal(null);
        return;
      }

      const res = await fetch(`${API}/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: AnalyticsResponse = await res.json();
      console.log("ANALYTICS RESPONSE:", JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error((data as any)?.detail || "Failed to load analytics");
      }

      setStats(Array.isArray(data.defect_statistics) ? data.defect_statistics : []);

      setDecisionOverview({
        accept: Number(data.decision_overview?.accept || 0),
        rework: Number(data.decision_overview?.rework || 0),
        reject: Number(data.decision_overview?.reject || 0),
      });

      setApiTotal(
        typeof data.total_inspections === "number" ? data.total_inspections : null
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load analytics");
      setStats([]);
      setDecisionOverview({ accept: 0, rework: 0, reject: 0 });
      setApiTotal(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAnalytics();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
  };

  const formatDefectName = (value: string) => {
    return value
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
      .join(" ");
  };

  const getPercentNumber = (count: number) => {
    if (!totalInspections) return 0;
    return (count / totalInspections) * 100;
  };

  const getPercent = (count: number) => {
    return `${getPercentNumber(count).toFixed(1)}%`;
  };

  const getSeverity = (defect: string): Severity => {
    return SEVERITY_MAP[defect] || "Medium";
  };

  const getSeverityStyle = (severity: Severity) => {
    if (severity === "High") return styles.highBadge;
    if (severity === "Medium") return styles.mediumBadge;
    return styles.lowBadge;
  };

  const getSeverityTextStyle = (severity: Severity) => {
    if (severity === "High") return styles.highText;
    if (severity === "Medium") return styles.mediumText;
    return styles.lowText;
  };

  const getDecisionByCounts = (item: DefectStat, severity: Severity) => {
    const accept = Number(item.accept_count || 0);
    const rework = Number(item.rework_count || 0);
    const reject = Number(item.reject_count || 0);

    if (accept >= rework && accept >= reject && accept > 0) return "ACCEPT";
    if (rework >= accept && rework >= reject && rework > 0) return "REWORK";
    if (reject > 0) return "REJECT";

    if (severity === "High") return "REJECT / REWORK";
    if (severity === "Medium") return "REWORK";
    return "ACCEPT / REWORK";
  };

  const normalizeImageUrl = (url?: string) => {
    if (!url) return null;

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const renderOriginalPhoto = (
    defect: string,
    imageUrl: string,
    index: number
  ) => {
    const uri = normalizeImageUrl(imageUrl);

    return (
      <View key={`${defect}-${index}`} style={styles.photoItem}>
        <View style={styles.photoCircleOuter}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.photoCircle}
              resizeMode="cover"
              onError={(error) => {
                console.log("IMAGE LOAD ERROR:", uri, error.nativeEvent);
              }}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>?</Text>
            </View>
          )}
        </View>

        <Text style={styles.photoLabel}>Sample {index + 1}</Text>
        <Text style={styles.photoSub}>Original image</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5E9B59" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={sortedStats}
        keyExtractor={(item, index) => item._id || String(index)}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Analytics</Text>
                <Text style={styles.subtitle}>Overview of your defect inspections</Text>
              </View>

              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Live</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryLabel}>Total Inspections</Text>
                <Text style={styles.summaryValue}>{totalInspections}</Text>
                <Text style={styles.summarySubtext}>Pull down to refresh analytics data</Text>
              </View>

              <View style={styles.summaryRight}>
                <Text style={styles.summaryMiniLabel}>Avg Confidence</Text>
                <Text style={styles.summaryMiniValue}>{averageConfidence}%</Text>
              </View>
            </View>

            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>Most Common</Text>
                <Text style={styles.overviewValue} numberOfLines={1}>
                  {formatDefectName(mostCommonDefect)}
                </Text>
              </View>

              <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>Model Status</Text>
                <Text style={styles.overviewValue}>Active</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Decision Overview</Text>

            <View style={styles.decisionRow}>
              <View style={styles.decisionCard}>
                <Text style={styles.decisionLabel}>ACCEPT</Text>
                <Text style={styles.acceptValue}>{decisionOverview.accept}</Text>
              </View>

              <View style={styles.decisionCard}>
                <Text style={styles.decisionLabel}>REWORK</Text>
                <Text style={styles.reworkValue}>{decisionOverview.rework}</Text>
              </View>

              <View style={styles.decisionCard}>
                <Text style={styles.decisionLabel}>REJECT</Text>
                <Text style={styles.rejectValue}>{decisionOverview.reject}</Text>
              </View>
            </View>

            {sortedStats.length > 0 && (
              <Text style={styles.sectionTitle}>Defect Distribution</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No analytics data yet</Text>
            <Text style={styles.emptyText}>
              Your inspection statistics will appear here after analysis.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const severity = getSeverity(item._id);
          const isExpanded = expandedId === item._id;
          const percentage = getPercentNumber(Number(item.count || 0));
          const previewImages = item.images?.filter(Boolean).slice(0, 5) || [];

          const itemConfidence =
            typeof item.avg_confidence === "number"
              ? Math.round(item.avg_confidence * 100)
              : 0;

          return (
            <Pressable
              style={[styles.card, isExpanded && styles.expandedCard]}
              onPress={() => setExpandedId(isExpanded ? null : item._id)}
            >
              <View style={styles.cardTop}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.defectTitleRow}>
                    <Text style={styles.defectName}>{formatDefectName(item._id)}</Text>

                    {index === 0 && (
                      <View style={styles.topBadge}>
                        <Text style={styles.topBadgeText}>Most Common</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.percentText}>
                    {getPercent(Number(item.count || 0))} of total
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={styles.countValue}>{item.count}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: totalInspections ? `${percentage}%` : "0%" },
                  ]}
                />
              </View>

              <View style={styles.cardMetaRow}>
                <View style={[styles.severityBadge, getSeverityStyle(severity)]}>
                  <Text style={[styles.severityText, getSeverityTextStyle(severity)]}>
                    {severity} Severity
                  </Text>
                </View>

                <Text style={styles.tapHint}>
                  {isExpanded ? "Tap to collapse" : "Tap for details"}
                </Text>
              </View>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <Text style={styles.detailTitle}>Recent Original Images</Text>

                  {previewImages.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.photoRow}
                      decelerationRate="fast"
                      snapToAlignment="start"
                    >
                      {previewImages.map((imageUrl, photoIndex) =>
                        renderOriginalPhoto(item._id, imageUrl, photoIndex)
                      )}
                    </ScrollView>
                  ) : (
                    <View style={styles.noImageBox}>
                      <Text style={styles.noImageTitle}>No images from API</Text>
                      <Text style={styles.noImageText}>
                        This defect has no image_url records yet. Run a new analysis
                        after saving image_url in /predict.
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>AI Insight</Text>
                    <Text style={styles.infoText}>
                      {DEFECT_INSIGHTS[item._id] ||
                        "This defect type requires additional visual inspection and quality control review."}
                    </Text>
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={styles.detailMiniCard}>
                      <Text style={styles.detailMiniLabel}>Avg Confidence</Text>
                      <Text style={styles.detailMiniValue}>{itemConfidence}%</Text>
                    </View>

                    <View style={styles.detailMiniCard}>
                      <Text style={styles.detailMiniLabel}>Common Decision</Text>
                      <Text style={styles.detailMiniValueSmall}>
                        {getDecisionByCounts(item, severity)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠{" "}
                      {CONFUSION_MAP[item._id] ||
                        "Low-confidence cases should be reviewed manually."}
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        }}
        ListFooterComponent={
          sortedStats.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>AI Monitoring</Text>

              <View style={styles.monitorCard}>
                <View style={styles.monitorRow}>
                  <Text style={styles.monitorLabel}>Explainability</Text>
                  <Text style={styles.monitorValue}>Grad-CAM Enabled</Text>
                </View>

                <View style={styles.monitorRow}>
                  <Text style={styles.monitorLabel}>Top-2 Uncertainty</Text>
                  <Text style={styles.monitorValue}>Active</Text>
                </View>

                <View style={styles.monitorRow}>
                  <Text style={styles.monitorLabel}>QC Decision Engine</Text>
                  <Text style={styles.monitorValue}>Running</Text>
                </View>

                <View style={styles.monitorRowLast}>
                  <Text style={styles.monitorLabel}>LLM Reporting</Text>
                  <Text style={styles.monitorValue}>Available</Text>
                </View>
              </View>
            </>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7F2" },
  container: { padding: 18, paddingBottom: 110 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F7F2",
  },
  loadingText: { marginTop: 10, color: "#667085", fontSize: 14 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { fontSize: 30, fontWeight: "800", color: "#17301E" },
  subtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 14,
    color: "#6B7A68",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  statusText: { fontSize: 12, fontWeight: "800", color: "#2B5D2A" },
  summaryCard: {
    backgroundColor: "#5E9B59",
    borderRadius: 26,
    padding: 22,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { color: "#EAF5E8", fontSize: 14, fontWeight: "700" },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 6,
  },
  summarySubtext: { color: "#EAF5E8", fontSize: 13, marginTop: 8 },
  summaryRight: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
  },
  summaryMiniLabel: { color: "#EAF5E8", fontSize: 11, fontWeight: "700" },
  summaryMiniValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  overviewGrid: { flexDirection: "row", gap: 12, marginBottom: 20 },
  overviewCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
  },
  overviewLabel: {
    fontSize: 12,
    color: "#7A8877",
    fontWeight: "700",
    marginBottom: 6,
  },
  overviewValue: { fontSize: 15, color: "#17301E", fontWeight: "900" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#17301E",
    marginBottom: 12,
    marginTop: 4,
  },
  decisionRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  decisionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  decisionLabel: {
    fontSize: 11,
    color: "#7A8877",
    fontWeight: "800",
    marginBottom: 5,
  },
  acceptValue: { fontSize: 21, fontWeight: "900", color: "#2B7A3D" },
  reworkValue: { fontSize: 21, fontWeight: "900", color: "#B8791A" },
  rejectValue: { fontSize: 21, fontWeight: "900", color: "#B42318" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },
  expandedCard: { borderWidth: 1, borderColor: "#DCECDC" },
  cardTop: { flexDirection: "row", alignItems: "center" },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E7F3E4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: { color: "#4E8D49", fontWeight: "900", fontSize: 13 },
  cardInfo: { flex: 1 },
  defectTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  defectName: { fontSize: 17, fontWeight: "900", color: "#1E3122" },
  topBadge: {
    backgroundColor: "#F1F6EF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  topBadgeText: { fontSize: 10, color: "#4E8D49", fontWeight: "900" },
  percentText: { marginTop: 4, fontSize: 13, color: "#7A8877" },
  countBadge: {
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#F1F6EF",
    alignItems: "center",
    justifyContent: "center",
  },
  countValue: { fontSize: 18, fontWeight: "900", color: "#2B5D2A" },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: "#E9EFE6",
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#7FB976",
  },
  cardMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  severityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  severityText: { fontSize: 11, fontWeight: "900" },
  lowBadge: { backgroundColor: "#E7F3E4" },
  mediumBadge: { backgroundColor: "#FFF2D6" },
  highBadge: { backgroundColor: "#FEE4E2" },
  lowText: { color: "#2B7A3D" },
  mediumText: { color: "#B8791A" },
  highText: { color: "#B42318" },
  tapHint: { fontSize: 11, color: "#8A9687", fontWeight: "700" },
  expandedContent: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEF3EC",
    paddingTop: 14,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#17301E",
    marginBottom: 12,
  },
  photoRow: {
    paddingRight: 60,
    paddingLeft: 2,
    gap: 16,
  },
  photoItem: {
    width: 100,
    alignItems: "center",
    marginRight: 14,
  },
  photoCircleOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E7F3E4",
  },
  photoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E4EEE2",
  },
  photoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DDEBDD",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderText: {
    color: "#4E8D49",
    fontSize: 26,
    fontWeight: "900",
  },
  photoLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#17301E",
    fontWeight: "900",
    textAlign: "center",
  },
  photoSub: {
    marginTop: 2,
    fontSize: 10,
    color: "#7A8877",
    fontWeight: "700",
    textAlign: "center",
  },
  noImageBox: {
    backgroundColor: "#F7FAF5",
    borderRadius: 16,
    padding: 14,
  },
  noImageTitle: {
    fontSize: 13,
    color: "#17301E",
    fontWeight: "900",
    marginBottom: 5,
  },
  noImageText: {
    fontSize: 12,
    color: "#6B7A68",
    fontWeight: "600",
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: "#F7FAF5",
    borderRadius: 16,
    padding: 13,
    marginTop: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#4E8D49",
    marginBottom: 5,
  },
  infoText: { fontSize: 13, color: "#4F5F4D", lineHeight: 19 },
  detailGrid: { flexDirection: "row", gap: 10, marginTop: 12 },
  detailMiniCard: {
    flex: 1,
    backgroundColor: "#F7FAF5",
    borderRadius: 16,
    padding: 12,
  },
  detailMiniLabel: {
    fontSize: 11,
    color: "#7A8877",
    fontWeight: "800",
    marginBottom: 5,
  },
  detailMiniValue: { fontSize: 18, color: "#17301E", fontWeight: "900" },
  detailMiniValueSmall: { fontSize: 13, color: "#17301E", fontWeight: "900" },
  warningBox: {
    marginTop: 12,
    backgroundColor: "#FFF8E8",
    borderRadius: 14,
    padding: 12,
  },
  warningText: {
    fontSize: 12,
    color: "#8A5A00",
    fontWeight: "700",
    lineHeight: 18,
  },
  monitorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
  },
  monitorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3EC",
  },
  monitorRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 11,
  },
  monitorLabel: { color: "#6B7A68", fontSize: 13, fontWeight: "700" },
  monitorValue: { color: "#17301E", fontSize: 13, fontWeight: "900" },
  emptyBox: { marginTop: 60, alignItems: "center", paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#223126" },
  emptyText: {
    marginTop: 8,
    color: "#7A8877",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});