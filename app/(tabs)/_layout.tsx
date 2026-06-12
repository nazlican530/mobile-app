import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Redirect, Tabs, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

function CenterCameraButton() {
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync(); // İzin isteme 

    if (status !== "granted") { 
      Alert.alert("Permission required", "Camera permission is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ // Kamera açma
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Sadece fotoğraf
      allowsEditing: false, 
      quality: 1,  
    });

    if (!result.canceled && result.assets && result.assets.length > 0) { // Fotoğraf çekildiyse
      const image = result.assets[0]; //

      router.push({ 
        pathname: "/",
        params: { image: image.uri },
      });
    }
  };

  return (
    <View style={styles.cameraButtonWrapper}>
      <TouchableOpacity
        style={styles.cameraButton}
        activeOpacity={0.85}
        onPress={openCamera}
      >
        <Ionicons name="scan-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    const check = async () => {
      const token = await SecureStore.getItemAsync("token");
      setAuth(!!token);
      setLoading(false);
    };

    check();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
      </View>
    );
  }

  if (!auth) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1E88E5",
        tabBarInactiveTintColor: "#9E9E9E",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
        sceneStyle: styles.sceneStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "My Analysis",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "My History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="scan-dummy"
        options={{
          title: "",
          tabBarButton: () => <CenterCameraButton />,
          tabBarIcon: () => null,
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  sceneStyle: {
    backgroundColor: "#fff",
  },

  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 62,
    paddingTop: 0,
    paddingBottom: 4,
    backgroundColor: "#fff",
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },

  tabBarBackground: {
    flex: 1,
    backgroundColor: "#fff",
  },

  tabBarLabel: {
    fontSize: 9,
    marginTop: 0,
    paddingBottom: 0,
  },

  tabBarItem: {
    paddingTop: 2,
    paddingBottom: 0,
  },

  cameraButtonWrapper: {
    position: "absolute",
    alignSelf: "center",
    top: -22,
    zIndex: 10,
  },

  cameraButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#43A047",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
});