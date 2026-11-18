import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {Resvg} from '@cf-wasm/resvg/node';
function python(...args){const result=spawnSync('python',['scripts/build-brand-v04.py',...args],{stdio:'inherit'});if(result.status!==0)throw Error('Brand source generation failed')}
python();
const render=async(source,target,width)=>{const resvg=await Resvg.async(readFileSync(source),{fitTo:{mode:'width',value:width}});writeFileSync(target,resvg.render().asPng())};
const dir='public/brand/';
for(const size of [96,512])await render(dir+'icon.svg',dir+`icon-${size}.png`,size);
for(const size of [256,1024])await render(dir+'mark.svg',dir+`mark-${size}.png`,size);
await render(dir+'icon-maskable.svg',dir+'icon-maskable-512.png',512);
await render(dir+'lockup-horizontal.svg',dir+'lockup-horizontal-1200.png',1200);
for(const [target,width] of [['favicon-48.png',48],['favicon-192.png',192],['favicon-512.png',512],['apple-touch-icon.png',180]])await render(dir+'icon.svg','public/'+target,width);
for(const lang of ['en','es','fr','pt'])await render(dir+`og-v04-${lang}.svg`,dir+`og-v04-${lang}.png`,1200);
python('--raster');
const paths=JSON.parse(readFileSync('temp/brand-v04/paths.json','utf8'));
writeFileSync('src/ui/brandMarkData.ts',`/** The workshop anvil and its flame, shared with the public brand kit. */\nexport const BRAND_MARK = ${JSON.stringify(paths,null,2)} as const\n`);
console.log('Brand vectors, icons, favicons and four-language share previews generated.');
