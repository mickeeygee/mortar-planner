// WGS84 lat/lon <-> UTM <-> MGRS (Kruger n-series, mm-level). Pure functions.
(function (root) {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, n = f / (2 - f);
  const A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64);
  const al = [n / 2 - 2 * n * n / 3 + 5 * n ** 3 / 16 + 41 * n ** 4 / 180, 13 * n * n / 48 - 3 * n ** 3 / 5 + 557 * n ** 4 / 1440, 61 * n ** 3 / 240 - 103 * n ** 4 / 140, 49561 * n ** 4 / 161280];
  const be = [n / 2 - 2 * n * n / 3 + 37 * n ** 3 / 96 - n ** 4 / 360, n * n / 48 + n ** 3 / 15 - 437 * n ** 4 / 1440, 17 * n ** 3 / 480 - 37 * n ** 4 / 840, 4397 * n ** 4 / 161280];
  const de = [2 * n - 2 * n * n / 3 - 2 * n ** 3 + 116 * n ** 4 / 45, 7 * n * n / 3 - 8 * n ** 3 / 5 - 227 * n ** 4 / 45, 56 * n ** 3 / 15 - 136 * n ** 4 / 35, 4279 * n ** 4 / 630];
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const BANDS = 'CDEFGHJKLMNPQRSTUVWXX';
  const COLS = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'], ROWS = 'ABCDEFGHJKLMNPQRSTUV';

  function zoneOf(lat, lon) {
    let z = Math.floor((lon + 180) / 6) + 1;
    if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) z = 32;                       // Norway
    if (lat >= 72 && lat < 84) { if (lon >= 0 && lon < 9) z = 31; else if (lon >= 9 && lon < 21) z = 33; else if (lon >= 21 && lon < 33) z = 35; else if (lon >= 33 && lon < 42) z = 37; }  // Svalbard
    return z;
  }
  function toUTM(lat, lon, zone) {
    zone = zone || zoneOf(lat, lon);
    const lam = rad(lon - ((zone - 1) * 6 - 180 + 3)), ph = rad(lat), q = 2 * Math.sqrt(n) / (1 + n);
    const t = Math.sinh(Math.atanh(Math.sin(ph)) - q * Math.atanh(q * Math.sin(ph)));
    const xp = Math.atan2(t, Math.cos(lam)), ep = Math.asinh(Math.sin(lam) / Math.hypot(t, Math.cos(lam)));
    let xi = xp, eta = ep;
    al.forEach((c, i) => { const j = 2 * (i + 1); xi += c * Math.sin(j * xp) * Math.cosh(j * ep); eta += c * Math.cos(j * xp) * Math.sinh(j * ep); });
    return { zone, hemi: lat >= 0 ? 'N' : 'S', E: 500000 + k0 * A * eta, N: k0 * A * xi + (lat < 0 ? 1e7 : 0) };
  }
  function fromUTM(zone, hemi, E, N) {
    const xi = (N - (hemi === 'S' ? 1e7 : 0)) / (k0 * A), eta = (E - 500000) / (k0 * A);
    let xp = xi, ep = eta;
    be.forEach((c, i) => { const j = 2 * (i + 1); xp -= c * Math.sin(j * xi) * Math.cosh(j * eta); ep -= c * Math.cos(j * xi) * Math.sinh(j * eta); });
    const chi = Math.asin(Math.sin(xp) / Math.cosh(ep));
    let ph = chi; de.forEach((c, i) => { ph += c * Math.sin(2 * (i + 1) * chi); });
    return { lat: deg(ph), lon: (zone - 1) * 6 - 180 + 3 + deg(Math.atan2(Math.sinh(ep), Math.cos(xp))) };
  }
  const bandOf = lat => BANDS[Math.min(20, Math.max(0, Math.floor((lat + 80) / 8)))];

  function toMGRS(lat, lon, digits) {
    digits = digits == null ? 5 : digits;
    if (lat < -80 || lat > 84) return null;
    const u = toUTM(lat, lon), e100 = Math.floor(u.E / 1e5), n100 = Math.floor(u.N / 1e5);
    const col = COLS[(u.zone - 1) % 3][e100 - 1], row = ROWS[(n100 + (u.zone % 2 === 0 ? 5 : 0)) % 20];
    const sh = 5 - digits, pad = (v) => String(Math.floor((v % 1e5) / Math.pow(10, sh))).padStart(digits, '0');
    return `${u.zone}${bandOf(lat)} ${col}${row} ${pad(u.E)} ${pad(u.N)}`;
  }
  function fromMGRS(str) {
    const s = String(str).toUpperCase().replace(/[\s,.-]+/g, '');
    const m = s.match(/^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z])([A-HJ-NP-V])(\d*)$/);
    if (!m || m[5].length % 2) return null;
    const zone = +m[1], band = m[2], colL = m[3], rowL = m[4], h = m[5].length / 2;
    if (zone < 1 || zone > 60) return null;
    const ci = COLS[(zone - 1) % 3].indexOf(colL); if (ci < 0) return null;
    const sc = Math.pow(10, 5 - h), e = h ? +m[5].slice(0, h) * sc : 0, nn = h ? +m[5].slice(h) * sc : 0;
    const E = (ci + 1) * 1e5 + e, rowIdx = ((ROWS.indexOf(rowL) - (zone % 2 === 0 ? 5 : 0)) % 20 + 20) % 20;
    const hemi = band >= 'N' ? 'N' : 'S';
    for (let k = 0; k < 10; k++) {                 // northing repeats every 2,000 km: pick the one inside the latitude band
      const N = rowIdx * 1e5 + nn + k * 2e6, p = fromUTM(zone, hemi, E, N);
      if (bandOf(p.lat) === band && Math.abs(p.lat) <= 84 && (hemi === 'N') === (p.lat >= 0)) return { lat: p.lat, lon: p.lon, zone };
    }
    return null;
  }
  // free-form parse: "35.1, -79.0" | "35.1 -79.0" | MGRS
  function parseCoord(str) {
    const t = String(str || '').trim(); if (!t) return null;
    const d = t.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
    if (d) { const lat = +d[1], lon = +d[2]; return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null; }
    return fromMGRS(t);
  }
  root.MGRS = { toUTM, fromUTM, toMGRS, fromMGRS, parseCoord };
  if (typeof module !== 'undefined') module.exports = root.MGRS;
})(typeof window !== 'undefined' ? window : globalThis);

