# Forge location banners

Original environment fan art for profile covers, paired with the approved Forge ink-and-watercolor class portraits. Target: **DOFUS 3.7 / Unity**. This delivery contains artwork and its production records; the profile banner picker is a separate implementation.

## Collection v1

| ID | Location | Recognizable focus |
| --- | --- | --- |
| `bonta` | Bonta | White stone, blue roofs and pennants, winged sword fountain |
| `brakmar` | Brakmar | Riveted iron forges, horn-shaped roofs, chains and lava |
| `astrub` | Astrub | Slender ivory Hyperzaap, curved roofs and market lanes |
| `incarnam` | Incarnam | Floating golden plateau and round turquoise departure portal |
| `amakna` | Amakna | Round-roofed village tavern, timber, grass and old trees |
| `sufokia` | Sufokia | Sandstone quays, wooden bridges, turquoise sea and small boats |
| `pandala` | Pandala | Green bamboo-roofed gate, bamboo bridge and misty water |
| `frigost` | Frigost | La Bourgade's steep roofs, heavy snow, icicles and warm windows |

`manifest.json` preserves every exact generation prompt, reference source, asset hash and export dimensions. `prompt-template.json` records the reusable art direction. The game version recorded in the manifest comes from `public/data/version.json` when the assets were prepared; it is a target, not a claim that every source reference was captured in that patch. Reference publication dates vary, including the city and Pandala redesigns; original URLs remain in the manifest for review. This is an original illustrated interpretation of the places, not a screenshot pack or a literal reconstruction of a map.

## Files and framing

- Web delivery: `public/banners/locations/v1/<id>.webp`, opaque, panoramic 3:1.
- Original PNG masters: `temp/profile-banners/masters/v1/<id>.png`, retained locally outside Git.
- Collection overview: `collection-preview.webp` beside this file.
- Exact prompts and sources: `manifest.json` beside this file.

The full illustration includes its paper-colored background and watercolor. Keep the recognizable landmark within the central area, and allow room at the lower-left for a profile picture overlay. Use `object-fit: cover` with a centered focal area when integrating the picker; inspect desktop and narrow crops before choosing a different banner aspect ratio. Do not bake profile UI, labels, gradients or avatar circles into the artwork.

## Continuing the collection

Start with the approved portrait style reference and real game environment references. Verify the target place against the current Unity version and preserve its architectural identity. Give each place its own composition, palette and mood. Apply the reusable template, inspect the full panorama and a narrow crop, and append the exact final prompt, source URLs, dimensions and hashes to the manifest. Export the optimized WebP while retaining the original PNG locally. Do not replace previous assets silently; use a new collection version for later revisions.
