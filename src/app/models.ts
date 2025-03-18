import { Mistral } from "@mistralai/mistralai";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { joinMarkdownTables } from "@/lib/tableUtils";
import { OCRResponse } from "@mistralai/mistralai/models/components/ocrresponse";
export async function getOCROutput(file: File, mistralApiKey: string) {
  const client = new Mistral({ apiKey: mistralApiKey });

  const uploadedPdf = await client.files.upload({
    file: {
      fileName: file.name,
      content: file,
    },
    // @ts-expect-error Mistral types are wrong
    purpose: "ocr",
  });

  const signedUrl = await client.files.getSignedUrl({
    fileId: uploadedPdf.id,
  });

  let ocr_output = null;

  try {
    ocr_output = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      },
    });
  } catch (error) {
    console.error(error);
  } finally {
    const deleteResult = await client.files.delete({ fileId: uploadedPdf.id });
    console.log(deleteResult);
  }

  return ocr_output;
}

export async function cleanOCRResponse(
  ocrResponse: OCRResponse,
  openaiApiKey: string,
  cardType: "debit" | "credit"
) {
  process.env.OPENAI_API_KEY = openaiApiKey;

  const results = await Promise.all(
    ocrResponse.pages.map(async (page) => {
      const result = await generateText({
        model: openai("gpt-4o"),
        // temperature: 0.8,
        system: `Output just the transaction table, with the numbers cleaned (ie, remove latex symbols/dollar signs). 
Propagate dates downward if they're empty.
Only keep the following columns: "Date", "Description", "Amount Withdrawn", "Amount Deposited", "Balance" (You may rename a column if it is not exact, split "Amount" into "Amount Withdrawn" and "Amount Deposited" based on its sign (deposits are ${
          cardType === "credit" ? "NEGATIVE" : "POSITIVE"
        }), splitting correctly is very important. For reference negative signs will usually occur before latex tags, but not always).
Do not modify/propagate any other columns.
Omit opening balance and closing balance.
Omit "Subtotal of Monthly Activity" rows.
If there are multiple transaction tables, join them as a single table, in the order they appear (NOT by date).
Output only markdown in a code block. (\`\`\`markdown\`\`\`).
If there is no transaction table, output \`\`\`markdown\nNO TABLE\n\`\`\`
`,
        prompt: `
    ${page.markdown}
    `,
      });

      return result.text;
    })
  );

  // Strip the \`\`\`markdown\`\`\` from the results
  const cleanedResults = results.map((result) =>
    result.replace(/```markdown/g, "").replace(/```/g, "")
  );

  console.log(cleanedResults);

  return joinMarkdownTables(
    cleanedResults.filter((result) => result.trim() !== "NO TABLE")
  );
}
