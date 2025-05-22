import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import ChatListScreen from "./src/screens/ChatListScreen";
import ChatScreen from "./src/screens/ChatScreen";
import DatabaseImportScreen from "./src/screens/DatabaseImportScreen";
import { DatabaseProvider } from "./src/context/DatabaseContext";

export type RootStackParamList = {
  DatabaseImport: undefined;
  ChatList: undefined;
  Chat: { chatId: string; chatName: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <DatabaseProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="DatabaseImport"
          screenOptions={{
            headerStyle: {
              backgroundColor: "#075e54",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        >
          <Stack.Screen
            name="DatabaseImport"
            component={DatabaseImportScreen}
            options={{ title: "Import Database" }}
          />
          <Stack.Screen
            name="ChatList"
            component={ChatListScreen}
            options={{ title: "WhatsApp Viewer" }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({ title: route.params.chatName })}
          />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </DatabaseProvider>
  );
}
