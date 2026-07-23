const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IOS_FILE = 'GoogleService-Info.plist';
const ANDROID_FILE = 'google-services.json';

const IOS_ENV_KEYS = [
  'GOOGLE_SERVICES_INFO_PLIST',
  'GOOGLE_SERVICES_INFOPLIST',
  'GOOGLE_SERVICES_PLIST',
];

const ANDROID_ENV_KEYS = [
  'GOOGLE_SERVICES_JSON',
];

function copyIfMissing(targetPath, sourcePath) {
  if (fs.existsSync(targetPath) || !sourcePath || !fs.existsSync(sourcePath)) {
    return false;
  }
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function writeBase64IfMissing(targetPath, base64Value) {
  if (fs.existsSync(targetPath) || !base64Value?.trim()) {
    return false;
  }
  fs.writeFileSync(targetPath, Buffer.from(base64Value.trim(), 'base64'));
  return true;
}

function materializeFromEnvKeys(targetPath, envKeys, base64Key) {
  for (const key of envKeys) {
    if (copyIfMissing(targetPath, process.env[key])) {
      return true;
    }
  }
  return writeBase64IfMissing(targetPath, process.env[base64Key]);
}

/**
 * EAS Build only uploads git-tracked files. Materialize Firebase config from
 * EAS file env vars when the repo copy is unavailable.
 */
function materializeFirebaseConfigFiles() {
  const iosTarget = path.join(ROOT, IOS_FILE);
  const androidTarget = path.join(ROOT, ANDROID_FILE);

  materializeFromEnvKeys(iosTarget, IOS_ENV_KEYS, 'GOOGLE_SERVICES_INFO_PLIST_BASE64');
  materializeFromEnvKeys(androidTarget, ANDROID_ENV_KEYS, 'GOOGLE_SERVICES_JSON_BASE64');
}

function assertFirebaseConfigForEasBuild() {
  if (process.env.EAS_BUILD !== 'true') return;

  const iosTarget = path.join(ROOT, IOS_FILE);
  if (fs.existsSync(iosTarget)) return;

  const profile = process.env.EAS_BUILD_PROFILE || 'unknown';
  const environment = process.env.EAS_BUILD_ENVIRONMENT || 'not set';

  throw new Error(
    [
      '[Firebase] GoogleService-Info.plist is missing on EAS Build.',
      `Profile: ${profile} | Environment: ${environment}`,
      '',
      'Fix option A (recommended): upload plist as EAS file env var, then rebuild:',
      '  npm run eas:setup-firebase-env',
      '',
      'Fix option B: git add is NOT recommended — GitHub secret scanning flags the API key.',
      'If you already committed the plist, remove it from git and rotate the key:',
      '  git rm --cached GoogleService-Info.plist && git commit -m "Stop tracking Firebase iOS plist"',
    ].join('\n'),
  );
}

materializeFirebaseConfigFiles();
assertFirebaseConfigForEasBuild();

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const base = require('./app.json').expo;

  return {
    expo: {
      ...base,
      ios: {
        ...base.ios,
        googleServicesFile: `./${IOS_FILE}`,
      },
      android: {
        ...base.android,
        googleServicesFile: `./${ANDROID_FILE}`,
      },
    },
  };
};
