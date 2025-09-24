import fetch from 'node-fetch';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class PerplexityService {
  private apiKey: string;
  private apiUrl = "https://api.perplexity.ai/chat/completions";

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || "";
    if (!this.apiKey) {
      console.warn("PERPLEXITY_API_KEY not found in environment variables");
    } else {
      console.log(
        "Perplexity API key loaded successfully (length:",
        this.apiKey.length,
        ")",
      );
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
    if (!this.apiKey) {
      throw new Error("Perplexity API key not configured");
    }

    const messages: PerplexityMessage[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model || "llama-3.1-sonar-small-128k-online",
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as PerplexityResponse;
      return data.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Perplexity API error:", error);
      throw error;
    }
  }

  async searchAndSummarize(query: string): Promise<string> {
    const systemPrompt = "You are a helpful assistant that provides accurate, well-researched information. Always cite sources when available.";
    
    return this.generateContent(
      query,
      systemPrompt,
      {
        model: "llama-3.1-sonar-large-128k-online", // Better for search
        temperature: 0.2, // Lower temperature for more factual responses
      }
    );
  }

  async enhanceContent(content: string, instructions: string): Promise<string> {
    const prompt = `Please enhance the following content according to these instructions: ${instructions}\n\nContent to enhance:\n${content}`;
    
    return this.generateContent(prompt, undefined, {
      temperature: 0.7,
      maxTokens: 1500,
    });
  }
}

// Singleton instance
let perplexityService: PerplexityService | null = null;

export function getPerplexityService(): PerplexityService {
  if (!perplexityService) {
    perplexityService = new PerplexityService();
  }
  return perplexityService;
}