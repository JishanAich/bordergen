// Bundles index.html + css + js into one self-contained file (dist/fourier-border-studio.html) for easy sharing.
const fs = require('fs'), path = require('path');
const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Replaces each <link rel="stylesheet"> with an inline <style> holding that file.
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => '<style>\n' + fs.readFileSync(path.join(root, href), 'utf8') + '\n</style>');

// Replaces each <script src> with an inline <script> holding that file (escaping any closing script tag).
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => '<script>\n' + fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'fourier-border-studio.html');
fs.writeFileSync(out, html);
console.log('wrote', out, Math.round(html.length / 1024) + ' KB');
