# Medicina Catalogue Mobile Application

Mobile client for the Medicine Catalogue management system built with **React Native**, **Expo SDK 57**, and **strict TypeScript**.

---

## Design Reference & Visual Identity

The design system directly implements the visual reference defined in [`docs/ui/mobile-ui-reference.png`](file:///D:/github%20projects/medicina-catalogue/docs/ui/mobile-ui-reference.png):
- **Core Identity:** Clean, modern pharmacy/medicine management interface.
- **Palette:** Deep forest/teal headers (`#085444`), action emerald (`#008060`), crisp surfaces (`#FFFFFF`), light slate background (`#F8FAFC`), and pastel avatar badges (`#FEE2E2`, `#DBEAFE`, `#D1FAE5`, `#EDE9FE`, `#FEF3C7`).
- **Hierarchy:** High priority for **Medicines** and **MR Registry** with direct bottom-tab placement; supporting catalogue (Manufacturers, Compositions, Salts, Batches) organized cleanly under **More**.
- **Role Awareness:** Clear visual indicator for `ADMIN` (golden crown badge `#FEF3C7`/`#D97706`) and restricted commercial pricing / user administration sections.

---

## Technology & Library Stack

| Purpose | Selected Solution | Reason |
| :--- | :--- | :--- |
| **Framework** | React Native `0.86.3` + Expo `57.0.17` | Production-grade mobile foundation |
| **Component System** | Bespoke Design System Primitives | Pixel-perfect alignment with design reference, zero bloat, high performance |
| **Icon Library** | `@expo/vector-icons` (`Ionicons`) | Native vector glyph mapping, zero runtime bloat, matching reference line style |
| **Navigation** | `@react-navigation/native` (`7.x`) + Tabs + Native Stack | 4-tab bottom navigation hierarchy prioritizing Medicines & MRs |
| **Forms & Validation** | `react-hook-form` + `@hookform/resolvers` + `zod` | Lightweight, performant form state management with Zod schema validation |
| **Security & Storage** | `expo-secure-store` | Hardware-backed encrypted JWT token and session storage |
| **HTTP Client** | Centralized `ApiClient` (`fetch`) | Typed request methods and backend `ApiError` mapping |
| **Testing** | Jest `29.x` + `jest-expo` + `@testing-library/react-native` | Smoke, component, and integration unit testing |
| **Code Quality** | Strict TypeScript + ESLint | 100% type safety without `any` or `@ts-ignore` |

---

## Project Structure

```text
mobile/
├── assets/                 # App icons, splash screens, and adaptive assets
├── src/
│   ├── components/         # Reusable UI primitives
│   │   ├── AppHeader.tsx   # Deep teal #085444 reference header
│   │   ├── AppScreen.tsx   # Safe Area container with header/scroll/refresh support
│   │   ├── Avatar.tsx      # Circular initials & pastel category icon chips
│   │   ├── Badge.tsx       # Status & role tags (ADMIN, EMPLOYEE, ACTIVE)
│   │   ├── Button.tsx      # Base multi-variant button (primary, outline, danger, ghost)
│   │   ├── Buttons.tsx     # Variant shortcuts & FloatingActionButton (FAB)
│   │   ├── Card.tsx        # Elevated/bordered surface container
│   │   ├── ConfirmDialog.tsx # Modal confirmation dialog
│   │   ├── Divider.tsx     # Subtle divider line
│   │   ├── EmptyState.tsx  # Empty catalogue placeholder
│   │   ├── ErrorMessage.tsx # Alert error banner
│   │   ├── ErrorState.tsx  # Full-screen error state with retry action
│   │   ├── FilterButton.tsx # Header & list filter controls
│   │   ├── FormField.tsx   # Form label, required star, and field error wrapper
│   │   ├── Icon.tsx        # Semantic icon system using @expo/vector-icons
│   │   ├── ListItem.tsx    # High-density catalogue list item
│   │   ├── LoadingIndicator.tsx # Centered spinner with message
│   │   ├── LoadingSkeleton.tsx  # Skeleton placeholders for loading lists
│   │   ├── LoadingState.tsx     # Full-screen loading state
│   │   ├── SearchInput.tsx # Search bar with search icon & clear button
│   │   ├── SectionHeader.tsx    # Section title with optional action link
│   │   ├── TextInput.tsx   # Input with label, helper, error, and password toggle
│   │   └── index.ts        # Components barrel export
│   ├── config/
│   │   └── env.ts          # Environment reader (ENV.API_BASE_URL)
│   ├── features/
│   │   └── auth/           # Authentication & session domain
│   ├── hooks/
│   │   ├── useRole.ts      # Role helpers (isAdmin, isEmployee)
│   │   └── index.ts
│   ├── lib/
│   │   └── storage.ts      # Hardware-backed SecureStore storage adapter
│   ├── navigation/
│   │   ├── AppNavigator.tsx # Authenticated stack navigator
│   │   ├── AuthNavigator.tsx # Unauthenticated stack (LoginScreen)
│   │   ├── TabNavigator.tsx # 4-tab bottom navigation matching reference
│   │   ├── RootNavigator.tsx # Session-aware top-level router
│   │   └── index.ts
│   ├── screens/            # UI screens matching reference design
│   │   ├── auth/LoginScreen.tsx
│   │   ├── batches/BatchesScreen.tsx
│   │   ├── commercial-details/CommercialDetailsScreen.tsx (Admin guard)
│   │   ├── compositions/CompositionsScreen.tsx
│   │   ├── compositions/CompositionSaltsScreen.tsx
│   │   ├── dashboard/DashboardScreen.tsx
│   │   ├── manufacturers/ManufacturersScreen.tsx
│   │   ├── medicines/MedicinesScreen.tsx
│   │   ├── more/MoreScreen.tsx
│   │   ├── mrs/MrsScreen.tsx
│   │   ├── salts/SaltsScreen.tsx
│   │   └── users/UsersScreen.tsx (Admin guard)
│   ├── services/
│   │   └── api-client.ts   # Centralized HTTP client with typed ApiError handling
│   ├── theme/              # Design tokens matching reference UI
│   │   ├── colors.ts       # Palette (Emerald #008060, Header #085444, Slate, Pastel avatars)
│   │   ├── spacing.ts      # Spacing, borderRadius, componentHeights, and iconSizes
│   │   ├── typography.ts   # Font sizes, weights, and semantic text styles
│   │   ├── theme.ts        # Aggregated theme tokens & elevation shadows
│   │   └── index.ts
│   ├── types/              # TypeScript source-of-truth types
│   │   ├── api.ts          # Request/response contracts & ApiError types
│   │   ├── models.ts       # Domain DTOs matching backend
│   │   └── navigation.ts   # React Navigation ParamList types
│   └── utils/
├── __tests__/              # Automated test suite
├── .env.example            # Environment template
├── App.tsx                 # Root application component
├── app.json                # Expo project manifest
├── jest.config.js          # Jest test runner configuration
├── jest.setup.js           # Jest environment setup and mocks
├── package.json            # Scripts and dependencies
└── tsconfig.json           # Strict TypeScript configuration
```

---

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure `EXPO_PUBLIC_API_BASE_URL`:

   - **Android Emulator / Web / iOS Simulator:**
     ```env
     EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
     ```

   - **Physical Android Device via Wi-Fi (Expo Go):**
     Use your computer's LAN IP address:
     ```env
     EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000/api/v1
     ```

---

## Development Commands

```bash
# 1. Install dependencies
npm install

# 2. Start Expo development server (Metro bundler)
npm start

# 3. Launch on Android (Emulator or connected device)
npm run android

# 4. Launch on Web browser
npm run web

# 5. Run TypeScript typecheck
npm run typecheck

# 6. Run ESLint checks
npm run lint

# 7. Run automated test suite
npm test
```

---

## Architecture & Security Principles

1. **Authentication & Token Security:**
   - Credentials submitted to `POST /api/v1/auth/login`.
   - JWT access tokens stored in hardware-backed encrypted storage via `expo-secure-store`.
   - Automatic session restore on app launch and automatic logout on `401 Unauthorized`.
   - Passwords and JWT strings are never printed or logged.

2. **Role-Aware UI:**
   - Client-side navigation conditionally renders Admin features (`Users`, `Commercial Details`).
   - The backend remains the authoritative security boundary.

3. **Accessibility:**
   - 44px+ minimum touch targets across all buttons and inputs.
   - Screen reader labels (`accessibilityRole`, `accessibilityLabel`) on all interactive and icon controls.
   - High contrast text (`#0F172A` on `#FFFFFF`/`#F8FAFC`).
