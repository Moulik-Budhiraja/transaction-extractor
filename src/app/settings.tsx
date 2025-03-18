"use client";

import { PasswordInput } from "@/components/ui/password-input";

import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useEffect, useState } from "react";

export default function Settings() {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [mistralApiKey, setMistralApiKey] = useState("");

  useEffect(() => {
    const openaiApiKey = localStorage.getItem("openaiApiKey");
    const mistralApiKey = localStorage.getItem("mistralApiKey");
    setOpenaiApiKey(openaiApiKey || "");
    setMistralApiKey(mistralApiKey || "");
  }, []);

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Settings</SheetTitle>
        <SheetDescription>Configure settings and api keys</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4">
        <div>
          <h3 className="text-lg font-bold">OpenAI API Key</h3>
          <PasswordInput
            placeholder="API Key"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
          />
        </div>
        <div>
          <h3 className="text-lg font-bold">Mistral API Key</h3>
          <PasswordInput
            placeholder="API Key"
            value={mistralApiKey}
            onChange={(e) => setMistralApiKey(e.target.value)}
          />
        </div>

        <SheetTrigger
          className="w-full cursor-pointer"
          variant="default"
          onClick={() => {
            // Save api keys to local storage
            localStorage.setItem("openaiApiKey", openaiApiKey);
            localStorage.setItem("mistralApiKey", mistralApiKey);
          }}
        >
          Save
        </SheetTrigger>
      </div>
    </SheetContent>
  );
}
