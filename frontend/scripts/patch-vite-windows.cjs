/*
 * Some restricted Windows environments deny Vite's `net use` child process.
 * Vite only uses it to discover mapped network drives, so treating a blocked
 * call as no mapped drives preserves normal local-drive behaviour.
 */
const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '..', 'node_modules', 'vite', 'dist', 'node', 'chunks', 'dep-BK3b2jBa.js')
if (!fs.existsSync(target)) process.exit(0)
const source = fs.readFileSync(target, 'utf8')
const before = '  exec("net use", (error, stdout) => {'
const after = '  try {\n    exec("net use", (error, stdout) => {'
if (!source.includes(before) || source.includes(after)) process.exit(0)
const patched = source.replace(before, after).replace('    }\n  });\n}\nfunction ensureWatchedFile', '    }\n    });\n  } catch (_) {\n    safeRealpathSync = fs__default.realpathSync.native;\n  }\n}\nfunction ensureWatchedFile')
fs.writeFileSync(target, patched)
