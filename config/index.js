// 根据环境变量决定输出目录
const outputRoot = process.env.TARO_ENV === 'h5' ? 'dist/h5' : 'dist/weapp'
const FixCompPlugin = require('./fix-comp')

const config = {
  projectName: 'appliance-search-web',
  date: '2024-6-2',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    375: 2 / 1
  },
  sourceRoot: 'src',
  outputRoot: outputRoot,
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {}
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false
  },
  mini: {
    webpackChain(chain) {
      chain.plugin('fix-comp').use(FixCompPlugin)
    },
    sass: {
      data: `$platform: '${process.env.TARO_ENV}';`
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    sass: {
      data: `$platform: '${process.env.TARO_ENV}';`
    },
    output: {
      filename: 'js/[name].[hash:8].js',
      chunkFilename: 'js/[name].[chunkhash:8].js'
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          designWidth: 750,
          deviceRatio: {
            640: 2.34 / 2,
            750: 1,
            828: 1.81 / 2
          }
        }
      },
      autoprefixer: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    },
    devServer: {
      port: 10086,
      proxy: {
        '/api': {
          target: 'https://fc.cheapgo.top',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
}

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'))
  }
  return merge({}, config, require('./prod'))
}
