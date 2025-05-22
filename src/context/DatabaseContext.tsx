import React, { createContext, useContext, useState } from "react";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";

export interface Chat {
  key_remote_jid: string;
  subject?: string;
  creation: number;
  last_message_table_id?: number;
}

export interface Message {
  _id: number;
  key_remote_jid: string;
  key_from_me: number;
  key_id: string;
  status: number;
  needs_push: number;
  data: string;
  timestamp: number;
  media_url?: string;
  media_mime_type?: string;
  media_wa_type?: number;
  media_size?: number;
  media_name?: string;
  media_caption?: string;
  remote_resource?: string;
}

interface DatabaseContextType {
  database: SQLite.SQLiteDatabase | null;
  chats: Chat[];
  loadDatabase: (uri: string) => Promise<boolean>;
  getMessages: (chatId: string) => Promise<Message[]>;
  isLoading: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined
);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [database, setDatabase] = useState<SQLite.SQLiteDatabase | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDatabase = async (uri: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const dbName = "msgstore.db";
      const targetDir = `${FileSystem.documentDirectory}SQLite/`;
      const targetPath = `${targetDir}${dbName}`;

      // Ensure the SQLite directory exists
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      }

      // Copy the DB to SQLite directory
      await FileSystem.copyAsync({
        from: uri,
        to: targetPath,
      });

      // Log size to confirm file is valid
      const info = await FileSystem.getInfoAsync(targetPath);
      // console.log(`📦 DB copied to: ${targetPath}`);
      // console.log(`📏 DB size: ${info.size} bytes`);

      const db = SQLite.openDatabaseSync("msgstore.db");
      // console.log("📂 Database path:", targetPath);
      // console.log("📂 Database opened:", db);
      setDatabase(db);
      try {
        const rows = db.getAllSync(
          `SELECT name FROM sqlite_master WHERE type='table'`
        );
        const tables = rows.map((row: any) => row.name);
        // console.log("📋 Tables in the database:", tables);
      } catch (error) {
        console.error("Failed to list tables:", error);
      }
      await loadChats(db);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error loading database:", error);
      setIsLoading(false);
      return false;
    }
  };

  const loadChats = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    try {
      const results = db.getAllSync(
        `SELECT DISTINCT chat._id as id, jid.raw_string as key_remote_jid, chat.subject, 
              chat.created_timestamp as creation,
              chat.last_message_row_id as last_message_table_id
       FROM chat
       INNER JOIN jid ON chat.jid_row_id = jid._id
       ORDER BY chat.sort_timestamp DESC`
      );
      console.log("📋 Chat rows:", results[0]);
      if (results.length === 0) {
        console.log("No chat rows returned.");
        return;
      }

      const chatList: Chat[] = results.map((row: any) => ({
        key_remote_jid: row.key_remote_jid,
        subject: row.subject || getDisplayName(row.key_remote_jid),
        creation: row.creation,
        last_message_table_id: row.last_message_table_id,
      }));

      setChats(chatList);
    } catch (error) {
      console.error("❌ Error loading chats:", error);
    }
  };

  const getMessages = async (chatJid: string): Promise<Message[]> => {
    if (!database) return [];

    try {
      const [result] = database.execSync(
        `SELECT 
            message._id,
            jid.raw_string AS key_remote_jid,
            message.from_me AS key_from_me,
            message.key_id,
            message.status,
            0 AS needs_push,
            IFNULL(message.text_data, '') AS data,
            message.timestamp,
            message_media.file_path AS media_url,
            NULL AS media_mime_type,
            NULL AS media_wa_type,
            NULL AS media_size,
            NULL AS media_name,
            NULL AS media_caption,
            NULL AS remote_resource
         FROM message
         LEFT JOIN chat ON message.chat_row_id = chat._id
         LEFT JOIN jid ON chat.jid_row_id = jid._id
         LEFT JOIN message_media ON message._id = message_media.message_row_id
         WHERE jid.raw_string = ?
         ORDER BY message.timestamp ASC`,
        [chatJid]
      );

      return result.rows as Message[];
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    }
  };

  const getDisplayName = (jid: string): string => {
    if (jid.includes("@g.us")) {
      return "Group Chat";
    }
    return jid.split("@")[0].replace(/\D/g, "");
  };

  return (
    <DatabaseContext.Provider
      value={{
        database,
        chats,
        loadDatabase,
        getMessages,
        isLoading,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
};
