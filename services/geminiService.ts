import { GoogleGenAI, Type } from "@google/genai";

const roadmapSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A short, actionable step or topic title."
      },
      description: {
        type: Type.STRING,
        description: "A concise, one-to-two sentence explanation of the step or topic."
      }
    },
    required: ["title", "description"]
  }
};

interface RawRoadmapStep {
    title: string;
    description: string;
}

export const generateRoadmap = async (topic: string, parentTopic: string | null): Promise<RawRoadmapStep[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set the API_KEY environment variable.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  let prompt;
  if (parentTopic) {
    prompt = `Given the main goal of learning "${parentTopic}", generate a more detailed, step-by-step roadmap for the specific sub-topic: "${topic}". Focus only on the steps for "${topic}". Do not repeat the parent topic in the steps. Provide 3 to 5 steps.`;
  } else {
    prompt = `Generate a beginner-friendly, high-level, step-by-step roadmap for learning "${topic}". Provide 3 to 5 main topics.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: roadmapSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid response format: expected an array");
    }

    return parsed.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error("Invalid roadmap item");
      }
      const roadmapItem = item as Record<string, unknown>;
      const title = roadmapItem.title;
      const description = roadmapItem.description;
      
      if (typeof title !== 'string' || typeof description !== 'string') {
        throw new Error("Invalid roadmap item: missing title or description");
      }
      
      return { title: title.trim(), description: description.trim() };
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate roadmap: ${error.message}`);
    }
    throw new Error("Failed to generate roadmap: Unknown error");
  }
};