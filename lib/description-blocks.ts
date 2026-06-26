import { z } from 'zod';

const textBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

const imageBlockSchema = z.object({
  type: z.literal('image'),
  url: z.string().url(),
  alt: z.string().optional(),
});

const videoBlockSchema = z.object({
  type: z.literal('video'),
  url: z.string().url(),
  provider: z.string().optional(),
});

export const descriptionBlockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
]);

export type DescriptionBlock = z.infer<typeof descriptionBlockSchema>;

export const descriptionBlocksSchema = z.array(descriptionBlockSchema);

export function descriptionPlainText(
  description: string,
  blocks?: DescriptionBlock[] | null,
): string {
  if (blocks && blocks.length > 0) {
    return blocks
      .filter((block) => block.type === 'text')
      .map((block) => block.text.trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return description.trim();
}
