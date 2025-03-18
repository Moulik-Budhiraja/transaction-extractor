import { TableObject } from "./tableUtils";

export type ValidateTableResult = {
  correct: "correct" | "incorrect" | "uncertain";
  delta: number;
}[];

export function validateTable(
  table: TableObject,
  cardType: "debit" | "credit"
) {
  const { headers, data } = table;

  const balanceColName = "Balance";
  const positiveColName =
    cardType === "debit" ? "Amount Deposited" : "Amount Withdrawn";
  const negativeColName =
    cardType === "debit" ? "Amount Withdrawn" : "Amount Deposited";

  // Initialize result object
  const result: ValidateTableResult = [];

  // Get column indices
  const balanceIdx = headers.indexOf(balanceColName);
  const positiveIdx = headers.indexOf(positiveColName);
  const negativeIdx = headers.indexOf(negativeColName);

  let lastKnownBalance: number | null = null;
  let lastKnownBalanceIndex: number = -1;

  const parseAmount = (value: string) => {
    return parseFloat(value.replace(/,/g, ""));
  };

  // First pass: Find first available balance (grounding balance)
  for (let i = 0; i < data.length; i++) {
    const balance = parseAmount(data[i][balanceIdx]);
    if (!isNaN(balance)) {
      lastKnownBalance = balance;
      lastKnownBalanceIndex = i;
      result[i] = { correct: "correct", delta: 0 };
      break;
    }
    // Mark all entries before first balance as uncertain
    result[i] = { correct: "uncertain", delta: 0 };
  }

  console.log("Last known balance index", lastKnownBalanceIndex);
  console.log("First known balance", lastKnownBalance);

  // Second pass: Validate running balance
  for (let i = lastKnownBalanceIndex + 1; i < data.length; i++) {
    const currentBalance = parseAmount(data[i][balanceIdx]);

    if (isNaN(currentBalance)) {
      // No balance available for this row
      result[i] = { correct: "uncertain", delta: 0 };
      continue;
    }

    if (lastKnownBalance === null) {
      // Should never happen as we found grounding balance
      result[i] = { correct: "uncertain", delta: 0 };
      continue;
    }

    console.log("Evaluating row", i);
    console.log("Last known balance", lastKnownBalance);
    console.log("Current balance", currentBalance);

    // Accumulate all transactions between last known balance and current balance
    let totalPositive = 0;
    let totalNegative = 0;
    for (let j = lastKnownBalanceIndex + 1; j <= i; j++) {
      totalPositive += parseAmount(data[j][positiveIdx]) || 0;
      totalNegative += parseAmount(data[j][negativeIdx]) || 0;
    }

    // Calculate expected balance using accumulated transactions
    const expectedBalance = lastKnownBalance + totalPositive - totalNegative;
    const delta = currentBalance - expectedBalance;

    // Mark all rows between last known balance and current balance
    for (let j = lastKnownBalanceIndex + 1; j <= i; j++) {
      result[j] = {
        correct: Math.abs(delta) < 0.01 ? "correct" : "incorrect",
        delta: delta,
      };
    }

    // Update last known balance
    lastKnownBalance = currentBalance;
    lastKnownBalanceIndex = i;
  }

  // Mark all remaining rows after last known balance as uncertain
  for (let i = lastKnownBalanceIndex + 1; i < data.length; i++) {
    result[i] = { correct: "uncertain", delta: 0 };
  }

  return result;
}
