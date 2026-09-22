# WatchRugby — iOS setup notes (for you)
#
# This machine has no CocoaPods and no working Xcode project, so the iOS
# build can't be completed here. Here's exactly what to do on a Mac with
# Xcode installed (Apple Developer account required for the App Store).
#
# --- Prerequisites ---
# 1. Install Xcode from the Mac App Store.
# 2. Open Xcode → Settings → Locations, and ensure Command Line Tools is
#    set to the Xcode version (not a CLI-only toolchain).
# 3. Install CocoaPods:
#       sudo gem install cocoapods
#    or, if you prefer Homebrew:
#       brew install cocoapods
#
# --- Build the iOS project ---
#   cd /Users/joker/rugbywatch-app
#   cd ios/App
#   pod install
#   cd /Users/joker/rugbywatch-app
#   npx cap sync ios
#
# The Xcode project lives at ios/App/App.xcworkspace. Open it:
#   open ios/App/App.xcworkspace
#
# --- AdMob on iOS ---
# Add the AdMob SDK pod to ios/App/Podfile:
#   pod 'Google-Mobile-Ads-SDK'
# Then pod install again.
#
# AdMob App ID lives in Info.plist under GADApplicationIdentifier and in
# the JavaScript init call in www/js/app.js (id: 'ca-app-pub-XXXXXXXXXXXXXXXX').
# The app.js already has the ID wired up; just replace the placeholder.
#
# --- App Store screenshots ---
# Use the screenshots in rugbywatch-app/assets/appstore/:
#   - ios-screenshot-1.png to ios-screenshot-6.png
#   - ios-screenshot-wide-1.png to ios-screenshot-wide-3.png
#
# Replace with real screenshots before submission, or use these as placeholders.
#
# --- Submitting ---
# 1. Open App.xcworkspace in Xcode.
# 2. Select the "App" scheme, set the signing team under Signing & Capabilities,
#    and set the bundle identifier to com.robinfarrell.watchrugby (matches
#    capacitor.config.ts).
# 3. In the Signing & Capabilities tab, add the "App Tracking Transparency"
#    capability if you use any advertising or analytics that requires ATT.
#    For AdMob alone, you typically do NOT need ATT — AdMob uses its own
#    consent flow, not ATT. But if you add any third-party tracking, add it.
# 4. Build and archive: Product → Archive, then upload to App Store Connect.
# 5. In App Store Connect, create a new app, fill in the metadata (see
#    rugbywatch-app/build-notes/store-checklist.md), upload screenshots, set
#    pricing to free, and submit for review.
#
# --- GDPR / privacy on iOS ---
# - The privacy policy URL in App Store Connect must match the one in the app
#   (www/privacy.html on your live site, e.g. https://watchrugby.ie/privacy.html
#   once the domain is live, or https://robin-virtcirt.github.io/privacy.html
#   until then).
# - If you use AdMob, fill in the "Privacy — Data Collection" section in App
#   Store Connect honestly: the app uses advertising identifiers for ad
#   personalisation, and you provide a consent gate for non-essential ads.
# - Apple's guideline 5.1.1 (data collection/deletion) and 3.2.1 (objectionable
#   content) — the app content is fine; just be honest about data.
#
# --- App icon ---
# The iOS app icon is generated from assets/AppIcon.appiconset/Contents.json
# and the PNGs in that folder. Replace them with real icons (1024x1024 source
# PNG) before submission, or use the supplied placeholders.
...[truncated]