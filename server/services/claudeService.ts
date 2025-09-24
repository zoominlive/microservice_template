import Anthropic from '@anthropic-ai/sdk';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ClaudeService {
  private client: Anthropic | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    
    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
      console.log("Claude API key loaded successfully");
    } else {
      console.warn("ANTHROPIC_API_KEY not found in environment variables");
    }
  }

  async generateContent(
    prompt: string,
    systemPrompt?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      messages?: ClaudeMessage[];
    }
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Claude API key not configured");
    }

    try {
      const messages = options?.messages || [
        {
          role: 'user' as const,
          content: prompt,
        },
      ];

      const response = await this.client.messages.create({
        model: options?.model || "claude-3-haiku-20240307",
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
        system: systemPrompt,
        messages,
      });

      // Extract text content from the response
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      return content;
    } catch (error) {
      console.error("Claude API error:", error);
      throw error;
    }
  }

  async analyzeContent(
    content: string,
    analysisType: 'summary' | 'sentiment' | 'extract' | 'explain',
    additionalInstructions?: string
  ): Promise<string> {
    const prompts = {
      summary: "Please provide a concise summary of the following content:",
      sentiment: "Analyze the sentiment and tone of the following content:",
      extract: "Extract the key information and data points from the following content:",
      explain: "Explain the following content in simple terms:",
    };

    const systemPrompt = "You are an expert analyst. Provide clear, accurate, and helpful analysis.";
    
    let prompt = prompts[analysisType] + "\n\n" + content;
    if (additionalInstructions) {
      prompt += "\n\nAdditional instructions: " + additionalInstructions;
    }

    return this.generateContent(prompt, systemPrompt, {
      model: "claude-3-sonnet-20240229", // Better for analysis tasks
      temperature: 0.3, // Lower temperature for analytical tasks
      maxTokens: 1500,
    });
  }

  async generateStructuredContent(
    data: any,
    template: string,
    instructions?: string
  ): Promise<string> {
    const systemPrompt = "You are a content generation specialist. Generate well-structured, professional content based on the provided template and data.";
    
    const prompt = `
      Template: ${template}
      
      Data: ${JSON.stringify(data, null, 2)}
      
      ${instructions ? `Instructions: ${instructions}` : ''}
      
      Please generate content based on the template and data provided.
    `;

    return this.generateContent(prompt, systemPrompt, {
      temperature: 0.5,
      maxTokens: 2000,
    });
  }

  async chat(
    messages: ClaudeMessage[],
    systemPrompt?: string
  ): Promise<string> {
    return this.generateContent('', systemPrompt, {
      messages,
      model: "claude-3-sonnet-20240229",
      maxTokens: 2000,
    });
  }
}

// Singleton instance
let claudeService: ClaudeService | null = null;

export function getClaudeService(): ClaudeService {
  if (!claudeService) {
    claudeService = new ClaudeService();
  }
  return claudeService;
}