import { createServer } from 'node:http'
import handler from './dist/server/server.js'

const port = parseInt(process.env.PORT ?? '3000', 10)
const host = process.env.HOST ?? '0.0.0.0'

const server = createServer(async (req, res) => {
  try {
    const base = `http://${req.headers.host ?? `localhost:${port}`}`
    const url = new URL(req.url ?? '/', base)

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
