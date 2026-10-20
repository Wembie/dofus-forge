"""
ETL: local Dofus 3 client -> animated character assets

Usage:
  python -m venv .venv-chars && .venv-chars/Scripts/pip install UnityPy Pillow
  .venv-chars/Scripts/python scripts/extract-characters.py [--client PATH] [--out DIR]

Reads the Unity bundles of an installed game client and writes compact assets
consumed by src/lib/character:

  <out>/looks.json              breed -> {male, female} body skin, head skin, colors, look scale
  <out>/pets.json               pet item id -> creature bone, scale (+ palette when needed)
  <out>/mounts.json             mount / petsmount item id -> mount bone, palette, scale
  <out>/bones/<id>.json         node names, own graphics, animation list (bounds, frame count)
  <out>/bones/<id>/<anim>.bin   raw animation timelines (format: src/lib/character/anim.ts)
  <out>/skins/<id>.bin          skin geometry (format: src/lib/character/skin.ts)
  <out>/skins/<id>.webp         skin texture atlas
  <out>/skins/b<bone>.*         a bone's own graphics, drawn by timeline records that
                                reference a graphic instead of a named node

The output is uploaded to object storage; it is never committed.
"""

import argparse
import json
import os
import re
import struct
import sys
import warnings

import UnityPy

UnityPy.config.FALLBACK_UNITY_VERSION = '6000.3.16f1'
warnings.filterwarnings('ignore')

DEFAULT_CLIENT = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Ankama', 'Dofus-dofus3')
BONES = ['1-static', '1-movement']
CREATURE_ANIMS = re.compile(r'^Anim(Statique|Marche|Course)_\d$')
CREATURE_LOOK = re.compile(r'^\{(\d+)\|\|\|(\d+)\}$')
MOUNT_LOOK = re.compile(r'^\{(\d+)\|\|([\d=,]*)\|(\d+)\}$')
NEUTRAL_TINT = 0x808080  # tint at 50% gray leaves a part as authored
RIDER_BONE = '2'

# Creatures whose bone has tinted parts but whose look carries no palette:
# colors fitted so the render matches the item icon (slot N -> index N-1;
# a tinted part shows its palette color at 50% gray, 0x808080 = untouched).
PET_COLORS = {
    13673: [0x808080, 0x808080, 0xb06a20, 0x5e582d],  # Snailmate
    13661: [0x808080, 0x808080, 0x5a8f7a],            # Kraxiste
    13667: [0x808080, 0x808080, 0x8fb4a6, 0xc0302a],  # Bulbeskeje
}

# Pets with no npc/monster of the same name: matched by eye, every candidate
# bone (shortlisted by atlas colors) rendered next to the item icon and each
# final pick re-checked alone. Minikornio and Microsmoglob have no matching
# bone in the client and stay unmatched.
PET_BONES = {
    1711: '242', 1728: '1998', 1748: '243', 6604: '244', 6716: '451',
    6718: '201', 6894: '1998', 6895: '1998', 7524: '225', 7704: '249',
    7707: '253', 7911: '263', 10106: '130', 10802: '197', 11011: '1200',
    11013: '1203', 11014: '1204', 11104: '244', 11771: '1417', 11950: '1467',
    11955: '1448', 11966: '1447', 11971: '1450', 12133: '1520', 12177: '1539',
    13071: '1851', 13099: '1850', 13230: '1909', 13661: '2021', 13667: '2022',
    13679: '608', 14545: '2320', 15110: '2626', 15249: '2709', 15254: '2708',
    15469: '2791', 15978: '3017', 16116: '3119', 16122: '3120', 16269: '3312',
    16276: '3162', 16295: '3158', 17023: '3214', 17028: '3215', 17379: '3364',
    17700: '3500', 17795: '3531', 17833: '3550', 18626: '3943', 19531: '4556',
    27431: '7002', 30957: '9143', 31862: '9640',
}
PET_SCALE = 80  # typical look scale of pet npcs (60-130)

# Petsmount item -> mount bone. The client has no such table (the server
# builds the mounted look), so each one was matched by eye: every mount bone
# rendered next to the item's official icon. Bones drawn untinted carry the
# palette sampled from the icon.
PETSMOUNTS = {
    12541: {'bone': '1659'},   # Dragrillado
    12963: {'bone': '1834'},   # Dekarbon
    13182: {'bone': '1792', 'colors': [0x565615, 0x7d7828]},  # Kramkram
    13465: {'bone': '1990'},   # Sakequero
    13603: {'bone': '2013'},   # Suskrofa
    14827: {'bone': '2440'},   # Kwalteza
    14833: {'bone': '2441'},   # Siroko
    14838: {'bone': '2442'},   # Xaparon
    14848: {'bone': '2443'},   # Kompost
    14854: {'bone': '2444'},   # Hardo
    15243: {'bone': '2710'},   # Perforror
    18088: {'bone': '3629'},   # Mortielago
    19044: {'bone': '4113'},   # Mortielago alabastrado
    19286: {'bone': '4179'},   # Jalacastor
    19291: {'bone': '4180'},   # Jalapolux
    25292: {'bone': '6339'},   # Tae'Niak
    29430: {'bone': '7850'},   # Kolifante mamuk
    29431: {'bone': '7849'},   # Kolifante de Lejandro
    29432: {'bone': '7848'},   # Kolifante de Kartago
    29433: {'bone': '7847'},   # Kolifante zenusha
    29434: {'bone': '7846'},   # Lagartiro
    29435: {'bone': '7834'},   # Kobraviva
    29456: {'bone': '7835'},   # Gavioto
    31886: {'bone': '9527'},   # Montura del Venerable (its monster's look)
    25293: {'bone': '6338'},   # Tortikoli (next to Tae'Niak's bone)
}
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


def read_i18n(client, lang):
    """Client string table: u8, 2-byte tag, u32 count, (u32 id, u32 offset)[count], 7-bit-length UTF-8 strings."""
    with open(os.path.join(content_dir(client), 'I18n', f'{lang}.bin'), 'rb') as f:
        data = f.read()
    count = struct.unpack_from('<I', data, 3)[0]
    strings = {}
    for k in range(count):
        sid, p = struct.unpack_from('<II', data, 7 + k * 8)
        length = shift = 0
        while True:
            b = data[p]
            p += 1
            length |= (b & 0x7f) << shift
            shift += 7
            if b < 0x80:
                break
        strings[sid] = data[p:p + length].decode('utf-8', 'replace')
    return strings


def match_pets(client, item_type):
    """Pet items carry no usable look; match them by name to the creature (npc or
    monster) that represents them in the world, which does have a bone."""
    names = read_i18n(client, 'fr')
    creatures = {}
    for table, rank in (('monsters', 0), ('npcs', 1)):
        for row in table_rows(client, table):
            look = next((v for v in row.values() if isinstance(v, str) and CREATURE_LOOK.match(v)), None)
            name = names.get(row.get('nameId'))
            if not look or not name:
                continue
            bone, scale = map(int, CREATURE_LOOK.match(look).groups())
            key = name.strip().lower()
            candidate = (rank, row.get('id', 0), bone, scale)
            if key not in creatures or candidate > creatures[key]:
                creatures[key] = candidate
    pets = {}
    for item in table_rows(client, 'items'):
        if item.get('typeId') != item_type:
            continue
        found = creatures.get((names.get(item['nameId']) or '').strip().lower())
        if found:
            pets[item['id']] = {'bone': str(found[2]), 'scale': found[3]}
        elif item['id'] in PET_BONES:
            pets[item['id']] = {'bone': PET_BONES[item['id']], 'scale': PET_SCALE}
        if item['id'] in pets and item['id'] in PET_COLORS:
            pets[item['id']]['colors'] = PET_COLORS[item['id']]
    return pets


def ride_mounts(client):
    """Mount items (dragoturkeys, seemyools, rhineetles…): the ride links the
    item to the mount row, whose look string carries bone, palette and scale."""
    looks = {r['id']: r['look'] for r in table_rows(client, 'mounts') if 'look' in r}
    mounts = {}
    for ride in table_rows(client, 'rides'):
        match = MOUNT_LOOK.match(looks.get(ride.get('id'), '')) if 'linkedItemGid' in ride else None
        if not match:
            continue
        bone, colors, scale = match.groups()
        slots = dict(map(int, c.split('=')) for c in colors.split(',') if c)
        palette = [slots.get(i, NEUTRAL_TINT) for i in range(1, max(slots, default=0) + 1)]
        mounts[ride['linkedItemGid']] = {'bone': bone, 'colors': palette, 'scale': int(scale)}
    return mounts


def frame_count(data):
    return struct.unpack_from('<H', data, 0)[0]


def export_bone(client, out, bone, keep=None):
    path = os.path.join(content_dir(client), 'Characters', 'Bones', f'bones_assets_bone_{bone}.bundle')
    if not os.path.exists(path):
        print(f'  missing bone {bone}', file=sys.stderr)
        return False
    env = load(path)
    by_id = {obj.path_id: obj for obj in env.objects}
    definition = None
    trees = {}
    image = None
    for obj in env.objects:
        if obj.type.name == 'MonoBehaviour':
            t = obj.read_typetree()
            trees[obj.path_id] = t
            if 'exposedNodeNames' in t:
                definition = t
        elif obj.type.name == 'Texture2D':
            image = obj.read().image
    if definition is None:
        raise RuntimeError(f'bone {bone}: no definition')

    own = trees.get(definition['boneAsset']['m_PathID'])
    graphics = []
    if own and own.get('m_keys') and image is not None:
        write_skin(own, image, os.path.join(out, 'skins', f'b{bone}'))
        graphics = [g['part']['name'] for g in definition['graphics']]

    anim_dir = os.path.join(out, 'bones', bone)
    os.makedirs(anim_dir, exist_ok=True)
    anims = {}
    for anim in definition['animations']:
        if keep and not keep(anim['name']):
            continue
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
            'graphics': graphics,
            'anims': anims,
        }, f, separators=(',', ':'))
    print(f'  bone {bone}: {len(anims)} animations, {len(graphics)} graphics')
    return True


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
                # Look scales share one unit across characters, creatures and
                # mounts, so a pet or mount is drawn at its scale / this one.
                look = breed['maleLook'] if gender == 0 else breed['femaleLook']
                scale = int(look.strip('{}').split('|')[3])
                entry[key] = {'body': body_skin, 'head': head_skin, 'colors': colors, 'scale': scale}
        if entry:
            looks[breed['id']] = entry
            print(f'  breed {breed["id"]}: {", ".join(entry)}')

    with open(os.path.join(args.out, 'looks.json'), 'w') as f:
        json.dump(looks, f, separators=(',', ':'))

    print('pets')
    pets = match_pets(args.client, 18)
    exported = {}
    for bone in sorted({p['bone'] for p in pets.values()}, key=int):
        exported[bone] = export_bone(args.client, args.out, bone, keep=CREATURE_ANIMS.match)
    pets = {k: v for k, v in pets.items() if exported[v['bone']]}
    print(f'  {len(pets)} pets matched')
    with open(os.path.join(args.out, 'pets.json'), 'w') as f:
        json.dump(pets, f, separators=(',', ':'))

    print('mounts')
    export_bone(args.client, args.out, RIDER_BONE)
    candidates = {**ride_mounts(args.client), **PETSMOUNTS}
    exported = {}
    for bone in sorted({m['bone'] for m in candidates.values()}, key=int):
        exported[bone] = export_bone(args.client, args.out, bone, keep=CREATURE_ANIMS.match)
    mounts = {k: v for k, v in candidates.items() if exported[v['bone']]}
    print(f'  {len(mounts)} mounts and petsmounts')
    with open(os.path.join(args.out, 'mounts.json'), 'w') as f:
        json.dump(mounts, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
