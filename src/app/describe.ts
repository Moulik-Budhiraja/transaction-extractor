import { TableObject } from "@/lib/tableUtils";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

function mergeTables(tables: TableObject[]) {
  if (tables.length === 0) return { headers: [], data: [] };

  const firstHeaders = tables[0].headers;
  for (let i = 1; i < tables.length; i++) {
    const currentHeaders = tables[i].headers;
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

  const mergedData = tables.flatMap((table) => table.data);
  return {
    headers: firstHeaders,
    data: mergedData,
  };
}

export async function describeTransactions(transactions: TableObject) {
  const CHUNK_SIZE = 30;
  const descriptions = transactions.data.map((row) => row[1]); // Assuming Description is second column
  const numChunks = Math.ceil(descriptions.length / CHUNK_SIZE);
  const batches: TableObject[] = [];

  // Process in batches
  for (let i = 0; i < numChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min((i + 1) * CHUNK_SIZE, descriptions.length);

    const transactionsChunk = {
      headers: transactions.headers,
      data: transactions.data.slice(start, end),
    };

    batches.push(transactionsChunk);
  }

  const results = await Promise.all(
    batches.map(async (batch) => await describeTransactionBatch(batch))
  );

  return mergeTables(results);
}

async function describeTransactionBatch(
  transactions: TableObject
): Promise<TableObject> {
  const PROMPT_TEMPLATE = `
Please classify each of the following transaction types based on its description:

${transactions.data.map((row) => row[1]).join("\n")}

Choose from this list of possible descriptions:
Advertising
Meals & Entertainment
Repairs & Maintenance
Insurance
Fuel Cost
Supplies
Office Expense
Utilities
Telecommunications
Vehicle Repair
Tolls
Internet
Interest
License
Unknown

Output your response as a markdown table with the description in the first column and the category in the second column.

Only use unknown if the transaction name is very ambiguous, this can include things like E-transfers which don't include what they're for. Otherwise try to use your knowledge of locations, businesses, etc. to determine the category.
DO NOT include any other text in your response other than the table. YOU MUST ONLY CHOOSE FROM THE LIST OF CATEGORIES ABOVE.
`;

  const SYSTEM_MSG = `You are ChatPDF. Your job is to accept markdown versions of PDFs and answer the user's questions based on the markdown. The PDFs will not be perfectly converted (i.e. tables in the pdf may not convert to tables in the markdown, code blocks may appear randomly, etc.), so you may have to infer what something is.`;

  console.log("System msg", SYSTEM_MSG);
  console.log("Prompt template", PROMPT_TEMPLATE);

  const response = await generateText({
    system: SYSTEM_MSG,
    prompt: PROMPT_TEMPLATE,
    model: openai("gpt-4o"),
    temperature: 0,
  });

  const content = response.text;

  console.log("Content", content);

  // Parse markdown table response into array of categories
  const categories = content
    .trim()
    .split("\n")
    .slice(2) // Skip header and separator rows
    .map((row) => {
      const [, , cat] = row.split("|").map((cell) => cell.trim());
      return cat;
    });

  console.log("Categories", categories);

  // Add categories to original data
  const categorizedData = transactions.data.map((row, i) => {
    return [...row, categories[i] || "Unknown"];
  });

  return {
    headers: [...transactions.headers, "Category"],
    data: categorizedData,
  };
}
