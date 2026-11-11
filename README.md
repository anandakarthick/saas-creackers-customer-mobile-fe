# Crackers Customer App (native)

A **native** React Native shopping app for customers — real native screens
(not a website wrapper). It is a **separate, shared** app: one codebase serves
every shop. The store is resolved at runtime from the injected
`tenant-config.json` (same mechanism as the staff app), so each tenant gets its
own branded build (Crackers, Clothing, …) from this one project.

Created by cloning the staff app's working native base (Firebase, the
`TenantConfigModule`, Gradle, signing) and building a fresh customer UI under
[`src/customer/`](src/customer).

## How it works
- On launch, `initStoreApi()` reads `tenant-config.json` → sets the API base URL
  and the `x-tenant-slug` header (which shop).
- Screens call the **public** `/api/store/*` endpoints. **No login** — browsing
  and checkout are guest; orders are tracked by phone number.

## Structure
```
src/customer/
  api/client.ts        axios + tenant base URL + x-tenant-slug + envelope unwrap
  api/storefront.ts    typed calls: store info, categories, products, order, track
  store/cartStore.ts   zustand cart, persisted to AsyncStorage
  components/ProductCard.tsx
  navigation/RootNavigator.tsx   bottom tabs (Home/Shop/Cart/Track) + Product/Checkout stack
  screens/HomeScreen.tsx         store header + categories + featured
  screens/ShopScreen.tsx         product grid + search (by category)
  screens/ProductScreen.tsx      detail + qty + add to cart
  screens/CartScreen.tsx         cart + quantities + subtotal
  screens/CheckoutScreen.tsx     address + payment method + online/COD order
  components/PaymentWebView.tsx  gateway redirect modal (catches return → verify)
  screens/TrackOrderScreen.tsx   track by phone (+ order number)
  theme.ts  lib.ts
App.tsx   mounts the customer app (providers + tenant bootstrap)
```

## Build & run (Android)
```bash
npm install
npm run android                       # dev on a device/emulator
# release:
cd android && ./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```
For a bare local test build (no injected config) set `FALLBACK_BASE` and
`FALLBACK_SLUG` in [`src/customer/api/client.ts`](src/customer/api/client.ts)
to the store you want to open.

## Done (v1)
- Store home (logo/name/announcement), categories, featured products
- Shop: product grid + search, per category
- Product detail + quantity + add to cart
- Cart (persisted) with quantity edit / remove / subtotal
- Checkout: address form, **payment-method selection**, **online payment**
  (store gateway, redirect flow in a secure WebView) **+ Cash-on-Delivery**
- Track order by phone (+ optional order number)
- Push notifications carried over from the staff base (Firebase + Notifee)

## Pending / next
- **Verify online payment end-to-end on a device** — the gateway redirect flow
  is coded (uses `react-native-webview` for the gateway page), but needs a real
  device + a store with an active online gateway to confirm the return-URL
  interception + `verifyPayment` round-trip.
- **Product variants (size/colour)** — needed for Clothing tenants; show a
  variant picker when a product has variants. (Crackers don't use variants.)
- Offers / Deal Products screens, home banner carousel, coupons on checkout.
- **Per-tenant delivery**: backend needs a *second* APK template slot +
  a "Download Customer App" button (reuse `apk.service.ts`).
- **iOS**: `ios/` exists but is unconfigured (needs a Mac: `pod install`,
  Firebase plist, icons).

## Notes
- `applicationId` is still `com.saasmobile` so the bundled `google-services.json`
  / Firebase push keep working. To install alongside the staff app on one phone,
  change `applicationId` + register the new package in Firebase.
- The clone still carries the staff app's dependencies in `package.json`; the
  customer bundle only imports `src/customer/*` + `src/utils/tenantConfig`, so
  staff JS isn't bundled. You can slim the dependency list later.
- `app.json` `displayName` = "Cracker Shop"; keep `name` = "Cracker1" (must match
  the native registered component).
