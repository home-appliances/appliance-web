require('dotenv').config()

module.exports = {
  env: {
    NODE_ENV: '"development"'
  },
  defineConstants: {
    'process.env.API_HOST': JSON.stringify('127.0.0.1'),
    'process.env.API_PORT': JSON.stringify('3000'),
    'process.env.API_ORIGIN': JSON.stringify(process.env.API_ORIGIN || 'http://localhost:3000')
  },
  mini: {},
  h5: {}
}
