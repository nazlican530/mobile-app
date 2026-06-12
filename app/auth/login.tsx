import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL = "http://192.168.1.105:8000";


const BG_IMAGE =
  "https://images.unsplash.com/photo-1565610222536-ef125c59da2f?auto=format&fit=crop&w=1400&q=80";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string" ? data.detail : "Login failed"
        );
      }

      await SecureStore.setItemAsync("token", data.access_token);

      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.replace("/")}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={34} color="#5E9B59" />
            </View>

            <Text style={styles.appName}>Industrial Defect Control</Text>
            <Text style={styles.subtitle}>
              Sign in to review inspections, Grad-CAM outputs, and quality history
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Login</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#6E7E68" />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#8C938A"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#6E7E68" />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#8C938A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              onPress={login}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/auth/register")}
              activeOpacity={0.85}
            >
              <Text style={styles.registerText}>
                Don&apos;t have an account? Register
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/")}
              activeOpacity={0.85}
            >
              <Text style={styles.backText}>Go back to History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#DDE4DA",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 18, 0.55)",
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  historyButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  historyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: "center",
    marginBottom: 22,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 24,
    borderRadius: 26,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
    color: "#1F2A1E",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F7F2",
    borderWidth: 1,
    borderColor: "#D7E0D3",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 54,
    gap: 10,
  },
  input: {
    flex: 1,
    color: "#1F2A1E",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#5E9B59",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
  },
  registerText: {
    marginTop: 16,
    textAlign: "center",
    color: "#4F8F4C",
    fontWeight: "700",
    fontSize: 14,
  },
  backText: {
    marginTop: 12,
    textAlign: "center",
    color: "#5E6B58",
    fontSize: 14,
    fontWeight: "600",
  },
});