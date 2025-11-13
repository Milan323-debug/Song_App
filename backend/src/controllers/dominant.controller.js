import Vibrant from 'node-vibrant';
import fetch from 'node-fetch';

// Simple in-memory cache to avoid repeated expensive processing.
// Keyed by image URL -> { color, textColor, expiresAt }
const cache = new Map();
const DEFAULT_TTL_MS = 1000 * 60 * 10; // 10 minutes

function hexFromRgb([r, g, b]) {
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getLuminance([r, g, b]) {
  // Convert to sRGB linear values
  const srgb = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function chooseContrastColor(hex) {
  try {
    const h = String(hex || '').replace('#', '');
    if (!h || (h.length !== 6 && h.length !== 3)) return '#ffffff';
    const expanded = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const r = parseInt(expanded.slice(0, 2), 16);
    const g = parseInt(expanded.slice(2, 4), 16);
    const b = parseInt(expanded.slice(4, 6), 16);
    const L = getLuminance([r, g, b]);
    // Contrast ratio vs white and black
    const contrastWhite = (1.0 + 0.05) / (L + 0.05);
    const contrastBlack = (L + 0.05) / (0.0 + 0.05);
    // Prefer higher contrast; we require at least some minimal contrast
    return contrastWhite >= contrastBlack ? '#ffffff' : '#000000';
  } catch (e) {
    return '#ffffff';
  }
}

export async function getDominantColor(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    // check cache
    const now = Date.now();
    const cached = cache.get(url);
    if (cached && cached.expiresAt > now) {
      return res.json({ color: cached.color, textColor: cached.textColor });
    }

    // fetch image data
    const response = await fetch(url, { size: 5 * 1024 * 1024 }); // limit to ~5MB
    if (!response.ok) {
      return res.status(502).json({ error: 'Unable to fetch image' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use node-vibrant to get palette
    const palette = await Vibrant.from(buffer).getPalette();

    // pick the swatch with highest population or fallback
    let best = null;
    for (const key of Object.keys(palette)) {
      const sw = palette[key];
      if (!sw) continue;
      try {
        if (!best || (sw.getPopulation && sw.getPopulation() > best.getPopulation())) {
          best = sw;
        }
      } catch (e) {
        // ignore swatch errors
      }
    }

    // palette may contain swatches with rgb()
    let color = '#000000';
    if (best && best.getRgb) {
      const rgb = best.getRgb();
      color = hexFromRgb(rgb.map((v) => Math.round(v)));
    } else if (palette.Vibrant && palette.Vibrant.getHex) {
      color = palette.Vibrant.getHex();
    }

    const textColor = chooseContrastColor(color);

    // store in cache
    cache.set(url, { color, textColor, expiresAt: now + DEFAULT_TTL_MS });

    return res.json({ color, textColor });
  } catch (err) {
    console.error('dominant controller error:', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'Failed to compute dominant color' });
  }
}

export default getDominantColor;
