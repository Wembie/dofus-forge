const page=figma.currentPage;
page.name='00 · Identidad y fundamentos';
const created=[];
const primitives=figma.variables.createVariableCollection('Forge / Primitives');
const theme=figma.variables.createVariableCollection('Forge / Theme');
theme.renameMode(theme.defaultModeId,'Mineral');
const darkTheme=figma.variables.createVariableCollection('Forge / Theme Tinta');
const dark=darkTheme.defaultModeId;
const palette={paper:'#F4F0E6',white:'#FFFCF6',ink:'#172B29',muted:'#586660',line:'#C8CCC1',copper:'#A64E2F',copperHover:'#873B23',patina:'#356C60',wash:'#E5EAE0',night:'#142523',panel:'#1F3430',nightText:'#F1EEE3',nightMuted:'#B4C5BC',nightLine:'#536B60',lightCopper:'#F2A985',earth:'#805024',fire:'#A7392C',water:'#1D667F',air:'#43612E',neutral:'#59615D',success:'#2E6652',danger:'#A63334',warning:'#795C1B',focus:'#227EAA'};
const color=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const pv={};
for(const [name,value] of Object.entries(palette)){const v=figma.variables.createVariable('palette/'+name,primitives,'COLOR');v.setValueForMode(primitives.defaultModeId,color(value));v.scopes=[];v.setVariableCodeSyntax('WEB','var(--forge-palette-'+name+')');pv[name]=v;}
const roles={canvas:['paper','night'],surface:['white','panel'],text:['ink','nightText'],muted:['muted','nightMuted'],border:['line','nightLine'],accent:['copper','lightCopper'],accentHover:['copperHover','lightCopper'],onAccent:['white','ink'],wash:['wash','panel'],positive:['success','nightMuted'],negative:['danger','lightCopper'],focus:['focus','lightCopper'],earth:['earth','lightCopper'],fire:['fire','lightCopper'],water:['water','nightMuted'],air:['air','nightMuted'],neutral:['neutral','nightMuted']};
const vars={},darkVars={};
for(const [name,[light,night]] of Object.entries(roles)){for(const [collection,key,map] of [[theme,light,vars],[darkTheme,night,darkVars]]){const v=figma.variables.createVariable('color/'+name,collection,'COLOR');v.scopes=name==='border'?['STROKE_COLOR']:['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];v.setValueForMode(collection.defaultModeId,figma.variables.createVariableAlias(pv[key]));v.setVariableCodeSyntax('WEB','var(--forge-'+name+')');map[name]=v.id;}}
for(const [name,n,scope] of [['space/4',4,'GAP'],['space/8',8,'GAP'],['space/12',12,'GAP'],['space/16',16,'GAP'],['space/24',24,'GAP'],['space/32',32,'GAP'],['radius/4',4,'CORNER_RADIUS'],['radius/8',8,'CORNER_RADIUS'],['size/touch',44,'WIDTH_HEIGHT']]){const v=figma.variables.createVariable(name,primitives,'FLOAT');v.setValueForMode(primitives.defaultModeId,n);v.scopes=[scope];v.setVariableCodeSyntax('WEB','var(--forge-'+name.replaceAll('/','-')+')');vars[name]=v.id;}
const fonts=[['Barlow','Regular'],['Barlow','SemiBold'],['Barlow Condensed','Bold'],['Alegreya','Regular'],['Alegreya','Bold'],['IBM Plex Mono','Medium']];for(const [family,style] of fonts)await figma.loadFontAsync({family,style});
const styles={};
for(const [name,family,style,size,line] of [['Display','Alegreya','Regular',56,62],['Title','Alegreya','Bold',32,38],['Heading','Barlow Condensed','Bold',22,28],['Body','Barlow','Regular',16,24],['Label','Barlow','SemiBold',14,20],['Small','Barlow','Regular',13,18],['Number','IBM Plex Mono','Medium',20,26],['Data','IBM Plex Mono','Medium',13,20]]){const s=figma.createTextStyle();s.name='Forge / '+name;s.fontName={family,style};s.fontSize=size;s.lineHeight={unit:'PIXELS',value:line};styles[name]=s.id;}
const lib=figma.createPage();lib.name='01 · Componentes';created.push(lib.id);
const screens=figma.createPage();screens.name='02 · Experiencia';created.push(screens.id);
return {createdNodeIds:created,mutatedNodeIds:[page.id],pages:{brand:page.id,library:lib.id,screens:screens.id},vars,darkVars,styles,theme:{id:theme.id,light:theme.defaultModeId,darkId:darkTheme.id,dark},palette,counts:{variables:Object.keys(pv).length+Object.keys(vars).length+Object.keys(darkVars).length,textStyles:8}};
