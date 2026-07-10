import express from 'express';
import path from 'path';
import { exec } from 'child_process';

const app = express();
// Default port for desktop app
const PORT = 4000;

// Determine directory for static files (works inside pkg snapshot and local node)
const isPkg = typeof process !== 'undefined' && (process as any).pkg;
const publicPath = isPkg 
  ? path.join(__dirname, 'dist') 
  : path.join(process.cwd(), 'dist');

app.use(express.static(publicPath));

// API health endpoint (optional)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: isPkg ? 'desktop-pkg' : 'node' });
});

// Fallback to index.html for React SPA Routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log('====================================================');
  console.log(`🚀 برنامه با موفقیت اجرا شد!`);
  console.log(`🌐 در حال باز کردن مرورگر در آدرس: http://127.0.0.1:${PORT}`);
  console.log('====================================================');

  // Command to automatically open default browser
  const url = `http://127.0.0.1:${PORT}`;
  let command = '';
  switch (process.platform) {
    case 'win32':
      command = `start ${url}`;
      break;
    case 'darwin':
      command = `open ${url}`;
      break;
    default:
      command = `xdg-open ${url}`;
      break;
  }
  
  exec(command, (err) => {
    if (err) {
      console.log(`⚠️ عدم امکان باز کردن خودکار مرورگر. لطفاً دستی آدرس زیر را وارد کنید:\n${url}`);
    }
  });
});
