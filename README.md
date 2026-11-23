# HnDPaY – অ্যান্ড্রয়েড অ্যাপ

## ১. প্রথমবার (একবারই)
1. GitHub-এ একটা **public** রিপো বানাও (private হলে অ্যাপ আপডেট ডাউনলোড করতে পারবে না)।
2. এই ফোল্ডারের সব ফাইল (`.github` ফোল্ডারসহ) রিপোতে `main` ব্রাঞ্চে push করো।
3. **Actions** ট্যাবে "Build APK & Release" চলবে (~৫-৮ মিনিট)।
4. শেষ হলে **Releases** থেকে `HnDPaY.apk` নামিয়ে ফোনে ইনস্টল করো।

## ২. আপডেট কীভাবে হয়
- কোড বদলে `main`-এ push করলেই নতুন ভার্সন (`1.0.<বিল্ড নম্বর>`) নিজে থেকে বিল্ড হয়ে Release-এ যায়।
- ইনস্টল করা অ্যাপ খোলার সময় নতুন Release দেখলে "Update available" শিট আসে → **Update now** চাপলে ডাউনলোড হয়ে ইনস্টলার খোলে।
- Settings → **Check for updates** দিয়ে হাতেও চেক করা যায়।
- বড় ভার্সন বদলাতে `VERSION` ফাইলের সংখ্যা (যেমন `1.0` → `1.1`) বদলাও।

## ৩. সাইনিং কী (গুরুত্বপূর্ণ)
আপডেট ইনস্টল হতে হলে প্রতিবার একই কী দিয়ে সই করতে হয়। `keystore/hndpay.jks` রিপোতে দেওয়া আছে (পাসওয়ার্ড `hndpay-secret`), তাই এখনই কাজ করবে।
রিপো public বলে নিরাপত্তার জন্য নিজের কী বানিয়ে Secrets-এ দিতে পারো:
```
keytool -genkeypair -keystore my.jks -alias hndpay -keyalg RSA -keysize 2048 -validity 36500
base64 -w0 my.jks   # আউটপুট → Secret KEYSTORE_BASE64
```
Secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD` (store ও key পাসওয়ার্ড একই রাখো), `KEY_ALIAS`।
⚠️ কী বদলালে আগের ইনস্টল করা অ্যাপ আনইনস্টল করে নতুনটা বসাতে হবে।

## ফাইল
- `www/` – অ্যাপের UI (তোমার ডেমো + `native.js`)
- `native/` – অ্যান্ড্রয়েড জাভা কোড, আইকন, থিম
- `scripts/patch-android.mjs` – বিল্ডের সময় নেটিভ অংশ বসায়
- `.github/workflows/build-apk.yml` – APK বিল্ড ও Release
