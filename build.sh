#!/bin/sh
mkdir -p dist
tsc castlefall.ts --outDir dist && browserify dist/castlefall.js -o dist/castlefall.bundle.js && uglifyjs dist/castlefall.bundle.js -o dist/castlefall.min.js --source-map
cp index.html rules.html castlefall.png castlefall.ico dist
