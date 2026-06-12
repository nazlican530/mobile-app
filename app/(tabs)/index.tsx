import * as ImagePicker from "expo-image-picker";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PredictionReport = {
  defect_description?: string;
  risk_level?: string;
  recommended_action?: string;
  production_impact?: string;
  confidence_interpretation?: string;
};

type Prediction = {
  decision?: string;
  defect?: string;
  confidence?: number;
  severity?: string;
  gradcam_path?: string | null;
  report?: PredictionReport | string | null;
  image_path?: string | null;
};

type MeResponse = {
  email?: string;
  name?: string;
  profile_image?: string | null;
};

const API = "http://192.168.1.105:8000";

export default function MyAnalysisScreen() {
  const router = useRouter(); 
  const params = useLocalSearchParams(); // Kamera ile çekilen fotoğrafın URI'si burada alınır

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<MeResponse | null>(null);

  const cameraImageParam = // pushtan gelenimage burada yakalanıyo
    typeof params.image === "string" ? params.image : null;

  useEffect(() => { // Kameradan gelmiş bir fotoğraf varsa state'e atılıyor ve önceki sonuç temizleniyor
    if (cameraImageParam) {
      setImage(cameraImageParam);
      setResult(null);
    }
  }, [cameraImageParam]);

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

  const profileImageUrl = useMemo(() => { 
    return fixImageUrl(userInfo?.profile_image);
  }, [userInfo]);

  const initials = useMemo(() => { // Profil fotoğrafı yoksa kullanıcının adından veya emailinden baş harfler alınarak avatar oluşturuluyor
    const source = userInfo?.name?.trim() || userInfo?.email?.trim() || "U";
    const parts = source.split(" ").filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [userInfo]);

  const loadMe = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/auth/login");
        return;
      }

      const res = await fetch(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      setUserInfo(data);
    } catch (e) {
      console.log("ME ERROR:", e);
    }
  };

  useFocusEffect(  
    useCallback(() => {
      loadMe();
    }, [])
  );

  const logout = async () => {
    await SecureStore.deleteItemAsync("token");
    setModalVisible(false);
    router.replace("/auth/login");
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); 

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your photos.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({ // Galeri açma
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1], // Kare oranı
    });

    if (!res.canceled && res.assets.length > 0) { // Fotoğraf seçildiyse
      setImage(res.assets[0].uri); 
      setResult(null); 
    }
  };

  const analyzeImage = async () => { 
    if (!image) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Session expired", "Please login again.");
        router.replace("/auth/login");
        return;
      }
      // API'ye fotoğraf gönderme kamerası veya galeriden seçilen fotoğrafın URI'si formData'ya ekleniyor ve POST isteği yapılıyor
      const formData = new FormData(); // FormData oluşturma
      formData.append("file", {  // Fotoğrafı formData'ya ekleme
        uri: image,
        name: "image.jpg", 
        type: "image/jpeg", 
      } as any);

      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json(); // API'den dönen tahmin sonuçları
      console.log("PREDICT RESPONSE:", data);

      if (!res.ok) {
        throw new Error(
          typeof data?.detail === "string" ? data.detail : "Analysis failed"
        );
      }

      setResult({
        defect: data.defect,
        confidence: data.confidence,
        severity: data.severity,
        decision: data.decision,
        gradcam_path: data.gradcam_path,
        report: data.report,
        image_path: data.image_path,
      });
    } catch (e: any) {
      console.log("ANALYZE ERROR:", e);
      Alert.alert("API error", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const decisionColor =
    result?.decision === "REJECT"
      ? "#D32F2F"
      : result?.decision === "REWORK"
        ? "#F57C00"
        : result?.decision === "ACCEPT"
          ? "#2E7D32"
          : "#98A2B3";

  const gradcamUrl = fixImageUrl(result?.gradcam_path);
  const resultImageUrl = fixImageUrl(result?.image_path);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>My Analysis</Text>
            <Text style={styles.subTitle}>
              {userInfo?.name || userInfo?.email || "Logged in user"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.imageBox}>
          {image ? (
            <Pressable onPress={() => setPreviewImage(image)}>
              <Image source={{ uri: image }} style={styles.image} />
            </Pressable>
          ) : (
            <View style={styles.emptyImageBox}>
              <Text style={styles.emptyImageEmoji}>🖼️</Text>
              <Text style={styles.emptyImageText}>No Image Selected</Text>
              <Text style={styles.emptyImageSubText}>
                Choose an image or take a photo to start AI inspection
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={pickImage}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Select Image</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.analyzeBtn}
          onPress={analyzeImage}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Analyze with AI</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#5E9B59" />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        )}

        <View style={styles.resultCard}>
          <Text style={[styles.decision, { color: decisionColor }]}>
            {result?.decision ?? "No Result Yet"}
          </Text>

          <Text style={styles.resultText}>Defect: {result?.defect ?? "-"}</Text>

          <Text style={styles.resultText}>
            Confidence:{" "}
            {typeof result?.confidence === "number"
              ? `${(result.confidence * 100).toFixed(2)}%`
              : "-"}
          </Text>

          <Text style={styles.resultText}>Severity: {result?.severity ?? "-"}</Text>

          {resultImageUrl ? (
            <View style={styles.previewBlock}>
              <Text style={styles.previewTitle}>Uploaded Image</Text>
              <Pressable onPress={() => setPreviewImage(resultImageUrl)}>
                <Image source={{ uri: resultImageUrl }} style={styles.resultPreview} />
              </Pressable>
            </View>
          ) : null}

          {result?.report && typeof result.report === "object" ? (
            <View style={styles.reportBox}>
              <Text style={styles.reportTitle}>Inspection Report</Text>

              <Text style={styles.reportText}>
                Defect Description: {result.report.defect_description ?? "-"}
              </Text>

              <Text style={styles.reportText}>
                Risk Level: {result.report.risk_level ?? "-"}
              </Text>

              <Text style={styles.reportText}>
                Recommended Action: {result.report.recommended_action ?? "-"}
              </Text>

              <Text style={styles.reportText}>
                Production Impact: {result.report.production_impact ?? "-"}
              </Text>

              <Text style={styles.reportText}>
                Confidence Interpretation:{" "}
                {result.report.confidence_interpretation ?? "-"}
              </Text>
            </View>
          ) : result?.report ? (
            <View style={styles.reportBox}>
              <Text style={styles.reportTitle}>Inspection Report</Text>
              <Text style={styles.reportText}>{String(result.report)}</Text>
            </View>
          ) : null}

          {gradcamUrl ? (
            <View style={styles.gradcamBox}>
              <Text style={styles.gradcamTitle}>Grad-CAM Visualization</Text>
              <Pressable onPress={() => setPreviewImage(gradcamUrl)}>
                <Image source={{ uri: gradcamUrl }} style={styles.gradcam} />
              </Pressable>
            </View>
          ) : null}
        </View>

        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.modalAvatar} />
              ) : (
                <View style={styles.modalAvatarFallback}>
                  <Text style={styles.modalAvatarText}>{initials}</Text>
                </View>
              )}

              <Text style={styles.modalName}>{userInfo?.name || "Profile"}</Text>
              <Text style={styles.modalEmail}>{userInfo?.email || "-"}</Text>

              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => {
                  setModalVisible(false);
                  router.push("/settings");
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.profileBtnText}>Open Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={logout}
                activeOpacity={0.85}
              >
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={!!previewImage} transparent animationType="fade">
          <Pressable
            style={styles.previewModal}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F7F2",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#F4F7F2",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#17301E",
  },
  subTitle: {
    marginTop: 5,
    fontSize: 14,
    color: "#6B7A68",
  },
  headerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DDE5D7",
  },
  headerAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DCEFD9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#4F8F4C",
    fontSize: 18,
    fontWeight: "800",
  },
  imageBox: {
    height: 270,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyImageBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyImageEmoji: {
    fontSize: 42,
  },
  emptyImageText: {
    marginTop: 10,
    color: "#223126",
    fontSize: 17,
    fontWeight: "700",
  },
  emptyImageSubText: {
    marginTop: 6,
    color: "#7A8877",
    fontSize: 13,
    textAlign: "center",
  },
  image: {
    width: 320,
    height: 270,
    borderRadius: 22,
  },
  secondaryBtn: {
    backgroundColor: "#7BAE74",
    padding: 15,
    marginTop: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  analyzeBtn: {
    backgroundColor: "#5E9B59",
    padding: 15,
    marginTop: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingBox: {
    marginTop: 22,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#47624D",
    fontSize: 14,
  },
  resultCard: {
    marginTop: 25,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  decision: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  resultText: {
    fontSize: 15,
    color: "#243328",
    fontWeight: "500",
    marginTop: 4,
  },
  previewBlock: {
    marginTop: 18,
    width: "100%",
    alignItems: "center",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    color: "#1E3122",
  },
  resultPreview: {
    width: 220,
    height: 220,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  reportBox: {
    marginTop: 18,
    width: "100%",
    backgroundColor: "#F6FAF4",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1EBDD",
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    color: "#1E3122",
  },
  reportText: {
    fontSize: 14,
    color: "#445347",
    lineHeight: 20,
    marginTop: 4,
  },
  gradcamBox: {
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  gradcamTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    color: "#1E3122",
  },
  gradcam: {
    width: 260,
    height: 260,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    padding: 26,
    borderRadius: 26,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  modalAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#E5E7EB",
    marginBottom: 14,
  },
  modalAvatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#DCEFD9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalAvatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#4F8F4C",
  },
  modalName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17301E",
    marginTop: 2,
  },
  modalEmail: {
    fontSize: 14,
    color: "#6A7868",
    marginTop: 5,
    marginBottom: 18,
    textAlign: "center",
  },
  profileBtn: {
    backgroundColor: "#5E9B59",
    paddingVertical: 12,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  profileBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  logoutBtn: {
    backgroundColor: "#E53935",
    paddingVertical: 12,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  closeBtn: {
    marginTop: 14,
    paddingVertical: 4,
  },
  closeBtnText: {
    color: "#5B6958",
    fontSize: 14,
    fontWeight: "600",
  },
  previewModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "92%",
    height: "72%",
    borderRadius: 16,
  },
});