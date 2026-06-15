import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>EAS Workflows repro!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
