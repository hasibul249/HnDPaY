// Runs in CI after `npx cap add android`: injects native plugin, icons, manifest + version.
import fs from 'node:fs';
import path from 'node:path';

const main = 'android/app/src/main';
const pkgDir = path.join(main, 'java/com/hndpay/app');
const need = (c, m) => { if (!c) { console.error('PATCH FAILED: ' + m); process.exit(1); } };

fs.cpSync('native/res', path.join(main, 'res'), { recursive: true, force: true });
fs.mkdirSync(pkgDir, { recursive: true });
for (const f of fs.readdirSync('native/java')) fs.copyFileSync(path.join('native/java', f), path.join(pkgDir, f));

const mf = path.join(main, 'AndroidManifest.xml');
let m = fs.readFileSync(mf, 'utf8');
if (!m.includes('REQUEST_INSTALL_PACKAGES')) {
  need(m.includes('<application'), 'manifest has no <application');
  m = m.replace('<application', '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n    <application');
}
fs.writeFileSync(mf, m);

const gf = 'android/app/build.gradle';
let g = fs.readFileSync(gf, 'utf8');
const ver = process.env.APP_VERSION, code = process.env.APP_CODE;
need(ver && code, 'APP_VERSION / APP_CODE missing');
need(/versionCode\s+\d+/.test(g) && /versionName\s+"[^"]*"/.test(g), 'versionCode/versionName not found in build.gradle');
g = g.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${ver}"`);
fs.writeFileSync(gf, g);
console.log(`Patched OK -> ${ver} (${code})`);
