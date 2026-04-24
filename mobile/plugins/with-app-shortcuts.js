/**
 * Expo config plugin — adds Android static app shortcuts.
 *
 * Long-pressing the app icon on Android 7.1+ reveals a menu with 3 shortcuts:
 * Inbox, Calendar, Settings. Tapping any launches the app and deep-links to
 * the matching tab via the `copticmoscow://<name>` URL scheme.
 *
 * Writes:
 *   android/app/src/main/res/xml/shortcuts.xml
 *   android/app/src/main/res/values/shortcuts_strings.xml       (English)
 *   android/app/src/main/res/values-ar/shortcuts_strings.xml    (Arabic)
 *   android/app/src/main/res/values-ru/shortcuts_strings.xml    (Russian)
 * Adds to AndroidManifest: <meta-data android:name="android.app.shortcuts" ...>
 */

const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PACKAGE = 'church.copticmoscow.app';
const SCHEME = 'copticmoscow';

const SHORTCUTS_XML = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut
      android:shortcutId="inbox"
      android:enabled="true"
      android:icon="@mipmap/ic_launcher"
      android:shortcutShortLabel="@string/shortcut_inbox_short"
      android:shortcutLongLabel="@string/shortcut_inbox_long">
    <intent
        android:action="android.intent.action.VIEW"
        android:data="${SCHEME}://inbox"
        android:targetPackage="${PACKAGE}" />
  </shortcut>

  <shortcut
      android:shortcutId="calendar"
      android:enabled="true"
      android:icon="@mipmap/ic_launcher"
      android:shortcutShortLabel="@string/shortcut_calendar_short"
      android:shortcutLongLabel="@string/shortcut_calendar_long">
    <intent
        android:action="android.intent.action.VIEW"
        android:data="${SCHEME}://calendar"
        android:targetPackage="${PACKAGE}" />
  </shortcut>

  <shortcut
      android:shortcutId="settings"
      android:enabled="true"
      android:icon="@mipmap/ic_launcher"
      android:shortcutShortLabel="@string/shortcut_settings_short"
      android:shortcutLongLabel="@string/shortcut_settings_long">
    <intent
        android:action="android.intent.action.VIEW"
        android:data="${SCHEME}://settings"
        android:targetPackage="${PACKAGE}" />
  </shortcut>
</shortcuts>
`;

const STRINGS = {
  en: {
    shortcut_inbox_short: 'Inbox',
    shortcut_inbox_long: 'Announcements',
    shortcut_calendar_short: 'Calendar',
    shortcut_calendar_long: 'Service schedule',
    shortcut_settings_short: 'Settings',
    shortcut_settings_long: 'Notifications & language',
  },
  ar: {
    shortcut_inbox_short: 'البريد',
    shortcut_inbox_long: 'الإعلانات',
    shortcut_calendar_short: 'التقويم',
    shortcut_calendar_long: 'جدول الخدمات',
    shortcut_settings_short: 'الإعدادات',
    shortcut_settings_long: 'التنبيهات واللغة',
  },
  ru: {
    shortcut_inbox_short: 'Входящие',
    shortcut_inbox_long: 'Объявления',
    shortcut_calendar_short: 'Календарь',
    shortcut_calendar_long: 'Расписание служб',
    shortcut_settings_short: 'Настройки',
    shortcut_settings_long: 'Уведомления и язык',
  },
};

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '\\\'');
}

function buildStringsXml(strings) {
  const entries = Object.entries(strings)
    .map(([k, v]) => `    <string name="${k}">${escapeXml(v)}</string>`)
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
${entries}
</resources>
`;
}

function writeStringsFile(resDir, locale) {
  const suffix = locale === 'en' ? '' : `-${locale}`;
  const dir = path.join(resDir, `values${suffix}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'shortcuts_strings.xml'),
    buildStringsXml(STRINGS[locale]),
  );
}

const withAppShortcuts = (config) => {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const resDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');

      // shortcuts.xml
      const xmlDir = path.join(resDir, 'xml');
      if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'shortcuts.xml'), SHORTCUTS_XML);

      // Localized strings
      for (const locale of Object.keys(STRINGS)) {
        writeStringsFile(resDir, locale);
      }

      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;

    const mainActivity = app.activity?.find((a) => {
      const name = a.$?.['android:name'];
      return name === '.MainActivity' || name?.endsWith('.MainActivity');
    });
    if (!mainActivity) return cfg;

    if (!mainActivity['meta-data']) mainActivity['meta-data'] = [];

    const alreadyDeclared = mainActivity['meta-data'].some(
      (m) => m.$?.['android:name'] === 'android.app.shortcuts',
    );

    if (!alreadyDeclared) {
      mainActivity['meta-data'].push({
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/shortcuts',
        },
      });
    }

    return cfg;
  });

  return config;
};

module.exports = withAppShortcuts;
