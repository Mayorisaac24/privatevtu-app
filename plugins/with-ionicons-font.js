const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Android resolves vector icon fonts by lowercase family name (e.g. ionicons.ttf).
 * expo-font copies the source basename, which breaks on case-insensitive macOS volumes.
 */
function withIoniconsFont(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const source = path.join(projectRoot, 'assets', 'fonts', 'ionicons.ttf');
      const fontsDir = path.join(platformRoot, 'app', 'src', 'main', 'assets', 'fonts');
      const target = path.join(fontsDir, 'ionicons.ttf');

      if (!fs.existsSync(source)) {
        throw new Error(`Missing icon font at ${source}. Run from project root.`);
      }

      fs.mkdirSync(fontsDir, { recursive: true });

      for (const entry of fs.readdirSync(fontsDir)) {
        if (entry.toLowerCase() === 'ionicons.ttf') {
          fs.unlinkSync(path.join(fontsDir, entry));
        }
      }

      fs.copyFileSync(source, target);

      return config;
    },
  ]);
}

module.exports = withIoniconsFont;
