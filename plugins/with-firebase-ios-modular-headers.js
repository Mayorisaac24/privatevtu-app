const { withPodfile } = require('@expo/config-plugins');

/** Required for @react-native-firebase/app-check with static iOS linking. */
const TAG = '# @generated firebase-modular-headers';

function withFirebaseIosModularHeaders(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(TAG)) {
      return cfg;
    }
    const block = `
  ${TAG}
  pod 'GoogleUtilities', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true
`;
    if (contents.includes('use_expo_modules!')) {
      contents = contents.replace('use_expo_modules!', `use_expo_modules!${block}`);
    } else {
      contents = `${block}\n${contents}`;
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withFirebaseIosModularHeaders;
