const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IOS_FILE = 'GoogleService-Info.plist';
const ANDROID_FILE = 'google-services.json';

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

/**
 * EAS Build only uploads git-tracked files. Firebase iOS config is gitignored locally,
 * so materialize it from EAS file env vars (or base64 secrets) before prebuild runs.
 */
function materializeFirebaseConfigFiles() {
  const iosTarget = path.join(ROOT, IOS_FILE);
  const androidTarget = path.join(ROOT, ANDROID_FILE);

  copyIfMissing(iosTarget, process.env.GOOGLE_SERVICES_INFO_PLIST);
  writeBase64IfMissing(iosTarget, process.env.GOOGLE_SERVICES_INFO_PLIST_BASE64);

  copyIfMissing(androidTarget, process.env.GOOGLE_SERVICES_JSON);
  writeBase64IfMissing(androidTarget, process.env.GOOGLE_SERVICES_JSON_BASE64);
}

function assertFirebaseConfigForEasBuild() {
  const onEas = process.env.EAS_BUILD === 'true';
  if (!onEas) return;

  const iosTarget = path.join(ROOT, IOS_FILE);
  if (fs.existsSync(iosTarget)) return;

  throw new Error(
    [
      '[Firebase] GoogleService-Info.plist is missing on EAS Build.',
      'The file is gitignored locally, so upload it as an EAS environment file variable:',
      '',
      '  eas env:create --scope project \\',
      '    --name GOOGLE_SERVICES_INFO_PLIST \\',
      '    --type file \\',
      '    --value ./GoogleService-Info.plist \\',
      '    --environment production',
      '',
      'Repeat for preview (and development if needed). Link the variable to each build profile environment in the Expo dashboard.',
      'Alternative: set GOOGLE_SERVICES_INFO_PLIST_BASE64 to the base64-encoded plist contents.',
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
