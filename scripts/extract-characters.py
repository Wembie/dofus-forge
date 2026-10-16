"""
ETL: local Dofus 3 client -> animated character assets

Usage:
  python -m venv .venv-chars && .venv-chars/Scripts/pip install UnityPy Pillow
  .venv-chars/Scripts/python scripts/extract-characters.py [--client PATH] [--out DIR]

Reads the Unity bundles of an installed game client and writes compact assets
consumed by src/lib/character:

  <out>/looks.json              breed -> {male, female} body skin, head skin, colors
  <out>/bones/<id>.json         node names + animation list (bounds, frame count)
  <out>/bones/<id>/<anim>.bin   raw animation timelines (format: src/lib/character/anim.ts)
  <out>/skins/<id>.bin          skin geometry (format: src/lib/character/skin.ts)
  <out>/skins/<id>.webp         skin texture atlas

The output is uploaded to object storage; it is never committed.
"""

import argparse
import json
import os
import struct
import sys
import warnings

import UnityPy

UnityPy.config.FALLBACK_UNITY_VERSION = '6000.3.16f1'
warnings.filterwarnings('ignore')

DEFAULT_CLIENT = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Ankama', 'Dofus-dofus3')
BONES = ['1-static', '1-movement']
SKIN_MAGIC = b'DFSK'
SKIN_VERSION = 1


def content_dir(client):
    return os.path.join(client, 'Dofus_Data', 'StreamingAssets', 'Content')


def load(path):
    return UnityPy.load(path)


def table_rows(client, name):
    env = load(os.path.join(content_dir(client), 'Data', f'data_assets_{name}dataroot.asset.bundle'))
    for obj in env.objects:
        if obj.type.name == 'MonoBehaviour':
            tree = obj.read_typetree()
            if 'references' in tree:
                return [r['data'] for r in tree['references']['RefIds']]
    raise RuntimeError(f'table {name} not found')


def write_skin(tree, image, out_base):
    keys = tree['m_keys']
    symbols = tree['referencedSymbols']
    parts = {}
    for name, value in zip(keys, tree['m_values']):
        display = []
        for entry in value['DisplayListEntry']:
            t = entry['transform']
            sym = entry['symbolId']
            display.append([
                symbols[sym] if sym >= 0 else None,
                entry['entries'],
                round(t['rX'], 5), round(t['rY'], 5), round(t['uX'], 5), round(t['uY'], 5),
                round(t['tX'], 4), round(t['tY'], 4),
            ])
        chunks = [[c['startVertexIndex'], c['vertexCount'], c['startIndexIndex'], c['indexCount']]
                  for c in value['skinChunks']]
        parts[name] = {'d': display, 'c': chunks}

    verts = tree['vertices']
    tris = tree['triangles']
    header = json.dumps({
        'parts': parts,
        'vertexCount': len(verts),
        'indexCount': len(tris),
        'size': [image.width, image.height],
    }, separators=(',', ':')).encode('utf-8')
    header += b' ' * ((4 - len(header) % 4) % 4)

    geo = bytearray()
    for v in verts:
        geo += struct.pack('<4f', v['pos']['x'], v['pos']['y'], v['uv']['x'], 1.0 - v['uv']['y'])
    tint = bytes(int(v['pos']['z']) & 0xff for v in verts)
    tint += b'\0' * ((4 - len(tint) % 4) % 4)
    index = struct.pack(f'<{len(tris)}H', *tris)

    with open(out_base + '.bin', 'wb') as f:
        f.write(SKIN_MAGIC + struct.pack('<II', SKIN_VERSION, len(header)))
        f.write(header)
        f.write(geo)
        f.write(tint)
        f.write(index)
    image.save(out_base + '.webp', 'WEBP', quality=90, method=6)


def read_skin_bundle(path):
    env = load(path)
    tree = image = None
    for obj in env.objects:
        if obj.type.name == 'MonoBehaviour':
            t = obj.read_typetree()
            if 'm_keys' in t and 'vertices' in t:
                tree = t
        elif obj.type.name == 'Texture2D':
            image = obj.read().image
    return tree, image


def export_skin(client, out, skin_id):
    target = os.path.join(out, 'skins', str(skin_id))
    if os.path.exists(target + '.bin'):
        return True
    path = os.path.join(content_dir(client), 'Characters', 'Skins', f'skins_assets_skin_{skin_id}.bundle')
    if not os.path.exists(path):
        print(f'  missing skin {skin_id}', file=sys.stderr)
        return False
    tree, image = read_skin_bundle(path)
    if tree is None or image is None:
        print(f'  unreadable skin {skin_id}', file=sys.stderr)
        return False
    write_skin(tree, image, target)
    return True


def frame_count(data):
    return struct.unpack_from('<H', data, 0)[0]


def export_bone(client, out, bone):
    path = os.path.join(content_dir(client), 'Characters', 'Bones', f'bones_assets_bone_{bone}.bundle')
    env = load(path)
    by_id = {obj.path_id: obj for obj in env.objects}
    definition = None
    for obj in env.objects:
        if obj.type.name == 'MonoBehaviour':
            t = obj.read_typetree()
            if 'exposedNodeNames' in t:
                definition = t
    if definition is None:
        raise RuntimeError(f'bone {bone}: no definition')

    anim_dir = os.path.join(out, 'bones', bone)
    os.makedirs(anim_dir, exist_ok=True)
    anims = {}
    for anim in definition['animations']:
        text = by_id[anim['data']['m_PathID']].read()
        data = text.m_Script
        if isinstance(data, str):
            data = data.encode('utf-8', 'surrogateescape')
        with open(os.path.join(anim_dir, anim['name'] + '.bin'), 'wb') as f:
            f.write(data)
        b = anim['bounds']
        finite = all(abs(v) != float('inf') for v in b.values())
        anims[anim['name']] = {
            'frames': frame_count(data),
            'bounds': [round(b['x'], 2), round(b['y'], 2), round(b['width'], 2), round(b['height'], 2)] if finite else None,
        }

    with open(os.path.join(out, 'bones', bone + '.json'), 'w') as f:
        json.dump({
            'fps': definition['defaultFrameRate'],
            'nodes': definition['exposedNodeNames'],
            'anims': anims,
        }, f, separators=(',', ':'))
    print(f'  bone {bone}: {len(anims)} animations')


def pick_default(rows, breed, gender):
    candidates = [r for r in rows if r['breed'] == breed and r['gender'] == gender and r.get('availableAtCreation')]
    candidates.sort(key=lambda r: r['order'])
    return candidates[0] if candidates else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--client', default=DEFAULT_CLIENT)
    ap.add_argument('--out', default=os.path.join(os.getcwd(), 'char-assets'))
    args = ap.parse_args()

    os.makedirs(os.path.join(args.out, 'skins'), exist_ok=True)
    os.makedirs(os.path.join(args.out, 'bones'), exist_ok=True)

    print('bones')
    for bone in BONES:
        export_bone(args.client, args.out, bone)

    print('looks')
    breeds = table_rows(args.client, 'breeds')
    bodies = table_rows(args.client, 'bodies')
    heads = table_rows(args.client, 'heads')
    looks = {}
    for breed in breeds:
        entry = {}
        for gender, key in ((0, 'male'), (1, 'female')):
            body = pick_default(bodies, breed['id'], gender)
            head = pick_default(heads, breed['id'], gender)
            if body is None or head is None:
                continue
            body_skin, head_skin = int(body['skins']), int(head['skins'])
            if export_skin(args.client, args.out, body_skin) and export_skin(args.client, args.out, head_skin):
                colors = breed['maleColors'] if gender == 0 else breed['femaleColors']
                entry[key] = {'body': body_skin, 'head': head_skin, 'colors': colors}
        if entry:
            looks[breed['id']] = entry
            print(f'  breed {breed["id"]}: {", ".join(entry)}')

    with open(os.path.join(args.out, 'looks.json'), 'w') as f:
        json.dump(looks, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
