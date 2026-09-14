import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './server/app.js';

const PORT = 3000;

// Start Express + Vite Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🐾 PET WORLD Server running on port ${PORT}`);
  });
}

startServer();

export default app;
