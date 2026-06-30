# Alaboren Site

Static teaching-resource site for Arabic-speaking learners of Mandarin.

## Core Pages

- `index.html` - home page
- `pinyintable.html` - premium pinyin table
- `lottery.html` - lottery/randomizer
- `tone-pairs.html` - tone-pairs practice
- `signup.html` - sign-up/newsletter placeholder

## Unlisted Live Pages

- `pinyin-arabciazer.html` - live helper page; intentionally not linked from navigation

## Directory Structure

- `assets/css/` - shared and page-specific styles
- `assets/js/` - shared and page-specific scripts
- `assets/img/` - page imagery and tool graphics
- `assets/icons/` - social icons and favicon assets
- `assets/fonts/` - deployed local fonts
- `data/` - JSON data used by interactive tools
- `archive/` - old tools and teaching materials kept for reference

## Core Data

- `data/pinyintable.json` - table content used by the premium table and lottery
- `data/pinyin-tone-map.json` - tone availability data for the premium table
- `data/pinyin-mapping.json` - Arabic-to-pinyin mapping used by pinyin tools
- `data/cards.json` - tone-pairs card data

## Archive

Outdated teaching materials live in `archive/` so the active site stays focused:

- `archive/table-builder/` - old premium-table builder
- `archive/teaching-materials/` - old class notes, writing data, radicals, structures, strokes, and download page
- `archive/legacy-pages/` - old standalone helper pages

## Shared Assets

- `assets/css/style.css` and `assets/js/script.js` are shared across the main pages.
- Page-specific CSS and JS files live in `assets/css/` and `assets/js/`.
- Browser-facing assets live under `assets/`.

## Cleanup Notes

The project intentionally keeps only the deployed font files in `assets/fonts/`.
Upstream font packages, source bundles, empty scratch files, and duplicate script copies should stay out of the repository.
