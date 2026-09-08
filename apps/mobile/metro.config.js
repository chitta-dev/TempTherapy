const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ignore external apps and build folders
config.resolver.blockList = [
  /.*[\/\\]apps[\/\\]web-admin[\/\\].*/,
  /.*[\/\\]apps[\/\\]backend[\/\\].*/,
  /.*[\/\\]dist[\/\\].*/,
  /.*[\/\\]build[\/\\].*/,
];

module.exports = config;
