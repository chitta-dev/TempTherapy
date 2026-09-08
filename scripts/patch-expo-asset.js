const fs = require('fs');
const path = require('path');

const targetPaths = [
  path.join(__dirname, '..', 'node_modules', 'expo-asset', 'build', 'ExpoAsset.js'),
  path.join(__dirname, '..', 'apps', 'mobile', 'node_modules', 'expo-asset', 'build', 'ExpoAsset.js')
];

for (const targetFile of targetPaths) {
  if (fs.existsSync(targetFile)) {
    let content = fs.readFileSync(targetFile, 'utf8');
    if (content.includes("const AssetModule = requireNativeModule('ExpoAsset');")) {
      content = content.replace(
        "const AssetModule = requireNativeModule('ExpoAsset');",
        "let AssetModule;\ntry {\n  AssetModule = requireNativeModule('ExpoAsset');\n} catch (e) {\n  AssetModule = { downloadAsync: async (url) => url };\n}"
      );
      fs.writeFileSync(targetFile, content, 'utf8');
      console.log(`[patch-expo-asset] Patched ${targetFile}`);
    } else {
      console.log(`[patch-expo-asset] Already patched: ${targetFile}`);
    }
  }
}
