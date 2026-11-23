"""Inventory creation looks for portrait production; optionally export one head slot.

Uses the installed Dofus client and the existing character extractor. Portrait
slot numbers are one-based positions ordered by the game's order then id;
retain the source ids because labels/order are not unique or consecutive.
Usage: python scripts/extract-avatar-looks.py --export-head 2
"""
import argparse
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('characters', ROOT / 'scripts/extract-characters.py')
characters = importlib.util.module_from_spec(spec)
spec.loader.exec_module(characters)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--client', default=characters.DEFAULT_CLIENT)
    parser.add_argument('--out', default=str(ROOT / 'char-assets'))
    parser.add_argument('--export-head', type=int)
    args = parser.parse_args()
    if args.export_head is not None and args.export_head < 1:
        parser.error('--export-head must be a positive one-based slot')
    tables = {name: characters.table_rows(args.client, name) for name in ['breeds', 'bodies', 'heads']}
    breeds = {row['id']: row for row in tables['breeds']}
    class_source = (ROOT / 'src/features/class-picker/classData.ts').read_text(encoding='utf-8')
    classes = re.findall(r"cls\('([^']+)',\s*'[^']+',\s*'[^']+',\s*(\d+)\)", class_source)
    names = json.loads((ROOT / 'public/data/class-names.json').read_text(encoding='utf-8'))
    records = []
    (Path(args.out) / 'skins').mkdir(parents=True, exist_ok=True)
    for class_id, breed_id in classes:
        breed_id = int(breed_id)
        for sex, gender in [(0, 'male'), (1, 'female')]:
            def variants(table):
                rows = sorted((r for r in tables[table] if r['breed'] == breed_id and r['gender'] == sex and r.get('availableAtCreation')), key=lambda r: (r['order'], r['id']))
                return [{'slot': slot, 'id': r['id'], 'skin': int(r['skins']), 'label': r['label'], 'order': r['order'], 'assetId': r['assetId']} for slot, r in enumerate(rows, 1)]
            bodies, heads = variants('bodies'), variants('heads')
            record = {'classId': class_id, 'className': names[class_id]['es'], 'breed': breed_id, 'gender': gender, 'colors': breeds[breed_id]['maleColors' if sex == 0 else 'femaleColors'], 'bodies': bodies, 'heads': heads}
            records.append(record)
            if args.export_head is not None:
                head = next((r for r in heads if r['slot'] == args.export_head), None)
                if head is None:
                    print(f'{class_id}-{gender}: no head slot {args.export_head}')
                    continue
                for skin in [bodies[0]['skin'], head['skin']]:
                    if not characters.export_skin(args.client, args.out, skin):
                        raise RuntimeError(f'Missing game reference skin {skin}')
                print(f'{class_id}-{gender}: body {bodies[0]["skin"]}, head {head["skin"]}')
    inventory = {'source': 'Installed Dofus 3 client; availableAtCreation bodies and heads', 'priority': 'Heads first using the default body; alternate bodies mapped for later', 'slotRule': 'One-based position sorted by source order then source id; preserve source ids', 'looks': records}
    destination = ROOT / 'docs/brand/profile-avatars/game-looks.json'
    destination.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(records)} class/sex records; {sum(len(r["heads"]) for r in records)} heads; {sum(len(r["bodies"]) for r in records)} bodies')


if __name__ == '__main__':
    main()
