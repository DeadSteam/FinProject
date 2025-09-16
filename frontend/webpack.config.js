const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = argv.mode === 'development';
  const isLocalDev = process.env.NODE_ENV === 'development';

  // Для локальной разработки всегда проксируем на локальный backend
  const apiProxyTarget = 'http://localhost:8000';
  
  return {
    entry: './src/index.js',
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'static/js/[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? 'static/js/[name].[contenthash].chunk.js' : '[name].chunk.js',
      clean: true,
      publicPath: '/',
    },
    
    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@styles': path.resolve(__dirname, 'src/styles'),
        '@contexts': path.resolve(__dirname, 'src/context'),
        '@types': path.resolve(__dirname, 'src/types'),
      },
      fallback: {
        "events": require.resolve("events"),
        "buffer": false,
        "crypto": false,
        "stream": false,
        "util": false,
        "path": false,
        "fs": false,
        "os": false
      },
    },
    
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true, // Улучшение производительности для локальной разработки
            }
          },
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  auto: (resourcePath) => resourcePath.includes('.module.css'),
                  localIdentName: isProduction 
                    ? '[hash:base64:8]' 
                    : '[name]__[local]--[hash:base64:5]',
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024 // 8kb
            }
          },
          use: [
            {
              loader: 'image-webpack-loader',
              options: {
                mozjpeg: {
                  progressive: true,
                  quality: 65
                },
                // optipng.enabled: false will disable optipng
                optipng: {
                  enabled: true,
                },
                pngquant: {
                  quality: [0.65, 0.90],
                  speed: 4
                },
                gifsicle: {
                  interlaced: false,
                },
                // the webp option will enable WEBP
                webp: {
                  quality: 75
                }
              }
            }
          ],
          generator: {
            filename: 'static/media/[name].[hash][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'static/fonts/[name].[hash][ext]',
          },
        },
      ],
    },
    
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.ico',
        ...(isProduction && {
          minify: {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          }
        })
      }),
      isProduction && new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash].css',
        chunkFilename: 'static/css/[name].[contenthash].chunk.css',
      }),
      process.env.ANALYZE && new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'bundle-report.html',
      }),
      new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /ru|en-gb/),
      new CopyPlugin({
        patterns: [
          { from: 'public/config.js', to: 'config.js' },
          { from: 'public/config.dev.js', to: 'config.dev.js' },
          { from: 'public/config-loader.js', to: 'config-loader.js' },
          { from: 'public/fonts', to: 'static/fonts', noErrorOnMissing: true }
        ],
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.IS_LOCAL_DEV': JSON.stringify(isLocalDev),
      }),
    ].filter(Boolean),
    
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      port: 3000,
      host: '0.0.0.0',
      open: true,
      hot: true,
      historyApiFallback: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          logLevel: 'debug',
          pathRewrite: {
            '^/api': '/api', // Оставляем /api как есть
          },
        },
      },
      client: {
        overlay: {
          warnings: false,
          errors: true,
        },
        progress: true,
        logging: 'info',
      },
      devMiddleware: {
        stats: {
          colors: true,
          chunks: false,
          children: false,
          modules: false,
          assets: false,
        },
      },
    },
    
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            name: 'vendor-react',
            chunks: 'all',
            priority: 40,
          },
          agCharts: {
            test: /[\\/]node_modules[\\/](ag-charts-community|ag-charts-react)[\\/]/,
            name: 'vendor-ag-charts',
            chunks: 'all',
            priority: 35,
          },
          utils: {
            test: /[\\/]node_modules[\\/](xlsx|core-js)[\\/]/,
            name: 'vendor-utils',
            chunks: 'all',
            priority: 30,
          },
          common: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor-common',
            chunks: 'all',
            priority: 20,
          },
          appCommon: {
            test: /[\\/]src[\\/](hooks|utils|context)[\\/]/,
            name: 'app-common',
            chunks: 'all',
            priority: 15,
            minChunks: 2,
          },
          admin: {
            test: /[\\/]src[\\/](pages[\\/]admin|components[\\/]admin)[\\/]/,
            name: 'admin',
            chunks: 'all',
            priority: 10,
            minChunks: 1,
          },
          default: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
      
      runtimeChunk: {
        name: 'runtime',
      },
      
      ...(isProduction && {
        usedExports: true,
        sideEffects: false,
        minimize: true,
      }),
    },
    
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 244000,
      maxEntrypointSize: 244000,
      assetFilter: function(assetFilename) {
        return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
      },
    },
  };
}; 
 
 
 
 
 
 
 