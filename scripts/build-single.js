/* Bundles index.html + css + js into dist/investment-calculator.html (one file, for emailing or hosting).
   Run with: npm run build */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}</style>`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, p) => `<script>\n${read(p)}</script>`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'investment-calculator.html'), html);
console.log('Wrote dist/investment-calculator.html (' + html.length + ' bytes)');
