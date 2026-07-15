require('dotenv').config()

module.exports = {
  env: {
    NODE_ENV: '"production"'
  },
  defineConstants: {
    'process.env.API_ORIGIN': JSON.stringify(process.env.API_ORIGIN || '')
  },
  mini: {},
  h5: {}
}
