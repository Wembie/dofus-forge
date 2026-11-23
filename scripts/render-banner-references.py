"""Render local map-asset references for banner art, never finished illustrations.

Requires the installed Dofus client and the existing UnityPy/Pillow extraction
dependencies. Static planes omit runtime lighting, particles and blend shaders;
they document current landmark assets, not pixel-exact game screenshots.
Usage: python scripts/render-banner-references.py 75497732 koalaks
"""
import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('characters', ROOT / 'scripts/extract-characters.py')
characters = importlib.util.module_from_spec(spec)
spec.loader.exec_module(characters)


class MapReferenceRenderer:
    def __init__(self, client):
        self.client = Path(client)
        self.content = Path(characters.content_dir(client))
        version_file = self.client / 'Dofus_Data/StreamingAssets/version'
        self.version = re.search(r'^Version=(.+)$', version_file.read_text(), re.MULTILINE).group(1).strip()
        self.bundles = {}
        self.images = {}

    def graphic(self, gfx_id):
        if gfx_id in self.images:
            return self.images[gfx_id]
        group = gfx_id // 10000 * 10000
        if group not in self.bundles:
            self.bundles[group] = characters.load(str(self.content / f'Map/Textures/1x/mapgfx_1x_{group}_assets_all.bundle'))
        env = self.bundles[group]
        obj = env.container[f'Assets/BuiltAssets/textures/gfx/1x/{gfx_id}.png'].read()
        self.images[gfx_id] = obj.image.convert('RGBA')
        return self.images[gfx_id]

    def render(self, map_id, name, output):
        relative = f'Map/Data/mapdata_assets_world_{map_id >> 18}.bundle'
        bundle = self.content / relative
        env = characters.load(str(bundle))
        data = env.container[f'map_{map_id}.asset'].read_typetree()
        references = {r['rid']: r.get('data') for r in data['references']['RefIds']}
        types = {r['rid']: r['type']['class'] for r in data['references']['RefIds']}
        canvas = Image.new('RGBA', (2400, 1600), (40, 45, 40, 255))
        rendered = 0
        for layer in ['backgroundMapElements', 'middlegroundMapElements', 'foregroundMapElements']:
            groups = data[layer]
            if layer == 'middlegroundMapElements':
                groups = sorted(groups, key=lambda r: (r['cellId'], r['displayOrder']))
            for group in groups:
                material = data[layer.replace('MapElements', 'MaterialData')]['shaderData'][group['materialIndex']]
                shader = references.get(material['rid'])
                if shader and any(types.get(p['rid']) == 'ShaderBlendingParameters' for p in shader.get('shaderParameters', [])):
                    continue
                for pointer in group['mapElements']:
                    element = references.get(pointer['rid'])
                    if not element or 'gfxId' not in element:
                        continue
                    source = self.graphic(element['gfxId'])
                    sx, sy = element['scale']['x'], element['scale']['y']
                    if sx == 0 or sy == 0:
                        continue
                    width, height = max(1, round(source.width * abs(sx))), max(1, round(source.height * abs(sy)))
                    image = source.resize((width, height), Image.Resampling.BICUBIC)
                    if sx < 0:
                        image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                    if sy < 0:
                        image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
                    color = element['color']['value']
                    # The source neutral vertex tint is 0x818181. Normalize it
                    # for reference legibility; runtime shader grading is omitted.
                    rgba = tuple(min(255, round(((color >> shift) & 255) * 255 / 129)) for shift in [16, 8, 0]) + ((color >> 24) & 255,)
                    if rgba != (255, 255, 255, 255):
                        image = ImageChops.multiply(image, Image.new('RGBA', image.size, rgba))
                    if element['rotation']:
                        image = image.rotate(element['rotation'], resample=Image.Resampling.BICUBIC, expand=True)
                    x = round(1200 + element['position']['x'] - image.width / 2)
                    y = round(800 - element['position']['y'] - image.height / 2)
                    canvas.alpha_composite(image, (x, y))
                    rendered += 1
        output = Path(output)
        output.mkdir(parents=True, exist_ok=True)
        destination = output / f'{name}-{map_id}.png'
        canvas.convert('RGB').save(destination)
        metadata = {
            'sourceClientVersion': self.version,
            'mapId': map_id,
            'sourceMapBundle': relative,
            'sourceMapBundleSha256': hashlib.sha256(bundle.read_bytes()).hexdigest(),
            'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
            'renderedElements': rendered,
            'preparation': 'Static installed-client map planes and 1x graphic assets; runtime lighting, particles and special blend shaders omitted. Source neutral vertex tint normalized. Not a game screenshot or finished banner.',
        }
        destination.with_suffix('.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
        return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('map_id', type=int)
    parser.add_argument('name')
    parser.add_argument('--client', default=characters.DEFAULT_CLIENT)
    parser.add_argument('--require-version', default='3.7')
    parser.add_argument('--out', default=str(ROOT / 'temp/profile-banners/client-references'))
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z][a-z0-9-]*', args.name):
        parser.error('name must be a lowercase location slug')
    renderer = MapReferenceRenderer(args.client)
    if not (renderer.version == args.require_version or renderer.version.startswith(args.require_version + '.')):
        parser.error(f'Installed client {renderer.version} does not match required version {args.require_version}')
    print(json.dumps(renderer.render(args.map_id, args.name, args.out)))


if __name__ == '__main__':
    main()
