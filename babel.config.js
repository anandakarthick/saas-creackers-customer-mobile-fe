module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@features': './src/features',
          '@hooks': './src/hooks',
          '@navigation': './src/navigation',
          '@services': './src/services',
          '@store': './src/store',
          '@theme': './src/theme',
          '@types': './src/types',
          '@utils': './src/utils',
          '@constants': './src/constants',
          '@config': './src/config',
          '@data': './src/data',
        },
      },
    ],
  ],
};
