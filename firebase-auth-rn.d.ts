declare module 'firebase/auth' {
  // Minimal typing so TS stops complaining.
  // (At runtime, Firebase provides this for React Native environments.)
  export function getReactNativePersistence(storage: any): any;
}