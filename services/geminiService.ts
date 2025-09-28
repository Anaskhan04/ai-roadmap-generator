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
    const roadmapData = JSON.parse(jsonText);
    
    if (Array.isArray(roadmapData) && roadmapData.every(item => typeof item.title === 'string' && typeof item.description === 'string')) {
      return roadmapData as RawRoadmapStep[];
    } else {
      console.error("Parsed JSON does not match expected structure:", roadmapData);
      throw new Error("AI response was not in the expected format.");
    }

  } catch (error) {
    console.error("Error generating roadmap:", error);
    throw new Error("Failed to generate roadmap from AI. The API key might be invalid or the service may be unavailable.");
  }
};