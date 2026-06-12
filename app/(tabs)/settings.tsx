import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "http://192.168.1.105:8000";

type MeResponse = {
  email?: string;
  name?: string;
  profile_image?: string;
};

export default function SettingsScreen() {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState<MeResponse | null>(null);
  const [name, setName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

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
    if (selectedImage) return selectedImage;
    return fixImageUrl(userInfo?.profile_image);
  }, [selectedImage, userInfo]);

  const initials = useMemo(() => {
    const source = name.trim() || userInfo?.name?.trim() || "U";
    const parts = source.split(" ").filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [name, userInfo]);

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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to load user"
        );
      }

      setUserInfo(data);
      setName(data?.name ?? "");
      setSelectedImage(null);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMe();
    }, [])
  );

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setSelectedImage(asset.uri);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to pick image");
    }
  };

  const saveProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/auth/login");
        return;
      }

      if (!name.trim()) {
        Alert.alert("Error", "Name cannot be empty");
        return;
      }

      setSaving(true);

      const formData = new FormData();
      formData.append("name", name.trim());

      if (selectedImage) {
        const filename = selectedImage.split("/").pop() || "profile.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const ext = match?.[1]?.toLowerCase() || "jpg";

        formData.append("profile_image", {
          uri: selectedImage,
          name: filename,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
        } as any);
      }

      const res = await fetch(`${API}/auth/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to update profile"
        );
      }

      Alert.alert("Success", "Profile updated");
      setUserInfo(data);
      setSelectedImage(null);
      setName(data?.name ?? name.trim());
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.message ||
          "Profile update failed. Backend tarafında /auth/me PUT endpointi gerekli."
      );
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      setLogoutLoading(true);
      await SecureStore.deleteItemAsync("token");
      setUserInfo(null);
      router.replace("/auth/login");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Logout failed");
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleLogoutConfirm = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5E9B59" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>My Profile</Text>

        <View style={styles.topCard}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={pickImage}
            activeOpacity={0.85}
          >
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}

            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.photoHint}>Tap photo to change profile image</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.readonlyBox}>
            <Text style={styles.readonlyText}>{userInfo?.email ?? "-"}</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.disabledBtn]}
            onPress={saveProfile}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, logoutLoading && styles.disabledBtn]}
            onPress={handleLogoutConfirm}
            activeOpacity={0.85}
            disabled={logoutLoading}
          >
            {logoutLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.logoutText}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#667085",
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 18,
    color: "#111827",
  },
  topCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E5E7EB",
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#DCEFD9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#4F8F4C",
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: "#5E9B59",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  editBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  photoHint: {
    marginTop: 12,
    color: "#667085",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    color: "#7A7A7A",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#F7F9F6",
    borderWidth: 1,
    borderColor: "#E3E8E0",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    color: "#111827",
    fontSize: 15,
  },
  readonlyBox: {
    backgroundColor: "#EEF2ED",
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
    height: 52,
  },
  readonlyText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 22,
    backgroundColor: "#5E9B59",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  logoutBtn: {
    marginTop: 12,
    backgroundColor: "#E53935",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  disabledBtn: {
    opacity: 0.7,
  },
});