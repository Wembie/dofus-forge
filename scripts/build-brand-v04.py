"""Vector brand sources and static share images. Requires fonttools and Pillow."""
from pathlib import Path
import base64
import json
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'brand'
FONTS = ROOT / 'src' / 'worker' / 'fonts'
BODY = 'M18 60H52C52 77 62 90 79 90C96 90 106 77 106 60H142V79H112V91H129V104H107L102 117L124 129V136H37V129L57 116V98L36 86L18 68V60ZM91 96V119L98 113V96H91Z'
FLAME = 'M79 25C86 30 98 48 98 62C98 74 91 82 79 82C67 82 60 74 60 62C60 48 72 30 79 25ZM66 51L80 43L83 48L69 56L66 51ZM77 65L91 57L94 62L80 70L77 65Z'
BG, INK, ACCENT, MUTED, LINE = '#111615', '#e9e8df', '#e4b28b', '#a1aaa0', '#343c35'

def mark(color=ACCENT, transform=''):
    return f'<g transform="{transform}" fill="{color}" fill-rule="evenodd"><path d="{BODY}"/><path d="{FLAME}"/></g>'

def svg(w,h,content):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{content}</svg>'

def text(value,size,x,y,color=INK,font='SourceSans3-Regular.ttf',spacing=0):
    face=TTFont(FONTS/font); glyphs=face.getGlyphSet(); cmap=face.getBestCmap(); scale=size/face['head'].unitsPerEm; commands=[]
    for char in value:
        name=cmap.get(ord(char),'.notdef');pen=SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen,(scale,0,0,-scale,x,y)))
        commands.append(pen.getCommands());x+=face['hmtx'][name][0]*scale+spacing
    return f'<path fill="{color}" d="{" ".join(commands)}"/>'

def image(path,x,y,w,h):
    uri='data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()
    return f'<image href="{uri}" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet"/>'

if '--x-banner' in sys.argv:
    social=ROOT/'docs'/'brand'/'social'
    social.mkdir(parents=True,exist_ok=True)
    content=f'<rect width="1500" height="500" fill="{BG}"/>'
    content+='<path d="M-80 30H135L505 400H1500V500H385L-80 115Z" fill="#1a241e"/>'
    content+='<path d="M880 0H1150L1540 390V500H1380Z" fill="#18211d"/>'
    content+=f'<path d="M-20 75H150L460 385H1520M-20 120H130L440 430H1520" fill="none" stroke="{ACCENT}" stroke-width="2" opacity=".09"/>'
    content+=f'<path d="M1010 -30L1510 470M1060 -30L1510 420" fill="none" stroke="{ACCENT}" stroke-width="2" opacity=".08"/>'
    content+=f'<path d="M220 247H305M1265 247H1350" stroke="{ACCENT}" stroke-width="2" opacity=".5"/>'
    word=(OUT/'wordmark.svg').read_text(encoding='utf8').split('>',1)[1].rsplit('</svg>',1)[0]
    content+=f'<svg x="360" y="180" width="850" height="150" viewBox="0 30 475 84">{word}</svg>'
    content+=text('EL TALLER DE LOS DOCE',18,651,357,MUTED,spacing=2.4)
    (social/'dofus-forge-x-banner-es-1500x500.svg').write_text(svg(1500,500,content),encoding='utf8')
    print('Spanish X banner source generated from the live wordmark, palette and outlined type.')
    raise SystemExit

if '--raster' in sys.argv:
    from PIL import Image
    for lang in ['en','es','fr','pt']:
        img=Image.open(OUT/f'og-v04-{lang}.png').convert('RGB')
        img.save(OUT/f'og-v04-{lang}.jpg',quality=94,subsampling=0)
        img.save(OUT/f'og-preview-{lang}.jpg',quality=94,subsampling=0)
    Image.open(OUT/'og-v04-en.png').convert('RGB').save(OUT/'og-preview.jpg',quality=94,subsampling=0)
    Image.open(OUT/'icon-512.png').save(ROOT/'public'/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
    raise SystemExit

OUT.mkdir(parents=True,exist_ok=True)
(ROOT/'temp'/'brand-v04').mkdir(parents=True,exist_ok=True)
(OUT/'mark.svg').write_text(svg(160,160,mark()),encoding='utf8')
(OUT/'mark-light.svg').write_text(svg(160,160,mark('#172b29')),encoding='utf8')
(OUT/'mark-mono.svg').write_text(svg(160,160,mark('currentColor')),encoding='utf8')
icon=svg(512,512,f'<rect width="512" height="512" rx="72" fill="{BG}"/>'+mark(transform='translate(16 0) scale(3)'))
(OUT/'icon.svg').write_text(icon,encoding='utf8');(OUT/'app-icon.svg').write_text(icon,encoding='utf8')
(OUT/'icon-maskable.svg').write_text(svg(512,512,f'<rect width="512" height="512" fill="{BG}"/>'+mark(transform='translate(96 80) scale(2)')),encoding='utf8')
word=text('DOFUS',96,0,104,font='BarlowCondensed-SemiBold.ttf',spacing=2)+text('FORGE',96,230,104,ACCENT,font='BarlowCondensed-SemiBold.ttf',spacing=2)
(OUT/'wordmark.svg').write_text(svg(475,124,word),encoding='utf8')
(OUT/'lockup-horizontal.svg').write_text(svg(660,160,mark()+f'<g transform="translate(180 12)">{word}</g>'),encoding='utf8')
(OUT/'lockup-stacked.svg').write_text(svg(500,340,mark(transform='translate(170 0)')+f'<g transform="translate(12 190)">{word}</g>'),encoding='utf8')
favicon=svg(160,160,'<style>g{fill:#172b29}@media(prefers-color-scheme:dark){g{fill:#e4b28b}}</style>'+mark(''))
(ROOT/'public'/'favicon.svg').write_text(favicon,encoding='utf8')
copy={
 'es':('EL TALLER DE LOS DOCE','Construye tu próxima','forma de jugar.','Equipo, estadísticas y Forjadora para Dofus.'),
 'en':('THE WORKSHOP OF THE TWELVE','Build your next','way to play.','Equipment, stats and the Forge for Dofus.'),
 'fr':('L’ATELIER DES DOUZE','Préparez votre prochaine','façon de jouer.','Équipement, statistiques et Forge pour Dofus.'),
 'pt':('A OFICINA DOS DOZE','Construa sua próxima','forma de jogar.','Equipamentos, estatísticas e Forjadora para Dofus.'),
}
for lang,(eyebrow,line1,line2,subtitle) in copy.items():
    content=f'<rect width="1200" height="630" fill="{BG}"/><path d="M48 130H1152M48 558H1152" stroke="{LINE}"/>'
    content+=mark(transform='translate(28 10) scale(.68)')+text('DOFUS FORGE',42,150,83,ACCENT,'BarlowCondensed-SemiBold.ttf',1.5)
    content+=text(eyebrow,15,56,195,MUTED,spacing=1.4)
    content+=text(line1,57 if lang=='fr' else 63,52,285,font='Alegreya-SemiBold.ttf')+text(line2,63,52,355,ACCENT,'Alegreya-SemiBold.ttf')
    content+=text(subtitle,23,56,418,MUTED)
    content+=f'<path d="M860 500H1122" stroke="{LINE}"/>'+image(OUT/'workshop-character.png',830,118,290,398)
    for i in range(3):content+=image(OUT/f'workshop-dofus-{i+1}.png',61+i*68,464,48,48)
    content+=text('dofusforge.com',18,56,598,MUTED,font='IBMPlexMono-Medium.ttf')
    (OUT/f'og-v04-{lang}.svg').write_text(svg(1200,630,content),encoding='utf8')
json.dump({'body':BODY,'flame':FLAME},open(ROOT/'temp'/'brand-v04'/'paths.json','w'))
