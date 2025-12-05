/// <reference types="expo-router/types" />
/// <reference types="expo/types" />
/// <reference types="react-native" />

declare global {
  namespace ReactNavigation {
    interface RootParamList extends ExpoRouter.RootParamList {}
  }
}
