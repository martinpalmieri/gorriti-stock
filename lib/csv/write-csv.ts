export type CsvValue = string | number | boolean | null | undefined;

function escapeCsvValue(value: CsvValue, delimiter: ',' | ';') {
  if (value === null || value === undefined) return "";

  const stringValue = String(value);
  const mustQuote =
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    stringValue.includes(delimiter);

  if (!mustQuote) return stringValue;

  return `"${stringValue.replaceAll('"', '""')}"`;
}

export function toCsv<Row extends Record<string, CsvValue>>(
  columns: ReadonlyArray<keyof Row & string>,
  rows: Row[],
  options?: { delimiter?: ',' | ';' },
) {
  const delimiter = options?.delimiter ?? ",";
  const header = columns.join(delimiter);
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column], delimiter)).join(delimiter),
  );

  // Include trailing newline for better compatibility with spreadsheet apps.
  return [header, ...lines].join("\n") + "\n";
}

