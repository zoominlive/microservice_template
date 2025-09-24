import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });
      console.log("OpenAI API key loaded successfully");
    } else {
      console.warn("OPENAI_API_KEY not found in environment variables");
    }
  }

  async generateContent(
    prompt: string,
    systemPrompt?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    if (!this.client) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const messages: any[] = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt,
      });

      const response = await this.client.chat.completions.create({
        model: options?.model || "gpt-3.5-turbo",
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await this.client.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("OpenAI Embedding error:", error);
      throw error;
    }
  }

  async moderateContent(content: string): Promise<{
    flagged: boolean;
    categories: any;
  }> {
    if (!this.client) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await this.client.moderations.create({
        input: content,
      });

      const result = response.results[0];
      return {
        flagged: result.flagged,
        categories: result.categories,
      };
    } catch (error) {
      console.error("OpenAI Moderation error:", error);
      throw error;
    }
  }
}

// Singleton instance
let openAIService: OpenAIService | null = null;

export function getOpenAIService(): OpenAIService {
  if (!openAIService) {
    openAIService = new OpenAIService();
  }
  return openAIService;
}