import fs from 'node:fs';
import path from 'node:path';
// Run npm run build first. This makes the preview self-contained, including font/logo.
let html=fs.readFileSync('dist/index.html','utf8');
html=html.replace(/<link rel="manifest"[^>]*>/g,'');
html=html.replace(/<link rel="icon"[^>]*>/g,()=>`<link rel="icon" href="data:image/svg+xml;base64,${fs.readFileSync('public/brand/relAI-blue.svg').toString('base64')}">`);
html=html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,url)=>{
 let css=fs.readFileSync(path.join('dist',url.replace(/^\//,'')),'utf8');
 css=css.replace(/url\((['"]?)(\/fonts\/[^)'"\s]+)\1\)/g,(_,q,font)=>`url(data:font/ttf;base64,${fs.readFileSync(path.join('dist',font.slice(1))).toString('base64')})`);
 return `<style>${css.replace(/<\/style/gi,'<\\/style')}</style>`;
});
html=html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,url)=>{
 let js=fs.readFileSync(path.join('dist',url.replace(/^\//,'')),'utf8').replace(/\/\/# sourceMappingURL=.*$/gm,'').replace(/<\/script/gi,'<\\/script');
 for(const asset of fs.readdirSync('public/game').filter(name=>name.endsWith('.png'))){const uri='data:image/png;base64,'+fs.readFileSync(path.join('public/game',asset)).toString('base64');js=js.replaceAll('/game/'+asset,uri);}
 return `<script type="module">${js}</script>`;
});
if(/(?:src|href)="\/(?:assets|fonts|src|brand)\//.test(html))throw new Error('Unresolved local asset in standalone preview.');
fs.writeFileSync('START.html',html);
console.log(`START.html ready (${Math.round(Buffer.byteLength(html)/1024)} KB).`);
