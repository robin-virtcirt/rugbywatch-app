# WatchRugby — final build notes and submission checklist
#
# This file is the master checklist for submitting the app to the stores.
# Keep it with the app; update it as you go.
#
# --- App identity ---
# App name (both stores): "WatchRugby"
# Bundle ID / package name: com.robinfarrell.watchrugby
# (Matches capacitor.config.ts:appId)
#
# --- Where the live web app is (until domain is live) ---
# Site URL: https://robin-virtcirt.github.io/
# Privacy policy on site: https://robin-virtcirt.github.io/privacy.html
# (Once watchrugby.ie is live, point both at watchrugby.ie and update
#  the store metadata (privacy URL, support URL, promotional text) to the
#  new domain.)
#
# --- Domain status ---
# Target domain: watchrugby.ie
# Registrar: Maxer (cheapest reliable .ie — €18.49 + VAT/year first year,
#   €19.49 + VAT/year renewal; IE-accredited; buy at maxer.com)
# You do the purchase. Once bought:
#   1. Point DNS at GitHub Pages (CNAME → robin-virtcirt.github.io) OR
#      set an A record to GitHub Pages IPs (185.199.108.153,
#      185.199.109.153, 185.199.110.153, 185.199.111.153).
#   2. Add a CNAME file to the repo root: watchrugby.ie
#   3. In the GitHub repo Settings → Pages → Custom domain, set
#      watchrugby.ie, and enable HTTPS.
#   4. Wait for the domain to be live (can take up to 24h).
#   5. Update the app's privacy URL, support URL, and the store listings
#      to use https://watchrugby.ie/...
#
# --- AdMob ---
# - AdMob App ID for ANDROID: replace the placeholder in
#     android/app/src/main/AndroidManifest.xml (meta-data
#     com.google.android.gms.ads.APPLICATION_ID) AND the init call in
#     www/js/app.js (id) with YOUR real AdMob Android App ID.
#   The current placeholder is the Google test ID
#   (ca-app-pub-3940256099946549/1034747911) — works for testing but is
#   not monetised. Replace with your own before release.
# - AdMob App ID for IOS: replace the placeholder in ios/App/App/Info.plist
#   (GADApplicationIdentifier) AND the init call in www/js/app.js with
#   YOUR real AdMob iOS App ID. The iOS placeholder is also the test ID.
# - The consent gate (accept/reject non-essential) is wired in app.js:
#   loadConsent() → renderConsentUI() → loadAds(). If consent === 'reject',
#   hideAdSlots() is called and no ad placeholders show. If 'accept', the
#   placeholders show. In production, replace placeholders with real AdMob
#   calls (google.ads.consent, AdMob banner/interstitial SDK calls).
# - For EEA users, AdMob has its own consent SDK (google.ads.consent).
#   Wire it up in app.js if you want per-user EEA consent beyond the simple
#   accept/reject gate. The simple gate is a reasonable v1.
#
# --- GDPR ---
# - The privacy policy (www/privacy.html) is the controlling document.
#   It states: no personal data collected to serve ads; advert identifiers
#   used only for ad delivery if you accept; planning grid saves to device
#   only; analytics optional and anonymous.
# - The consent gate is the operational control: user accepts or rejects
#   non-essential ads before they load.
# - Minimisation: the app does not ask for location, contacts, camera, etc.
# - Data retention: consent stored on device (localStorage); no server.
# - For EEA: the simple accept/reject gate satisfies the ePrivacy
#   requirement for non-essential cookies/ads at v1. If you add analytics
#   that uses cookies/pseudonymous identifiers, add a CMP or a more detailed
#   consent flow.
#
# --- App icons ---
# - Android: generated from android/app/src/main/res/mipmap-* and the
#   adaptive icon (android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
#   + ic_launcher_round.xml). Replace the foreground PNGs with real icons
#   before release. The foreground colour is green (#16722e) with a rugby
#   ball motif — use your designer or the supplied placeholder.
# - iOS: generated from ios/App/App/Resources/AppIcon.appiconset/Contents.json
#   and the PNGs in that folder. Replace with real icons (1024x1024 source).
# - The placeholder icons are green circles with a rugby ball — acceptable for
#   development, not for store submission. Replace before you submit.
#
# --- Screenshots ---
# - Android store screenshots: rugbywatch-app/assets/playstore/*.png
#   (phone screenshots 1-6, 7-inch tablet, 10-inch tablet wide).
# - iOS store screenshots: rugbywatch-app/assets/appstore/*.png
#   (6 phone screenshots, 3 iPad wide screenshots).
# - Screenshots were generated from the live site at
#   https://robin-virtcirt.github.io/ using Playwright. They show the
#   current data — replace with real screenshots that match the current
#   fixture data before submission, or regenerate after you update the data.
#
# --- Store listings (both stores) ---
# App name: WatchRugby
# Description (short): Irish rugby fixtures, kick-off times, and pub
#   watchability — for all the Irish teams and tournaments, including
#   European competition. Free, no login.
# Description (full): (see below — copy from the app's home screen copy,
#   expanded).
# Keywords: Irish rugby, Ireland rugby, Six Nations, Rugby World Cup, URC,
#   Leinster, Munster, Ulster, Connacht, Champions Cup, Challenge Cup, pub,
#   fixtures, kick-off times
# Category: Sports (both stores)
# Content rating: Suitable for all ages (no objectionable content; rugby is
#   sport). If the store asks for a more detailed rating, complete it.
#
# Privacy policy URL: https://robin-virtcirt.github.io/privacy.html
#   (or https://watchrugby.ie/privacy.html once live)
# Support URL: https://robin-virtcirt.github.io/ (or the new domain)
# Marketing URL: (optional — leave blank for now)
#
# --- Store submission checklist ---
# [ ] Buy watchrugby.ie at Maxer, point at GitHub Pages, enable HTTPS.
# [ ] Create AdMob app (or use an existing one) and get the Android + iOS
#     App IDs. Replace the placeholders in the code.
# [ ] Replace the app icons with real icons (Android + iOS).
# [ ] Generate fresh screenshots from the live app/site and replace the
#     placeholder screenshots in assets/playstore/ and assets/appstore/.
# [ ] Write the full store description (copy from the app copy on the home
#     screen, plus a short note about GDPR and the privacy policy).
# [ ] Android: open Play Console, create the app (or use existing), fill in
#     the store listing (name, description, screenshots, privacy policy URL,
#     content rating, pricing = free), set up the signing key (upload a GPG
#     key or let Play Console manage it), and submit for review.
#     - Signing: Play Console can manage the app signing key for you (recommended
#       for a first app). If you want to manage your own, generate an upload key
#       and upload the certificate.
#     - Target API level: the build.gradle targetSdkVersion should be a recent
#       API level (34+). Capacitor's default is recent enough; verify.
# [ ] iOS: open App Store Connect, create the app (or use existing), fill in
#     the metadata (name, description, screenshots, privacy policy URL,
#     content rating, pricing = free), set up the signing (Xcode archive +
#     upload), and submit for review.
#     - Signing: you need an Apple Developer account (you said you have one)
#       and a signing certificate + provisioning profile. Xcode can manage
#       these for you (automatic signing) — easiest for a first app.
#     - App tracking: the app does not need ATT for AdMob alone, but if you
#       add any third-party tracking, add the ATT capability.
#
# --- Build commands ---
# Android build (on a machine with Android SDK):
#   cd /Users/joker/rugbywatch-app
#   npx cap sync android
#   cd android
#   ./gradlew build
#   # The APK/AAB is in android/app/build/outputs/...
#
# iOS build (on a Mac with Xcode + CocoaPods):
#   cd /Users/joker/rugbywatch-app
#   npx cap sync ios
#   cd ios/App
#   pod install
#   cd /Users/joker/rugbywatch-app
#   npx cap sync ios
#   # Then open ios/App/App.xcworkspace in Xcode, archive, and upload.
#
# --- Test build (debug APK) ---
#   cd /Users/joker/rugbywatch-app/android
#   ./gradlew assembleDebug
#   # APK: android/app/build/outputs/apk/debug/app-debug.apk
#   Install on a device: adb install android/app/build/outputs/apk/debug/app-debug.apk
#
# --- Release build (Android App Bundle) ---
#   cd /Users/joker/rugbywatch-app/android
#   ./gradlew bundleRelease
#   # AAB: android/app/build/outputs/bundle/release/app-release.aab
#
# --- What this machine can't do ---
# This machine has no Android SDK and no Xcode/CocoaPods, so the native builds
# can't be run here. The complete app code, Capacitor config, Android project,
# iOS project (minus the pod install), AdMob wiring, icons, screenshots, and
# submission checklist are all here. You build the native bits on your own
# machine (or a CI with the SDKs).
#
# --- If you want me to do more here ---
# I can:
# - Generate more/fresher screenshots (need a browser + Playwright).
# - Add more fixture data (you give me the fixtures, or I scrape from a source
#   you trust).
# - Wire the real AdMob calls in app.js (once you give me the AdMob App IDs and
#   want the real SDK calls rather than placeholders).
# - Add app analytics (e.g. a privacy-conscious analytics tag) with consent.
# - Add push notifications for kick-offs (needs a push service — e.g. OneSignal
#   or FCM — and native plugin setup).
# - Polish the design (you give me direction; I have the full DOM/CSS in the
#   app).
#
# --- Contact ---
# App owner: Robin Farrell
# Email: [YOUR EMAIL] (put your real email in the privacy policy and store listing)
