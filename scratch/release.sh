npm run build
npm run docs
npm run release -- --prerelease --release-as 0.0.1-alpha.14
git push origin main --tags
npm publish