import * as Device from "expo-device";
import { Platform, Text, type TextProps } from "react-native";

const esMotoE14 =
  Platform.OS === "android" &&
  (Device.brand ?? "").toLowerCase() === "motorola" &&
  (Device.modelName ?? "").toLowerCase() === "moto e14" &&
  (Device.supportedCpuArchitectures ?? []).includes("armeabi-v7a") &&
  !(Device.supportedCpuArchitectures ?? []).includes("arm64-v8a");

export function TextoCorregido({ children, ...props }: TextProps) {
  return (
    <Text {...props}>
      {children}
      {esMotoE14 && (
        <Text style={{ color: "transparent", opacity: 0 }} accessible={false}>
          {" Final"}
        </Text>
      )}
    </Text>
  );
}
