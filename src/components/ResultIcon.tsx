import { Circle, CheckCircle, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ValidateTableResult } from "@/lib/validationUtils";

export function ResultIcon({
  result,
}: {
  result: ValidateTableResult[number];
}) {
  return (
    <>
      {result.correct === "correct" && (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Balance is consistent with transactions</p>
          </TooltipContent>
        </Tooltip>
      )}
      {result.correct === "incorrect" && (
        <Tooltip>
          <TooltipTrigger>
            <XCircle className="w-4 h-4 text-red-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Balance is inconsistent with transactions</p>
          </TooltipContent>
        </Tooltip>
      )}
      {result.correct === "uncertain" && (
        <Tooltip>
          <TooltipTrigger>
            <Circle className="w-4 h-4 text-yellow-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Balance is uncertain, please verify manually</p>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );
}
