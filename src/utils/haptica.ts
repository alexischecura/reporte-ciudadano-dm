import * as Haptics from "expo-haptics";

export const vibracionSuave = async (): Promise<void> => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const vibracionExito = async (): Promise<void> => {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};
