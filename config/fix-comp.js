/**
 * 修复所有 json 文件中 comp 自引用问题的 webpack 插件
 */
const fs = require('fs')
const path = require('path')
const SHARE_TIMELINE_PAGES = ['pages/detail/detail.json']

function fixJsonFiles(dir) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      fixJsonFiles(fullPath)
    } else if (entry.name.endsWith('.json')) {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
      let changed = false

      if (content.usingComponents && content.usingComponents.comp) {
        delete content.usingComponents.comp
        changed = true
      }

      const matchPage = SHARE_TIMELINE_PAGES.some(p => fullPath.replace(/\\/g, '/').endsWith(p))
      if (matchPage && !content.enableShareTimeline) {
        content.enableShareTimeline = true
        changed = true
      }

      if (changed) {
        fs.writeFileSync(fullPath, JSON.stringify(content))
        console.log(`✅ 已修复: ${path.relative(process.cwd(), fullPath)}`)
      }
    }
  }
}

class FixCompPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('FixCompPlugin', (compilation, callback) => {
      const distDir = path.resolve(compiler.context, 'dist/weapp')
      fixJsonFiles(distDir)
      callback()
    })
  }
}

module.exports = FixCompPlugin
