import fs from 'node:fs';
fs.mkdirSync('docs/design-v0.4/assets',{recursive:true});
const items=JSON.parse(fs.readFileSync('public/data/es/equipment.json','utf8'));
const chosen=[...items.filter(i=>i.slot==='dofus').slice(0,6),...['hat','cape','amulet','ring','belt','boots','weapon','shield','pet'].map(slot=>items.find(i=>i.slot===slot&&i.level>=190&&i.image_url))].filter(Boolean);
const assets=[];
for(const item of chosen){const key='item-'+item.ankama_id;const file='docs/design-v0.4/assets/'+key+'.png';const response=await fetch('https://dofusforge.com'+item.image_url);if(!response.ok)throw new Error(response.status+' '+item.image_url);fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));assets.push({key,file,name:item.name,slot:item.slot,id:item.ankama_id,url:item.image_url});}
for(const key of ['iop','cra','feca','pandawa']){const file='docs/design-v0.4/assets/'+key+'.png';fs.copyFileSync('public/data/classes/'+key+'.png',file);assets.push({key,file,name:key});}
fs.writeFileSync('docs/design-v0.4/assets/manifest.json',JSON.stringify(assets,null,2));console.log(JSON.stringify(assets));
