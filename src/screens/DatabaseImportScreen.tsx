import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { useDatabase } from "../context/DatabaseContext";

type DatabaseImportScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DatabaseImport"
>;

const DatabaseImportScreen: React.FC = () => {
  const navigation = useNavigation<DatabaseImportScreenNavigationProp>();
  const { loadDatabase, isLoading } = useDatabase();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const pickDatabase = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file.name);

        const success = await loadDatabase(file.uri);
        if (success) {
          Alert.alert("Success", "Database loaded successfully!", [
            {
              text: "OK",
              onPress: () => navigation.navigate("ChatList"),
            },
          ]);
        } else {
          Alert.alert(
            "Error",
            "Failed to load database. Please ensure it's a valid WhatsApp database file."
          );
        }
      }
    } catch (error) {
      console.error("Error picking database:", error);
      Alert.alert("Error", "Failed to pick database file.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="document-text"
          size={80}
          color="#075e54"
          style={styles.icon}
        />

        <Text style={styles.title}>Import WhatsApp Database</Text>
        <Text style={styles.description}>
          Select your decrypted WhatsApp database file (msgstore.db) to view
          your chat history.
        </Text>

        {selectedFile && (
          <Text style={styles.selectedFile}>Selected: {selectedFile}</Text>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={pickDatabase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="folder-open" size={24} color="#fff" />
              <Text style={styles.buttonText}>Select Database File</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Instructions:</Text>
          <Text style={styles.instructionText}>
            1. Ensure you have a decrypted WhatsApp database file (msgstore.db)
          </Text>
          <Text style={styles.instructionText}>
            2. Tap "Select Database File" to choose your file
          </Text>
          <Text style={styles.instructionText}>
            3. Wait for the import to complete
          </Text>
          <Text style={styles.instructionText}>
            4. Browse your chat history!
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#075e54",
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  selectedFile: {
    fontSize: 14,
    color: "#075e54",
    marginBottom: 20,
    fontStyle: "italic",
  },
  button: {
    backgroundColor: "#075e54",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 40,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  instructions: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#075e54",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default DatabaseImportScreen;
