import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { useDatabase, Chat } from "../context/DatabaseContext";

type ChatListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ChatList"
>;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const { chats } = useDatabase();

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const getDisplayName = (chat: Chat): string => {
    if (chat.subject) {
      return chat.subject;
    }

    const jid = chat.key_remote_jid;
    if (jid.includes("@g.us")) {
      return "Group Chat";
    }

    // Extract phone number from JID
    const phoneNumber = jid.split("@")[0];
    return phoneNumber.replace(/\D/g, "");
  };

  const isGroupChat = (jid: string): boolean => {
    return jid.includes("@g.us");
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        navigation.navigate("Chat", {
          chatId: item.key_remote_jid,
          chatName: getDisplayName(item),
        })
      }
    >
      <View style={styles.avatarContainer}>
        {isGroupChat(item.key_remote_jid) ? (
          <View style={[styles.avatar, styles.groupAvatar]}>
            <Ionicons name="people" size={24} color="#fff" />
          </View>
        ) : (
          <View style={[styles.avatar, styles.contactAvatar]}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {getDisplayName(item)}
          </Text>
          <Text style={styles.timestamp}>{formatDate(item.creation)}</Text>
        </View>

        <Text style={styles.lastMessage} numberOfLines={1}>
          {isGroupChat(item.key_remote_jid)
            ? "Group conversation"
            : "Tap to view messages"}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  if (chats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No chats found</Text>
        <Text style={styles.emptySubtext}>
          Make sure your database file contains chat data
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.key_remote_jid}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatar: {
    backgroundColor: "#128c7e",
  },
  groupAvatar: {
    backgroundColor: "#25d366",
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginLeft: 10,
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

export default ChatListScreen;
