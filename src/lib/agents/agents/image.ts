/**
 * Image Agent
 * Handles AI image generation for marketing and product visuals
 */

import { BaseAgent } from '../base-agent';
import { AgentRegistry } from '../registry';
import type { AgentConfig, AgentTool } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ImageGenerationRequest {
  prompt: string;
  style?: ImageStyle;
  aspectRatio?: AspectRatio;
  model?: ImageModel;
  useCase?: ImageUseCase;
  brandContext?: BrandContext;
  referenceImageUrl?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  enhancedPrompt?: string;
  model: ImageModel;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  useCase?: ImageUseCase;
  dimensions: { width: number; height: number };
  costUsd: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export type ImageStyle =
  | 'photorealistic'
  | 'cinematic'
  | 'illustration'
  | '3d_render'
  | 'minimalist'
  | 'vintage'
  | 'artistic'
  | 'product';

export type AspectRatio =
  | '1:1'
  | '16:9'
  | '9:16'
  | '4:3'
  | '3:4'
  | '21:9';

export type ImageModel =
  | 'flux-dev'
  | 'flux-schnell'
  | 'flux-pro'
  | 'flux-kontext'
  | 'flux-kontext-pro';

export type ImageUseCase =
  | 'product_photo'
  | 'product_variation'
  | 'marketing_banner'
  | 'social_media'
  | 'hero_image'
  | 'lifestyle'
  | 'abstract';

export interface BrandContext {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  mood?: string;
  industry?: string;
  targetAudience?: string;
}

export interface ImageTemplate {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  useCase: ImageUseCase;
}

// ============================================================================
// Constants
// ============================================================================

const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '4:3': { width: 1152, height: 896 },
  '3:4': { width: 896, height: 1152 },
  '21:9': { width: 1536, height: 640 },
};

const MODEL_COSTS: Record<ImageModel, number> = {
  'flux-schnell': 0.003,
  'flux-dev': 0.025,
  'flux-pro': 0.05,
  'flux-kontext': 0.025,
  'flux-kontext-pro': 0.04,
};

// ============================================================================
// Mock Data Store
// ============================================================================

const mockImages: Map<string, GeneratedImage> = new Map();
const mockTemplates: Map<string, ImageTemplate> = new Map();

function initMockData(): void {
  if (mockTemplates.size > 0) return;

  const templates: ImageTemplate[] = [
    {
      id: 'tpl_product_hero',
      name: 'Product Hero Shot',
      description: 'Professional product photography with clean background',
      promptTemplate: '{{product}} professional product photography, studio lighting, clean white background, high-end commercial shot, 8k resolution',
      style: 'photorealistic',
      aspectRatio: '1:1',
      useCase: 'product_photo',
    },
    {
      id: 'tpl_lifestyle',
      name: 'Lifestyle Scene',
      description: 'Product in a lifestyle context',
      promptTemplate: '{{product}} in modern {{setting}}, lifestyle photography, natural lighting, warm atmosphere, aspirational, high quality',
      style: 'photorealistic',
      aspectRatio: '16:9',
      useCase: 'lifestyle',
    },
    {
      id: 'tpl_social_square',
      name: 'Social Media Square',
      description: 'Eye-catching social media post',
      promptTemplate: '{{subject}}, vibrant colors, social media style, trendy aesthetic, high engagement, {{mood}} mood',
      style: 'artistic',
      aspectRatio: '1:1',
      useCase: 'social_media',
    },
    {
      id: 'tpl_banner',
      name: 'Marketing Banner',
      description: 'Wide banner for marketing campaigns',
      promptTemplate: '{{subject}}, cinematic wide shot, professional marketing imagery, {{brand_colors}}, premium quality',
      style: 'cinematic',
      aspectRatio: '21:9',
      useCase: 'marketing_banner',
    },
    {
      id: 'tpl_hero',
      name: 'Website Hero',
      description: 'Large hero image for websites',
      promptTemplate: '{{subject}}, epic wide angle, website hero image, professional, modern, {{mood}}',
      style: 'cinematic',
      aspectRatio: '16:9',
      useCase: 'hero_image',
    },
  ];

  for (const template of templates) {
    mockTemplates.set(template.id, template);
  }

  // Sample generated images
  const sampleImages: GeneratedImage[] = [
    {
      id: 'img_001',
      url: 'https://example.com/generated/product-shot-1.png',
      prompt: 'Sleek wireless headphones product photography',
      enhancedPrompt: 'Sleek wireless headphones, professional product photography, studio lighting, clean white background, high-end commercial shot, 8k resolution',
      model: 'flux-dev',
      style: 'photorealistic',
      aspectRatio: '1:1',
      useCase: 'product_photo',
      dimensions: { width: 1024, height: 1024 },
      costUsd: 0.025,
      createdAt: new Date(),
    },
  ];

  for (const image of sampleImages) {
    mockImages.set(image.id, image);
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function enhancePrompt(
  prompt: string,
  style: ImageStyle,
  brandContext?: BrandContext
): string {
  let enhanced = prompt;

  // Add style modifiers
  const styleModifiers: Record<ImageStyle, string> = {
    photorealistic: ', professional photography, high resolution, realistic lighting',
    cinematic: ', cinematic lighting, dramatic atmosphere, movie still quality',
    illustration: ', digital illustration, artistic style, detailed artwork',
    '3d_render': ', 3D render, octane render, high quality CGI',
    minimalist: ', minimalist design, clean composition, simple elegant',
    vintage: ', vintage aesthetic, retro style, film grain, nostalgic',
    artistic: ', artistic interpretation, creative style, unique perspective',
    product: ', product photography, studio lighting, commercial quality',
  };

  enhanced += styleModifiers[style] || '';

  // Add brand context
  if (brandContext) {
    if (brandContext.colors?.primary) {
      enhanced += `, featuring ${brandContext.colors.primary} color tones`;
    }
    if (brandContext.mood) {
      enhanced += `, ${brandContext.mood} mood`;
    }
  }

  return enhanced;
}

async function generateImage(args: {
  prompt: string;
  style?: ImageStyle;
  aspect_ratio?: AspectRatio;
  model?: ImageModel;
  use_case?: ImageUseCase;
  brand_context?: BrandContext;
  reference_image_url?: string;
}): Promise<GeneratedImage> {
  initMockData();

  const {
    prompt,
    style = 'photorealistic',
    aspect_ratio = '1:1',
    model = 'flux-dev',
    use_case,
    brand_context,
  } = args;

  const dimensions = ASPECT_RATIO_DIMENSIONS[aspect_ratio];
  const enhancedPrompt = enhancePrompt(prompt, style, brand_context);
  const cost = MODEL_COSTS[model] || 0.025;

  // In production, this would call the actual image generation API
  const image: GeneratedImage = {
    id: generateImageId(),
    url: `https://storage.example.com/generated/${Date.now()}.png`,
    prompt,
    enhancedPrompt,
    model,
    style,
    aspectRatio: aspect_ratio,
    useCase: use_case,
    dimensions,
    costUsd: cost,
    createdAt: new Date(),
    metadata: {
      brandContext: brand_context,
      hasReference: !!args.reference_image_url,
    },
  };

  mockImages.set(image.id, image);
  return image;
}

async function generateVariation(args: {
  image_id: string;
  variation_prompt: string;
}): Promise<GeneratedImage> {
  initMockData();

  const originalImage = mockImages.get(args.image_id);
  if (!originalImage) {
    throw new Error(`Image ${args.image_id} not found`);
  }

  // Create variation based on original
  const variation: GeneratedImage = {
    id: generateImageId(),
    url: `https://storage.example.com/generated/${Date.now()}-var.png`,
    prompt: args.variation_prompt,
    enhancedPrompt: `Based on previous image: ${args.variation_prompt}`,
    model: 'flux-kontext',
    style: originalImage.style,
    aspectRatio: originalImage.aspectRatio,
    useCase: 'product_variation',
    dimensions: originalImage.dimensions,
    costUsd: MODEL_COSTS['flux-kontext'],
    createdAt: new Date(),
    metadata: {
      originalImageId: args.image_id,
      isVariation: true,
    },
  };

  mockImages.set(variation.id, variation);
  return variation;
}

async function getTemplates(args: {
  use_case?: ImageUseCase;
}): Promise<{ templates: ImageTemplate[] }> {
  initMockData();

  let templates = Array.from(mockTemplates.values());

  if (args.use_case) {
    templates = templates.filter((t) => t.useCase === args.use_case);
  }

  return { templates };
}

async function listImages(args: {
  use_case?: ImageUseCase;
  style?: ImageStyle;
  limit?: number;
}): Promise<{ images: GeneratedImage[]; total: number }> {
  initMockData();

  let images = Array.from(mockImages.values());

  if (args.use_case) {
    images = images.filter((i) => i.useCase === args.use_case);
  }

  if (args.style) {
    images = images.filter((i) => i.style === args.style);
  }

  images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const limit = args.limit || 20;
  return {
    images: images.slice(0, limit),
    total: images.length,
  };
}

async function estimateCost(args: {
  model: ImageModel;
  count: number;
}): Promise<{
  model: ImageModel;
  count: number;
  costPerImage: number;
  totalCost: number;
  currency: string;
}> {
  const costPerImage = MODEL_COSTS[args.model] || 0.025;
  return {
    model: args.model,
    count: args.count,
    costPerImage,
    totalCost: Math.round(costPerImage * args.count * 1000) / 1000,
    currency: 'USD',
  };
}

// ============================================================================
// Agent Tools Definition
// ============================================================================

const IMAGE_TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate an AI image from a text prompt with style and aspect ratio options.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image description prompt' },
          style: {
            type: 'string',
            description: 'Visual style',
            enum: ['photorealistic', 'cinematic', 'illustration', '3d_render', 'minimalist', 'vintage', 'artistic', 'product'],
          },
          aspect_ratio: {
            type: 'string',
            description: 'Image aspect ratio',
            enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
          },
          model: {
            type: 'string',
            description: 'AI model to use',
            enum: ['flux-schnell', 'flux-dev', 'flux-pro', 'flux-kontext', 'flux-kontext-pro'],
          },
          use_case: {
            type: 'string',
            description: 'Intended use case',
            enum: ['product_photo', 'product_variation', 'marketing_banner', 'social_media', 'hero_image', 'lifestyle', 'abstract'],
          },
          brand_context: {
            type: 'object',
            description: 'Brand colors, mood, and style preferences',
          },
          reference_image_url: {
            type: 'string',
            description: 'URL of reference image for variations',
          },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_variation',
      description: 'Generate a variation of an existing image with modifications.',
      parameters: {
        type: 'object',
        properties: {
          image_id: { type: 'string', description: 'Original image ID' },
          variation_prompt: { type: 'string', description: 'Description of desired changes' },
        },
        required: ['image_id', 'variation_prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_templates',
      description: 'Get available image generation templates.',
      parameters: {
        type: 'object',
        properties: {
          use_case: {
            type: 'string',
            enum: ['product_photo', 'product_variation', 'marketing_banner', 'social_media', 'hero_image', 'lifestyle', 'abstract'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_images',
      description: 'List previously generated images.',
      parameters: {
        type: 'object',
        properties: {
          use_case: { type: 'string', description: 'Filter by use case' },
          style: { type: 'string', description: 'Filter by style' },
          limit: { type: 'number', description: 'Max results' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_cost',
      description: 'Estimate cost for image generation.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            enum: ['flux-schnell', 'flux-dev', 'flux-pro', 'flux-kontext', 'flux-kontext-pro'],
          },
          count: { type: 'number', description: 'Number of images' },
        },
        required: ['model', 'count'],
      },
    },
  },
];

// ============================================================================
// Agent Configuration
// ============================================================================

const IMAGE_AGENT_CONFIG: AgentConfig = {
  id: 'create',
  name: 'Image Agent',
  description: 'Handles AI image generation for marketing creatives, product photos, and visual content.',
  systemPrompt: `You are the Image Agent for iSyncSO, specializing in AI-powered visual content creation.

Your capabilities:
- Generate professional product photography
- Create marketing banners and social media visuals
- Produce lifestyle and hero images
- Generate image variations while preserving product identity
- Apply brand guidelines to generated content

Model recommendations:
- **flux-schnell**: Fast drafts, low cost ($0.003/image)
- **flux-dev**: Balanced quality/speed ($0.025/image)
- **flux-pro**: Highest quality ($0.05/image)
- **flux-kontext**: Product variations with reference ($0.025/image)
- **flux-kontext-pro**: Premium variations ($0.04/image)

Best practices:
- Use specific, detailed prompts
- Include lighting and composition details
- Specify style keywords clearly
- Consider aspect ratio for intended platform
- Apply brand colors consistently

When generating images:
- Ask about intended use case
- Suggest appropriate aspect ratios
- Recommend suitable models
- Provide cost estimates upfront`,
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  temperature: 0.8,
  maxTokens: 2048,
  capabilities: [
    'Image generation',
    'Product photography',
    'Marketing visuals',
    'Image variations',
    'Brand-consistent content',
  ],
  tools: IMAGE_TOOLS,
};

// ============================================================================
// Image Agent Class
// ============================================================================

export class ImageAgent extends BaseAgent {
  constructor(apiKey?: string) {
    super(IMAGE_AGENT_CONFIG, apiKey);

    this.registerTool('generate_image', generateImage);
    this.registerTool('generate_variation', generateVariation);
    this.registerTool('get_templates', getTemplates);
    this.registerTool('list_images', listImages);
    this.registerTool('estimate_cost', estimateCost);
  }

  async quickGenerate(prompt: string, style: ImageStyle = 'photorealistic'): Promise<GeneratedImage> {
    return generateImage({ prompt, style });
  }

  async getProductTemplates(): Promise<ImageTemplate[]> {
    const { templates } = await getTemplates({ use_case: 'product_photo' });
    return templates;
  }
}

// ============================================================================
// Registration & Exports
// ============================================================================

export function registerImageAgent(): void {
  AgentRegistry.register(IMAGE_AGENT_CONFIG, 'active');
}

export { IMAGE_AGENT_CONFIG, IMAGE_TOOLS };
