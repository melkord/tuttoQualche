import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

export interface GenerateObjectRequest<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
}

/** Astrazione minima sul modello: facilmente sostituibile nei test. */
export interface LlmClient {
  readonly model: string;
  /** Restituisce l'oggetto strutturato, o `null` se il modello rifiuta/non produce JSON valido. */
  generateObject<T>(req: GenerateObjectRequest<T>): Promise<T | null>;
}

export const DEFAULT_MODEL = 'claude-opus-5-5';

export class AnthropicLlm implements LlmClient {
  private readonly client: Anthropic;
  constructor(
    readonly model: string = DEFAULT_MODEL,
    client?: Anthropic,
  ) {
    this.client = client ?? new Anthropic();
  }

  async generateObject<T>({ system, user, schema }: GenerateObjectRequest<T>): Promise<T | null> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: zodOutputFormat(schema as never) },
    });
    if (response.stop_reason === 'refusal') return null;
    return (response.parsed_output as T | null) ?? null;
  }
}
