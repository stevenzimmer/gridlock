import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (cachedClient) {
        return cachedClient;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable.");
    }

    cachedClient = new OpenAI({apiKey});
    return cachedClient;
}

export function getOpenAIModel(): string {
    return process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
}
