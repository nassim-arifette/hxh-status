import http from "node:http";
import net from "node:net";
import { createPreviewGame } from "./preview-game-api.mjs";

// Disposable, in-memory game for trying the flow. No API call reaches Cloudflare.
// Bind to loopback so this development-only proxy is never exposed on the LAN.
const frontend = new URL("http://localhost:3000");

const port = 3002;
const previewGame = createPreviewGame();

function targetFor() { return frontend; }

function forwardedHeaders(request, target) {
  return {
    ...request.headers,
    host: target.host,
    ...(request.headers.origin ? { origin: target.origin } : {}),
  };
}

const server = http.createServer(async (request, response) => {
  if (request.url.startsWith('/api/game/')) {
    let body='';
    for await (const chunk of request) { body+=chunk; if(body.length>4096) {response.writeHead(413);response.end();return;} }
    const result=await previewGame(new Request('http://'+request.headers.host+request.url,{method:request.method,headers:request.headers,...(['GET','HEAD'].includes(request.method)?{}:{body})}));
    response.writeHead(result.status,Object.fromEntries(result.headers));response.end(await result.text());return;
  }
  const target = targetFor(request.url);
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: target.port,
      method: request.method,
      path: request.url,
      headers: forwardedHeaders(request, target),
    },
    (result) => {
      response.writeHead(result.statusCode ?? 502, result.headers);
      result.pipe(response);
    },
  );

  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502);
    response.end("Preview server unavailable.");
  });
  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
});

server.on("upgrade", (request, socket, head) => {
  const target = targetFor(request.url);
  const upstream = net.connect(Number(target.port), "127.0.0.1");

  upstream.once("connect", () => {
    const headers = Object.entries(forwardedHeaders(request, target))
      .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join("\r\n");
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });

  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Disposable local prediction preview: http://localhost:${port}/predictions`);
});
