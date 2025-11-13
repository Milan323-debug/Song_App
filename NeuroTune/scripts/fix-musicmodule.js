const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', 'react-native-track-player', 'android', 'src', 'main', 'java', 'com', 'doublesymmetry', 'trackplayer', 'module', 'MusicModule.kt');

let content = fs.readFileSync(filePath, 'utf8');
let orig = content;
let i = 0;
let out = '';

while (i < content.length) {
  // find next @ReactMethod
  let idx = content.indexOf('@ReactMethod', i);
  if (idx === -1) {
    out += content.slice(i);
    break;
  }
  // copy up to idx
  out += content.slice(i, idx);
  // from idx, copy @ReactMethod line
  let lineEnd = content.indexOf('\n', idx);
  out += content.slice(idx, lineEnd + 1);
  i = lineEnd + 1;

  // now parse the function signature starting at i
  // find 'fun' keyword
  let funIdx = content.indexOf('fun ', i);
  if (funIdx === -1 || funIdx > content.indexOf('@ReactMethod', i)) {
    // no fun found before next annotation; just continue
    i = i; 
    continue;
  }
  // copy up to funIdx
  out += content.slice(i, funIdx);
  i = funIdx;

  // find the opening brace of the coroutine block: locate 'scope.launch' after the signature
  let launchIdx = content.indexOf('scope.launch', i);
  if (launchIdx === -1) {
    // nothing to do, copy until next '@ReactMethod' and continue
    let nextIdx = content.indexOf('@ReactMethod', i);
    if (nextIdx === -1) {
      out += content.slice(i);
      break;
    } else {
      out += content.slice(i, nextIdx);
      i = nextIdx;
      continue;
    }
  }

  // determine if signature is expression-bodied using '=' before scope.launch
  let equalsBeforeLaunch = content.lastIndexOf('=', launchIdx) > content.lastIndexOf('\n', launchIdx);
  if (!equalsBeforeLaunch) {
    // signature already block-bodied; we'll just ensure it has the extra closing brace later
    // copy until the '{' opening the coroutine
    let braceIdx = content.indexOf('{', launchIdx);
    if (braceIdx === -1) {
      out += content.slice(i, launchIdx);
      i = launchIdx;
      continue;
    }
    out += content.slice(i, launchIdx);
    // now from launchIdx to braceIdx copy
    out += content.slice(launchIdx, braceIdx + 1);
    i = braceIdx + 1;
    // find matching closing brace for this coroutine
  } else {
    // convert expression-bodied signature to block-bodied
    // find start of signature until '='
    let eqIdx = content.lastIndexOf('=', launchIdx);
    // copy signature up to '(' closing
    // We'll copy from i to eqIdx, then write '{ scope.launch {' instead of '= scope.launch {'
    out += content.slice(i, eqIdx);
    out += '{ ';
    // find 'scope.launch' and write 'scope.launch {' part
    let braceIdx = content.indexOf('{', launchIdx);
    out += content.slice(launchIdx, braceIdx + 1);
    i = braceIdx + 1;
  }

  // Now i is positioned after the '{' that starts the coroutine block
  // Find the matching closing brace for this coroutine block
  let depth = 1;
  let j = i;
  while (j < content.length && depth > 0) {
    if (content[j] === '{') depth++;
    else if (content[j] === '}') depth--;
    j++;
  }
  // j is index after the matching closing brace
  // copy the coroutine block content including its closing brace
  out += content.slice(i, j);
  // now insert an extra closing brace to close the outer function
  out += '\n    }';
  // advance i
  i = j;
}

if (out === orig) {
  console.log('[fix-musicmodule] No changes made');
} else {
  fs.writeFileSync(filePath, out, 'utf8');
  console.log('[fix-musicmodule] Fixed MusicModule.kt function signatures to return Unit');
}
