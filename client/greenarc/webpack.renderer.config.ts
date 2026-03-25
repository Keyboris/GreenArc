import type { Configuration } from 'webpack';
import { DefinePlugin } from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins: [
    ...plugins,
    new DefinePlugin({
      CESIUM_BASE_URL: JSON.stringify('../cesiumStatic'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Workers'),
          to: 'cesiumStatic/Workers',
        },
        {
          from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Assets'),
          to: 'cesiumStatic/Assets',
        },
        {
          from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/ThirdParty'),
          to: 'cesiumStatic/ThirdParty',
        },
        {
          from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Widgets'),
          to: 'cesiumStatic/Widgets',
        },
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    alias: {
      cesium$: path.join(__dirname, 'node_modules/cesium/Source/Cesium.js'),
    },
    mainFields: ['browser', 'module', 'main'],
    fallback: {
      path: false,
    },
  },
};
