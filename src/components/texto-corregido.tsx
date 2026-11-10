import * as Device from "expo-device";
import type { ReactNode } from "react";
import { Platform, Text, type TextProps } from "react-native";

type Props = TextProps & {
  children: ReactNode;
};

const necesitaCorreccion =
  Platform.OS === "android" &&
  (Device.brand ?? "").toLowerCase().includes("motorola");

export function TextoCorregido({ children, ...props }: Props) {
  return (
    <Text {...props}>
      {children}
      {necesitaCorreccion && (
        <Text
          style={{
            color: "transparent",
            opacity: 0,
          }}
          accessible={false}
        >
          {" FINAL"}
        </Text>
      )}
    </Text>
  );
}
