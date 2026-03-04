import { GoogleGenAI, Type } from "@google/genai";
import type { RoadmapStep } from "../types";

const roadmapSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A short, actionable step or topic title.",
      },
      description: {
        type: Type.STRING,
        description: "A concise, one-to-two sentence explanation of the step or topic.",
      },
    },
    required: ["title", "description"],
  },
};

const REQUEST_TIMEOUT_MS = 25_000;
const MIN_STEPS = 3;
const MAX_STEPS = 5;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Request timed out"));
    }, timeoutMs);

    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export const generateRoadmap = async (topic: string, parentTopic: string | null): Promise<RoadmapStep[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set the GEMINI_API_KEY environment variable in your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let prompt: string;
  if (parentTopic) {
    prompt = `You are helping a learner plan their studies.

Given the main goal of learning "${parentTopic}", generate a more detailed, step-by-step roadmap for the specific sub-topic: "${topic}".

Requirements:
- Focus only on the learning steps for "${topic}".
- Do not repeat the parent topic name in the steps.
- Provide between ${MIN_STEPS} and ${MAX_STEPS} concrete, learning-focused steps.
- Each step must be concise, specific, and realistically achievable.
- Do NOT invent tools, websites, or facts. Only describe the learning actions the person should take.`;
  } else {
    prompt = `You are helping a beginner plan a realistic learning path.

Generate a high-level, step-by-step learning roadmap for "${topic}".

Requirements:
- Provide between ${MIN_STEPS} and ${MAX_STEPS} main learning topics.
- Each step must be concise, concrete, and action-oriented.
- Focus on what the learner should do (study, practice, build, etc.).
- Do NOT invent tools, websites, or facts. Only describe general learning actions.`;
  }

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: roadmapSchema,
        },
      }),
      REQUEST_TIMEOUT_MS
    );

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid response format: expected an array of roadmap steps.");
    }

    if (parsed.length < MIN_STEPS || parsed.length > MAX_STEPS) {
      throw new Error(`Invalid response format: expected between ${MIN_STEPS} and ${MAX_STEPS} steps.`);
    }

    const steps = parsed.map((item: unknown) => {
      if (typeof item !== "object" || item === null) {
        throw new Error("Invalid roadmap item");
      }
      const roadmapItem = item as Record<string, unknown>;
      const rawTitle = roadmapItem.title;
      const rawDescription = roadmapItem.description;

      if (typeof rawTitle !== "string" || typeof rawDescription !== "string") {
        throw new Error("Invalid roadmap item: missing title or description");
      }

      const title = rawTitle.trim();
      const description = rawDescription.trim();

      if (!title || !description) {
        throw new Error("Invalid roadmap item: title and description must not be empty");
      }

      return { title, description };
    });

    return steps;
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message || "";
      const lower = message.toLowerCase();

      if (lower.includes("request timed out") || lower.includes("timeout")) {
        throw new Error("The AI is taking too long to respond. Please try again.");
      }

      if (
        lower.includes("api key") ||
        lower.includes("apikey") ||
        lower.includes("unauthorized") ||
        lower.includes("permission") ||
        lower.includes("401") ||
        lower.includes("403")
      ) {
        throw new Error("Invalid or missing Gemini API key. Please check the GEMINI_API_KEY value in your .env file.");
      }

      if (lower.includes("rate limit") || lower.includes("quota") || lower.includes("429")) {
        throw new Error("Rate limit exceeded for the Gemini API. Please wait a moment and try again.");
      }

      if (
        lower.includes("network") ||
        lower.includes("fetch") ||
        lower.includes("ecconn") ||
        lower.includes("getaddrinfo")
      ) {
        throw new Error("Network error while contacting Gemini. Please check your internet connection and try again.");
      }

      throw new Error(`Failed to generate roadmap: ${message}`);
    }

    throw new Error("Failed to generate roadmap: Unknown error");
  }
};