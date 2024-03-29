import * as path from 'path';
import * as webpack from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin  from'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const isProduction = process.env.NODE_ENV === 'production';

let config: webpack.Configuration = {
  // Mode is forced to production because chrome does not allow unsafe-eval in extensions.
  mode: 'production',
  entry: {
    background: path.resolve(__dirname, '..', 'src', 'background.ts'),
    description: path.resolve(__dirname, '..', 'src', 'description.ts'),
    popup: path.resolve(__dirname, '..', 'src', 'popup', 'popup.ts'),
    options: path.resolve(__dirname, '..', 'src', 'options', 'options.ts'),
  },
  output: {
    path: path.join(__dirname, '../dist'),
    filename: '[name].bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.css', '.scss'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/,
        use: [
          // Creates `style` nodes from JS strings
          // Fallback to style-loader in development
          /*
          */
          !isProduction ? 'style-loader' : MiniCssExtractPlugin.loader,
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
              sassOptions: {
                outputStyle: 'compressed',
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: '.',
          to: '.',
          context: 'public'
        }
      ]
    }),
    // Generate popup page
    new HtmlWebpackPlugin({
      filename: 'popup.html',
      template: 'src/popup/index.html',
      chunks: ['popup'],
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: true,
        removeRedundantAttributes: false,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
      }
    }),
    // Generate options page
    new HtmlWebpackPlugin({
      filename: 'options.html',
      template: 'src/options/index.html',
      chunks: ['options']
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
  ],
};

if (!isProduction) {
  config = {
    ...config, ...{
      optimization: {
        minimize: false
      }
    }
  };
}

// noinspection JSUnusedGlobalSymbols
export default config;
