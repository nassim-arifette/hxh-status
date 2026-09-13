import http from "node:http";
import net from "node:net";

// Keep Next's hot reload and the Cloudflare-backed game API on one browser origin.
// Bind to loopback so this development-only proxy is never exposed on the LAN.
const frontend = new URL("http://localhost:3000");
const game = new URL("http://localhost:8790");
const port = 3001;

function targetFor(path = "") {
  return path.startsWith("/api/game/") ? game : frontend;
}

function forwardedHeaders(request, target) {
  return {
    ...request.headers,
    host: target.host,
    ...(request.headers.origin ? { origin: target.origin } : {}),
  };
}

const server = http.createServer((request, response) => {
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
  console.log(`Live prediction preview: http://localhost:${port}/predictions`);
});
