require('dotenv').config()

const path = require('path')
const webpack = require('webpack')
const SriPlugin = require('webpack-subresource-integrity')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const isProduction = process.env.NODE_ENV === 'production'

let devtool = 'cheap-module-source-map'
if (isProduction) {
  devtool = false
}

const webpackConfig = {
  entry: {
    app: './src/index.js'
  },
  devtool,
  output: {
    filename: '[name].js',
    chunkFilename: '[name].[hash:8].bundle.js',
    path: path.resolve(__dirname, 'build'),
    crossOriginLoading: 'anonymous'
  },
  externals: {
    Web3: 'web3'
  },
  module: {
    noParse: [/^react$/],
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      },
      {
        test: /\.svg$/,
        issuer: /\.jsx?$/,
        use: [
          {
            loader: 'babel-loader'
          },
          {
            loader: 'react-svg-loader',
            options: {
              jsx: true // true outputs JSX tags
            }
          }
        ]
      },
      {
        test: /\.svg$/,
        issuer: /\.css$/,
        use: [
          {
            loader: 'file-loader'
          }
        ]
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader'
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: isProduction ? MiniCssExtractPlugin.loader : 'style-loader'
          },
          {
            loader: 'css-loader',
            options: {
              url: () => {
                return true
              }
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: isProduction ? 'file-loader' : 'url-loader',
            options: isProduction ? { name: 'fonts/[name].[ext]' } : {}
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json'],
    modules: [path.resolve(__dirname, 'src/constants'), './node_modules'],
    symlinks: false
  },
  node: {
    fs: 'empty'
  },
  devServer: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    contentBase: [
      path.join(__dirname, 'public'),
      path.join(__dirname, 'src/css')
    ]
  },
  mode: isProduction ? 'production' : 'development',
  plugins: [
    new SriPlugin({
      hashFuncNames: ['sha256', 'sha384'],
      enabled: isProduction
    }),
    new HtmlWebpackPlugin({
      template: 'public/index.html',
      inject: true
    }),
    new webpack.EnvironmentPlugin({
      WEBPACK_BUILD: true,
      NODE_ENV: process.env.NODE_ENV || 'development',
      CLIENT_SENTRY_DSN: process.env.CLIENT_SENTRY_DSN || '',
      TEAM_API_URL: process.env.TEAM_API_URL || 'http://localhost:5000',
      ENABLE_GA: process.env.ENABLE_GA || false,
      INVESTOR_API_URL: process.env.INVESTOR_API_URL || 'http://localhost:5000'
    })
  ],

  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  }
}

if (isProduction) {
  webpackConfig.output.filename = '[name].[hash:8].js'
  webpackConfig.optimization.minimizer = [
    new TerserPlugin({ extractComments: false }),
    new OptimizeCSSAssetsPlugin({})
  ]
  webpackConfig.plugins.push(
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        'app.*.css',
        'app.*.js',
        'app.*.js.map',
        'vendors*',
        'dist/*.bundle.js'
      ]
    }),
    new MiniCssExtractPlugin({ filename: '[name].[hash:8].css' })
  )
  webpackConfig.resolve.alias = {
    'react-styl': 'react-styl/prod.js'
  }
  webpackConfig.module.noParse = [/^(react-styl)$/]
}

module.exports = webpackConfig
