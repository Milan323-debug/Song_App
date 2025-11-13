const fs = require('fs');
const path = require('path');

// Path to the MusicModule.kt inside the installed package
const filePath = path.join(__dirname, '..', 'node_modules', 'react-native-track-player', 'android', 'src', 'main', 'java', 'com', 'doublesymmetry', 'trackplayer', 'module', 'MusicModule.kt');

try {
  if (!fs.existsSync(filePath)) {
    console.log('[patch-track-player] MusicModule.kt not found, skipping patch.');
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Make multiple safe replacements to ensure nullable Bundles are handled.
  const replacements = [
    // getPlayerStateBundle fallback
    {
      re: /Arguments\.fromBundle\(\s*musicService\.getPlayerStateBundle\(musicService\.state\)\s*\)/g,
      rep: 'Arguments.fromBundle(musicService.getPlayerStateBundle(musicService.state) ?: Bundle())'
    },
    // tracks[index].originalItem -> add fallback
    {
      re: /Arguments\.fromBundle\(\s*musicService\.tracks\[index\]\.originalItem\s*\)/g,
      rep: 'Arguments.fromBundle(musicService.tracks[index].originalItem ?: Bundle())'
    },
    // current track originalItem
    {
      re: /Arguments\.fromBundle\(\s*musicService\.tracks\[musicService\.getCurrentTrackIndex\(\)\]\.originalItem\s*\)/g,
      rep: 'Arguments.fromBundle(musicService.tracks[musicService.getCurrentTrackIndex()].originalItem ?: Bundle())'
    },
    // generic originalItem occurrences without ?: Bundle()
    {
      re: /Arguments\.fromBundle\(\s*([^\)]+?)\.originalItem\s*\)/g,
      rep: (match, p1) => `Arguments.fromBundle(${p1}.originalItem ?: Bundle())`
    }
  ];

  let changed = false;
  for (const r of replacements) {
    if (typeof r.rep === 'string') {
      if (r.re.test(content) && !content.includes('?: Bundle()')) {
        content = content.replace(r.re, r.rep);
        changed = true;
      }
    } else {
      // function-based replacement
      content = content.replace(r.re, r.rep);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[patch-track-player] Applied null-safety replacements to MusicModule.kt');
  } else {
    console.log('[patch-track-player] No applicable patterns found or already patched.');
  }
} catch (err) {
  console.error('[patch-track-player] Failed to apply patch:', err);
  process.exit(1);
}
