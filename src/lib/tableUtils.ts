/**
 * Converts a markdown table string to CSV format
 * @param markdownTable The markdown table string to convert
 * @returns CSV formatted string
 */
export function markdownTableToCsv(markdownTable: string): string {
  // Split into lines and remove empty lines
  const lines = markdownTable.split("\n").filter((line) => line.trim());

  if (lines.length < 2) return "";

  // Process each line into cells, handling escaped pipes
  const rows = lines.map((line) => {
    const cells = [];
    let currentCell = "";
    let inBackticks = false;

    // Remove leading/trailing pipes
    line = line.trim().replace(/^\||\|$/g, "");

    // Parse considering escaped pipes
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "`") {
        inBackticks = !inBackticks;
        currentCell += line[i];
      } else if (line[i] === "|" && !inBackticks) {
        cells.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += line[i];
      }
    }
    cells.push(currentCell.trim());
    return cells;
  });

  // Remove the separator line (e.g. |---|---|)
  const headers = rows[0];
  const data = rows.slice(2);

  // Convert to CSV
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      row
        .map((cell) => {
          // Escape quotes, backticks, and wrap in quotes if contains special chars
          const escaped = cell.replace(/"/g, '""');
          return /[,"\n\r`]/.test(cell) ? `"${escaped}"` : escaped;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
}

/**
 * Joins multiple markdown tables into a single table
 * @param tables Array of markdown table strings to join
 * @returns Combined markdown table string
 * @throws Error if table headers don't match
 */
export function joinMarkdownTables(tables: string[]): string {
  if (tables.length === 0) return "";
  if (tables.length === 1) return tables[0];

  // Process each table into rows
  const processedTables = tables.map((table) => {
    const lines = table.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return { headers: [], data: [] };

    const rows = lines.map((line) => {
      return line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());
    });

    return {
      headers: rows[0].map((header) => header.trim()),
      data: rows.slice(2), // Skip separator row
    };
  });

  // Verify all headers match
  const firstHeaders = processedTables[0].headers;
  for (let i = 1; i < processedTables.length; i++) {
    const currentHeaders = processedTables[i].headers;
    if (
      currentHeaders.length !== firstHeaders.length ||
      !currentHeaders.every((header, idx) => header === firstHeaders[idx])
    ) {
      throw new Error(
        `All tables must have matching headers\n\nMismatch in table ${
          i + 1
        }: ${currentHeaders.join(", ")}\n\nExpected: ${firstHeaders.join(", ")}`
      );
    }
  }

  // Combine all data rows
  const allData = processedTables.flatMap((table) => table.data);

  // Reconstruct markdown table with single spaces around pipes
  const headerRow = `|${firstHeaders.map((h) => ` ${h} `).join("|")}|`;
  const separatorRow = `|${firstHeaders.map(() => " --- ").join("|")}|`;
  const dataRows = allData.map(
    (row) => `|${row.map((cell) => ` ${cell} `).join("|")}|`
  );

  return [headerRow, separatorRow, ...dataRows].join("\n");
}

export type TableObject = {
  headers: string[];
  data: string[][];
};

export function markdownTableToObject(markdownTable: string): TableObject {
  const csv = markdownTableToCsv(markdownTable);

  // Parse CSV properly accounting for quoted values
  const parseCSVRow = (row: string): string[] => {
    const cells: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Handle escaped quotes
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cells.push(cell);
        cell = "";
      } else {
        cell += char;
      }
    }
    cells.push(cell); // Add the last cell
    return cells;
  };

  const rows = csv.split("\n");
  const headers = parseCSVRow(rows[0]);
  const data = rows.slice(1).map((row) => parseCSVRow(row));

  return { headers, data };
}

/**
 * Converts a TableObject to CSV format
 * @param table The TableObject to convert
 * @returns CSV formatted string
 */
export function tableObjectToCsv(table: TableObject): string {
  const csvRows = [
    table.headers.join(","),
    ...table.data.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains special chars
          const escaped = cell.replace(/"/g, '""');
          return /[,"\n\r]/.test(cell) ? `"${escaped}"` : escaped;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
}
