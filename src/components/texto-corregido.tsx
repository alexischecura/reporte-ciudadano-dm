import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";

type Props = TextProps & {
  children: ReactNode;
};

export function TextoCorregido({ children, ...props }: Props) {
  return (
    <Text {...props}>
      {children}
      <Text
        style={{
          color: "transparent",
          opacity: 0,
        }}
        accessible={false}
      >
        {" FINAL"}
      </Text>
    </Text>
  );
}
