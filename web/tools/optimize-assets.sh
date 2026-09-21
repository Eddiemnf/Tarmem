#!/bin/sh
# Make the lighter copies of design assets that the site serves.
#
# The design's trade photographs (../project/assets/trades/NN.png) are 2-3 MB
# PNG placeholders. The site serves 900px JPEGs instead; tools/convert-template.py
# points the generated markup and logic at them (ASSET_REWRITES). Re-run this when
# the photographs change. Uses sips, which ships with macOS.
set -eu
cd "$(dirname "$0")/.."
mkdir -p public/assets/trades
for src in ../project/assets/trades/*.png; do
  name=$(basename "$src" .png)
  sips -s format jpeg -s formatOptions 78 -Z 900 "$src" --out "public/assets/trades/$name.jpg" >/dev/null
  echo "public/assets/trades/$name.jpg"
done
