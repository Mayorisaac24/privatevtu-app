# PrivateVTU Expo App

A premium VTU (Virtual Top-Up) mobile app built with Expo + React Native.

## Features
- 🔐 Secure auth with OTP + PIN
- 💳 Wallet with balance & transaction history
- 📱 Airtime purchase (MTN, GLO, Airtel, 9Mobile)
- 📶 Data bundle purchase
- ⚡ Electricity bill payment with meter verification
- 💸 Bank transfers
- 👤 Profile & settings with biometric support

## Setup (Run these commands in order — NO extra flags needed)

```bash
# 1. Install dependencies (ONE command, no flags needed)
npm install

# 2. Start the dev server
npx expo start

# 3. Press 'i' for iOS simulator, 'a' for Android emulator, or scan QR with Expo Go
```

## Environment
The API URL is set in `.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://privatevtu-backend.onrender.com/api/v1
```
Expo SDK 52 automatically reads `EXPO_PUBLIC_*` variables — no extra plugin needed.

## Tech Stack
- Expo SDK 52
- Expo Router v4 (file-based navigation)
- React Native 0.76
- Zustand (state management)
- expo-secure-store (token storage)
- @expo/vector-icons (Ionicons)

## Why This Rebuild Works
The original app failed because `react-native-screens` had a broken postinstall
script (`cd react-navigation && yarn`) that does not exist in the installed folder.
This rebuild:
1. Uses `react-native-screens ~4.4.0` which has no broken postinstall
2. Uses Expo SDK 52 with fully compatible peer deps
3. Uses `EXPO_PUBLIC_*` env vars (no babel-plugin-dotenv needed)
4. Clean file-based routing with expo-router v4
