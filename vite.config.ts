import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import handler from './api/translate.ts';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  return {
    plugins: [
      react(),
      {
        name: 'local-api-translate-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/translate') {
              // Ensure Node http.ServerResponse has Express/Vercel helper functions
              if (!(res as any).status) {
                (res as any).status = function (code: number) {
                  this.statusCode = code;
                  return this;
                };
              }
              if (!(res as any).json) {
                (res as any).json = function (data: any) {
                  this.setHeader('Content-Type', 'application/json');
                  this.end(JSON.stringify(data));
                  return this;
                };
              }

              // Handle GET requests (like diagnostics)
              if (req.method === 'GET') {
                if (!process.env.GEMINI_API_KEY) {
                  const proxyRes = await fetch('https://transrealtime.online/api/translate', { method: 'GET' });
                  res.statusCode = proxyRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  const text = await proxyRes.text();
                  return res.end(text);
                }
                return handler(req, res);
              }

              // Handle POST requests
              if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => {
                  body += chunk;
                });
                req.on('end', async () => {
                  try {
                    // If no local GEMINI_API_KEY, transparently proxy to live Vercel production
                    if (!process.env.GEMINI_API_KEY) {
                      const proxyRes = await fetch('https://transrealtime.online/api/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body,
                      });
                      res.statusCode = proxyRes.status;
                      res.setHeader('Content-Type', 'application/json');
                      const text = await proxyRes.text();
                      return res.end(text);
                    }

                    (req as any).body = body ? JSON.parse(body) : {};
                    await handler(req, res);
                  } catch (err: any) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: err.message }));
                  }
                });
                return;
              }
            }
            next();
          });
        },
      },
    ],
    server: {
      host: true, // Allow external / LAN access for testing on phone
      port: 5173,
    },
  };
});
