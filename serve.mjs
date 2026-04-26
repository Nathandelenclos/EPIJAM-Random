import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import handler from './dist/server/server.js'

const port = parseInt(process.env.PORT ?? '3000', 10)
const host = process.env.HOST ?? '0.0.0.0'
const clientDir = resolve('./dist/client')

const mimeTypes = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

function tryServeStatic(pathname, res) {
  try {
    const filePath = resolve(clientDir, '.' + pathname)
    if (!filePath.startsWith(clientDir)) return false
    const stat = statSync(filePath)
    if (!stat.isFile()) return false
    const mime = mimeTypes[extname(filePath)] ?? 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': stat.size })
    createReadStream(filePath).pipe(res)
    return true
  } catch {
    return false
  }
}

const server = createServer(async (req, res) => {
  try {
    const base = `http://${req.headers.host ?? `localhost:${port}`}`
    const url = new URL(req.url ?? '/', base)

    if (tryServeStatic(url.pathname, res)) return

    const headers = new Headers()
    for (const [key, val] of Object.entries(req.headers)) {
      if (Array.isArray(val)) val.forEach((v) => headers.append(key, v))
      else if (val != null) headers.set(key, val)
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const body = hasBody
      ? new ReadableStream({
          start(ctrl) {
            req.on('data', (chunk) => ctrl.enqueue(chunk))
            req.on('end', () => ctrl.close())
            req.on('error', (err) => ctrl.error(err))
          },
        })
      : undefined

    const request = new Request(url, { method: req.method, headers, body, duplex: 'half' })
    const response = await handler.fetch(request)

    response.headers.forEach((value, key) => res.setHeader(key, value))
    res.statusCode = response.status

    if (response.body) {
      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  } catch (err) {
    console.error('[serve] request error:', err)
    if (!res.headersSent) res.writeHead(500)
    res.end()
  }
})

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`)
})
