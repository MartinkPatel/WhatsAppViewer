import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { useDatabase, Chat } from "../context/DatabaseContext";
import * as Contacts from "expo-contacts";
type ChatListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ChatList"
>;

export const normalizeNumber = (number: string) => {
  return number.replace(/[^0-9]/g, ""); // Remove non-digits
};
// Make sure ContactsList is an array of contacts, not the module itself

const findContactName = (whatsappJid: string, contacts: Array<any>): string => {
  const phone = normalizeNumber(whatsappJid.split("@")[0]);
  for (const contact of contacts) {
    for (const phoneNumber of contact.phoneNumbers || []) {
      const contactNumber = normalizeNumber(phoneNumber.number);
      if (contactNumber.endsWith(phone)) {
        return contact.name || null;
      }
      const temp = contactNumber.replace(/\D/g, ""); // Normalize contact number
      if (phone.endsWith(normalizeNumber(temp)) && temp.length >= 5) {
        return contact.name || null;
      }
    }
  }
  const phoneNumber = whatsappJid.split("@")[0];
  return phoneNumber.replace(/\D/g, "");
};

const ChatListScreen: React.FC = () => {
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      console.log("Permission status:", status);
      if (status === "granted") {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          console.log("Loaded contacts:", data.length);
          setContacts(data);
          console.log("Contacts:", data[0]);
        } else {
          console.log("No contacts found.");
        }
      } else {
        console.log("Contacts permission denied");
      }
    })();
  }, []);

  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const { chats } = useDatabase();

  useEffect(() => {
    setFilteredChats(chats);
    console.log("FilterChats loaded:", filteredChats.length);
  }, [chats]);

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
    if (isGroupChat(chat.key_remote_jid)) {
      return chat.subject || "Group Chat";
    }
    if (chat.subject) {
      // console.log("Using chat subject for display name:", chat.subject);
      // return chat.subject;
      return findContactName(chat.subject, contacts) || chat.subject;
    }

    const jid = chat.key_remote_jid;
    if (jid.includes("@g.us")) {
      return "Group Chat";
    }
    // Extract phone number from JID
    return findContactName(jid, contacts) || jid.split("@")[0];
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

  const handleSearch = () => {
    const text = searchText;
    const normalizedText = text.toLowerCase();
    console.log("Search text:", text);
    console.log(chats.length, "chats loaded for search");

    const filtered = chats.filter((chat) => {
      // const name = getDisplayName(chat).toLowerCase();
      const contactName = findContactNameFast(
        chat.key_remote_jid
      ).toLowerCase();

      return contactName.includes(normalizedText);
    });
    console.log("Filtered chats:", filtered);
    setFilteredChats(filtered);
  };

  const handleCancelSearch = () => {
    setSearchText("");
    setFilteredChats(chats);
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
    // <View style={styles.container}>
    //   <FlatList
    //     data={chats}
    //     renderItem={renderChatItem}
    //     keyExtractor={(item) => item.key_remote_jid}
    //     style={styles.chatList}
    //     showsVerticalScrollIndicator={false}
    //   />
    // </View>
    <View style={styles.container}>
      {/* ✅ Search bar and Cancel */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search by name or number"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={handleCancelSearch}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {filteredChats.length === 0 ? (
        (console.log("No chats found"),
        (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No chats found</Text>
          </View>
        ))
      ) : (
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.key_remote_jid}
          style={styles.chatList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: "#007aff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButton: {
    marginLeft: 10,
  },
  cancelText: {
    color: "#007aff",
    fontSize: 16,
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
