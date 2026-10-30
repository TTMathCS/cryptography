#!/bin/sh
# Copy the Mars site's fonts, holiday themes and the two dome pictures into docs/. Run from the repo root
# after something changes there: sh tools/sync-from-mars.sh [path to the myarcadia folder]
set -e
A=${1:-../myarcadia}
M=$A/Mars-Home
P=$A/ArcadiaPlanitia-ErebusMontes-ArcadiaCity/arcadia-city/pictures
mkdir -p docs/fonts docs/holidays docs/images
cp -R "$M"/fonts/saira-condensed "$M"/fonts/ibm-plex-sans "$M"/fonts/ibm-plex-mono "$M"/fonts/cormorant-garamond "$M"/fonts/fonts.css docs/fonts/
cp "$M"/fonts/LICENCE-saira-condensed.txt "$M"/fonts/LICENCE-ibm-plex-sans.txt "$M"/fonts/LICENCE-ibm-plex-mono.txt "$M"/fonts/LICENCE-cormorant-garamond.txt docs/fonts/
cp "$M"/holidays/index.json "$M"/holidays/rules.js "$M"/holidays/loader.js "$M"/holidays/site.css docs/holidays/
for d in "$M"/holidays/*/; do
  n=$(basename "$d")
  mkdir -p "docs/holidays/$n"
  cp "$d/theme.json" "docs/holidays/$n/"
done
cp "$P"/21-starlit-city.webp "$P"/27-dawn-after-storm.webp docs/images/
