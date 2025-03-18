"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Cog } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";

import Settings from "./settings";

import { useState } from "react";
import { cleanOCRResponse, getOCROutput } from "./models";

import {
  markdownTableToCsv,
  markdownTableToObject,
  TableObject,
  tableObjectToCsv,
} from "@/lib/tableUtils";
import { validateTable, ValidateTableResult } from "@/lib/validationUtils";
import { ResultIcon } from "@/components/ResultIcon";
import { describeTransactions } from "./describe";

type RenderTable = {
  table: TableObject;
  validationResult: ValidateTableResult | null;
};

export default function Home() {
  const [downloadTarget, setDownloadTarget] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [cardType, setCardType] = useState<"debit" | "credit">("debit");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressDescription, setProgressDescription] = useState("");
  const [renderTables, setRenderTables] = useState<RenderTable | null>(null);
  const [describe, setDescribe] = useState(false);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFiles(Array.from(files));
    }
  };

  const handleSubmit = async () => {
    setDownloadTarget("");
    setRenderTables(null);

    if (!files || files.length === 0) {
      toast.error("Please upload a file");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setProgressDescription("Running OCR...");

    const ocr_output = await getOCROutput(
      files[0],
      localStorage.getItem("mistralApiKey") || ""
    );

    setProgress(50 - (describe ? 20 : 0));
    setProgressDescription("Cleaning OCR response...");

    console.log(ocr_output);

    if (!ocr_output) {
      setIsLoading(false);
      return;
    }

    setProgress(60 - (describe ? 20 : 0));
    setProgressDescription("Cleaning Data...");

    const cleanedOCRResponse = await cleanOCRResponse(
      ocr_output,
      localStorage.getItem("openaiApiKey") || "",
      cardType
    );

    console.log(cleanedOCRResponse);
    setDownloadTarget(markdownTableToCsv(cleanedOCRResponse));

    setProgress(90 - (describe ? 20 : 0));
    setProgressDescription("Validating transactions...");

    const table = markdownTableToObject(cleanedOCRResponse);
    const validationResult = validateTable(table, cardType);

    console.log(table.data.length, validationResult.length);

    if (describe) {
      setProgress(90 - (describe ? 20 : 0));
      setProgressDescription("Describing transactions...");

      const describedTable = await describeTransactions(table);
      setRenderTables({ table: describedTable, validationResult });
      setDownloadTarget(tableObjectToCsv(describedTable));
    } else {
      setRenderTables({ table, validationResult });
    }

    console.log(validationResult);

    toast.success("Successfully extracted transactions", {
      action: {
        label: "View",
        onClick: () => {
          const table = document.getElementById("table");
          if (table) {
            table.scrollIntoView({ behavior: "smooth" });
          }
        },
      },
    });

    setProgress(100);
    setProgressDescription("Done!");

    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  console.log(renderTables);

  const incorrectTransactions =
    renderTables?.validationResult?.reduce(
      (acc, curr) => (curr.correct === "incorrect" ? acc + 1 : acc),
      0
    ) || 0;

  const uncertainTransactions =
    renderTables?.validationResult?.reduce(
      (acc, curr) => (curr.correct === "uncertain" ? acc + 1 : acc),
      0
    ) || 0;

  return (
    <main className="flex flex-col items-center">
      <Sheet>
        <div className="flex flex-col gap-4  items-center justify-center min-h-screen max-w-2xl">
          <SheetTrigger
            className="absolute top-4 right-4 cursor-pointer"
            variant="outline"
            size="icon"
          >
            <Cog className="w-4 h-4" />
          </SheetTrigger>

          <h2 className="text-2xl font-bold">Upload PDFs</h2>
          <Input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <div className="flex flex-row gap-4">
            <div className="flex flex-row gap-2 items-center">
              <Input
                type="radio"
                id="debit"
                name="card"
                className="w-4 h-4"
                checked={cardType === "debit"}
                onChange={() => setCardType("debit")}
                disabled={isLoading}
              />
              <label htmlFor="debit">Debit Card</label>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <Input
                type="radio"
                id="credit"
                name="card"
                className="w-4 h-4"
                checked={cardType === "credit"}
                onChange={() => setCardType("credit")}
                disabled={isLoading}
              />
              <label htmlFor="credit">Credit Card</label>
            </div>
          </div>
          <div className="flex flex-row gap-2 items-center">
            <Input
              type="checkbox"
              id="describe"
              className="w-4 h-4"
              checked={describe}
              onChange={(e) => setDescribe(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="describe">Describe transactions</label>
          </div>
          {isLoading && (
            <ProgressBar
              progress={progress}
              description={progressDescription}
            />
          )}
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Processing..." : "Submit"}
          </Button>
        </div>

        {/* <div className="flex flex-col gap-4 items-center justify-center max-w-3xl">
          <Markdown markdown={ocrOutput} />
        </div> */}

        <div className="flex flex-col gap-4 items-center justify-center max-w-4xl -mt-20">
          {renderTables && (
            <>
              <div className="flex flex-row gap-2 justify-between w-full">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold">Transactions</h2>
                  <p className="text-sm text-gray-500">
                    {renderTables?.table.data.length} items
                    {incorrectTransactions > 0 && (
                      <>
                        ,{" "}
                        <span className="text-red-500">
                          {incorrectTransactions} errors
                        </span>
                      </>
                    )}
                    {uncertainTransactions > 0 && (
                      <>
                        ,{" "}
                        <span className="text-yellow-500">
                          {uncertainTransactions} uncertain
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {downloadTarget && (
                  <div className="flex flex-row gap-2">
                    {/* <Button
                      variant="outline"
                      onClick={async () => {
                        const result = await describeTransactions(
                          renderTables.table
                        );
                        console.log(result);
                      }}
                    >
                      Describe
                    </Button> */}
                    <Button onClick={() => saveAsCSV(downloadTarget)}>
                      Download
                    </Button>
                  </div>
                )}
              </div>
              <Table id="table">
                <TableHeader>
                  <TableRow>
                    {renderTables.table.headers.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderTables.table.data.map((row, index) => (
                    <TableRow key={`${row.join(",")}-${index}`}>
                      {row.map((cell, cellIndex) => (
                        <TableCell
                          key={`${cell}-${cellIndex}-${index}`}
                          className="max-w-80 truncate"
                        >
                          {cell}
                        </TableCell>
                      ))}

                      <TableCell className="flex flex-row gap-2 justify-center items-center">
                        {renderTables.validationResult &&
                        renderTables.validationResult[index] ? (
                          <ResultIcon
                            result={renderTables.validationResult[index]}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        <Settings />
      </Sheet>
    </main>
  );
}

function saveAsCSV(csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  a.click();
}

type ProgressBarProps = {
  progress: number;
  description: string;
};

function ProgressBar({ progress, description }: ProgressBarProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-sm text-gray-500">{description}</p>
      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
