import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import { useDatabase, Message } from "../context/DatabaseContext";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { normalizeNumber } from "./ChatListScreen";

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chat">;

const ChatScreen: React.FC = () => {
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);

  const route = useRoute<ChatScreenRouteProp>();
  const { chatId } = route.params;
  const { getMessages, getJidRawString } = useDatabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [chatId]);
  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      // console.log("Permission status:", status);
      if (status === "granted") {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          // console.log("Loaded contacts:", data.length);
          setContacts(data);
          // console.log("Contacts:", data[0]);
        } else {
          // console.log("No contacts found.");
        }
      } else {
        // console.log("Contacts permission denied");
      }
    })();
  }, []);

  const [contactMap, setContactMap] = useState<{
    [normalizedNumber: string]: string;
  }>({});

  useEffect(() => {
    const map: { [key: string]: string } = {};

    for (const contact of contacts) {
      for (const phoneNumber of contact.phoneNumbers || []) {
        const num = normalizeNumber(phoneNumber.number);
        if (num.length >= 5) {
          map[num] = contact.name;
        }
      }
    }

    setContactMap(map);
  }, [contacts]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const messageList = await getMessages(chatId);
      setMessages(messageList);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (messageDate.getTime() === today.getTime()) {
      return "Today";
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const shouldShowDateSeparator = (
    currentMessage: Message,
    previousMessage?: Message
  ): boolean => {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp);

    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  const getMessageStatus = (status: number): string => {
    switch (status) {
      case 0:
        return "clock"; // Pending
      case 1:
        return "checkmark"; // Sent
      case 2:
        return "checkmark-done"; // Delivered
      case 3:
        return "checkmark-done"; // Read (you might want a different icon)
      default:
        return "help";
    }
  };
  const isGroupChat = (jid: string): boolean => {
    return jid.includes("@g.us");
  };
  const findContactNameFast = (jid: string): string => {
    const phone = normalizeNumber(jid.split("@")[0]);

    // Try finding longest suffix match
    for (let i = 0; i < phone.length - 4; i++) {
      const suffix = phone.slice(i);
      if (contactMap[suffix]) {
        return contactMap[suffix];
      }
    }

    return phone; // fallback
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isFromMe = item.key_from_me === 1;
    const previousMessage = index > 0 ? messages[index - 1] : undefined;
    const showDateSeparator = shouldShowDateSeparator(item, previousMessage);

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isFromMe ? styles.sentMessage : styles.receivedMessage,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isFromMe ? styles.sentBubble : styles.receivedBubble,
            ]}
          >
            {!isFromMe && !isGroupChat(item.key_remote_jid) && (
              <Text style={styles.senderName}>
                {findContactNameFast(item.key_remote_jid)}
              </Text>
            )}
            {!isFromMe && isGroupChat(item.key_remote_jid) && (
              <Text style={styles.senderName}>
                {findContactNameFast(getJidRawString(item.sender_jid_row_id))}
              </Text>
            )}

            <Text
              style={[
                styles.messageText,
                isFromMe ? styles.sentText : styles.receivedText,
              ]}
            >
              {item.data || "[Media message]"}
            </Text>

            {item.media_caption && (
              <Text
                style={[
                  styles.messageText,
                  isFromMe ? styles.sentText : styles.receivedText,
                  styles.caption,
                ]}
              >
                {item.media_caption}
              </Text>
            )}

            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.timestamp,
                  isFromMe ? styles.sentTimestamp : styles.receivedTimestamp,
                ]}
              >
                {formatTime(item.timestamp)}
              </Text>

              {isFromMe && (
                <Ionicons
                  name={getMessageStatus(item.status)}
                  size={16}
                  color={item.status >= 3 ? "#4fc3f7" : "#999"}
                  style={styles.statusIcon}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075e54" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No messages found</Text>
        <Text style={styles.emptySubtext}>This chat appears to be empty</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id.toString()}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
        inverted={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e5ddd5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5ddd5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5ddd5",
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
  messagesList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 10,
  },
  dateText: {
    backgroundColor: "#dcf8c6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    color: "#666",
    overflow: "hidden",
  },
  messageContainer: {
    marginVertical: 2,
  },
  sentMessage: {
    alignItems: "flex-end",
  },
  receivedMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 8,
    borderRadius: 8,
    position: "relative",
  },
  sentBubble: {
    backgroundColor: "#dcf8c6",
    borderTopRightRadius: 2,
  },
  receivedBubble: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#075e54",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: "#000",
  },
  receivedText: {
    color: "#000",
  },
  caption: {
    fontStyle: "italic",
    marginTop: 4,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    marginLeft: 4,
  },
  sentTimestamp: {
    color: "#999",
  },
  receivedTimestamp: {
    color: "#999",
  },
  statusIcon: {
    marginLeft: 4,
  },
});

export default ChatScreen;
