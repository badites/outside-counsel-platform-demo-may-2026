/**
 * Simple CSV parser and serializer.
 * No external dependencies — handles quoted fields and newlines within quotes.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field.trim());
        field = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        row.push(field.trim());
        if (row.some((f) => f !== "")) {
          rows.push(row);
        }
        row = [];
        field = "";
        if (char === "\r") i++; // skip \n after \r
      } else {
        field += char;
      }
    }
  }

  // Handle last field/row
  row.push(field.trim());
  if (row.some((f) => f !== "")) {
    rows.push(row);
  }

  return rows;
}

export function serializeCsv(headers: string[], rows: string[][]): string {
  const escape = (val: string): string => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];

  return lines.join("\n");
}
