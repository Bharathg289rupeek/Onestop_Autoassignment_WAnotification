function generateLeadId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return 'LF-' + ts + '-' + rand;
}

/**
 * Parse CSV text into array of objects.
 * Handles quoted fields, commas inside quotes, and newlines.
 */
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) return [];

  // Parse header
  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (vals[idx] || '').trim();
    });
    // Skip empty rows
    if (Object.values(obj).some(v => v !== '')) {
      rows.push(obj);
    }
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

module.exports = { generateLeadId, parseCSV };
