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
  View
} from "react-native";

const API_BASE_URL = "http://192.168.1.105:8000";


const BG_IMAGE =
  "https://images.unsplash.com/photo-1565610222536-ef125c59da2f?auto=format&fit=crop&w=1400&q=80";

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const extractError = (data: any) => {
    if (!data) return "Register failed";
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((e: any) => e.msg).join("\n");
    }
    return "Register failed";
  };

  const register = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractError(data));
      }

      if (data.access_token) {
        await SecureStore.setItemAsync("token", data.access_token);
        router.replace("/(tabs)");
        return;
      }

      Alert.alert("Success", "Account created!");
      router.replace("/auth/login");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea}>
        {/* 🔙 History geri */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.replace("/")}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* ÜST TEXT */}
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add-outline" size={32} color="#5E9B59" />
            </View>

            <Text style={styles.titleMain}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join the system and start inspecting defects with AI
            </Text>
          </View>

          {/* CARD */}
          <View style={styles.card}>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#6E7E68" />
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#8C938A"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#6E7E68" />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#8C938A"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
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
              />
            </View>

            <TouchableOpacity
              onPress={register}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Register</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/auth/login")}>
              <Text style={styles.loginText}>
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,18,0.55)",
  },
  safeArea: { flex: 1 },
  topBar: { padding: 18 },

  historyButton: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  historyButtonText: { color: "#fff", fontWeight: "700" },

  content: { flex: 1, justifyContent: "center", padding: 20 },

  hero: { alignItems: "center", marginBottom: 20 },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  titleMain: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
  },
  subtitle: {
    marginTop: 6,
    color: "#E5E7EB",
    textAlign: "center",
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 24,
    borderRadius: 24,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F7F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  input: { flex: 1 },

  button: {
    backgroundColor: "#5E9B59",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.7 },

  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },

  loginText: {
    marginTop: 12,
    textAlign: "center",
    color: "#4F8F4C",
    fontWeight: "600",
  },
});