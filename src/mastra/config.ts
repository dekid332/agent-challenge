import { createOpenAI } from "@ai-sdk/openai";
import { config } from "dotenv";

config();

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: process.env.API_BASE_URL || "https://api.openai.com/v1",
});

export const model = openai(process.env.MODEL_NAME_AT_ENDPOINT || "gpt-4o-mini");