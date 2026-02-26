export const DIRECTION_CARDS = [
  {
    id: 'bold-geometric',
    name: 'Bold Geometric',
    description: 'Strong shapes, high contrast, architectural precision',
    colors: ['#1A1A2E', '#E94560', '#0F3460', '#16213E', '#FFFFFF'],
    fontPair: { heading: 'Montserrat', body: 'Inter' },
    tags: ['modern', 'tech', 'corporate'],
    industryAffinity: ['Technology', 'Finance & Banking', 'Professional Services', 'Manufacturing'],
    personalityRange: { temporal: [55, 100], energy: [40, 85], tone: [0, 45], market: [40, 100], density: [30, 70] },
  },
  {
    id: 'warm-organic',
    name: 'Warm Organic',
    description: 'Natural tones, flowing curves, handcrafted feel',
    colors: ['#2D1B0E', '#D4A373', '#E9C46A', '#F4F1DE', '#264653'],
    fontPair: { heading: 'Playfair Display', body: 'Lato' },
    tags: ['natural', 'artisan', 'warm'],
    industryAffinity: ['Food & Beverage', 'Agriculture', 'Beauty & Fashion', 'Non-profit'],
    personalityRange: { temporal: [15, 55], energy: [20, 60], tone: [30, 80], market: [20, 60], density: [40, 80] },
  },
  {
    id: 'minimal-mono',
    name: 'Minimal Mono',
    description: 'Black and white sophistication, maximum whitespace',
    colors: ['#000000', '#FFFFFF', '#F5F5F5', '#333333', '#999999'],
    fontPair: { heading: 'Space Grotesk', body: 'Inter' },
    tags: ['minimal', 'clean', 'luxury'],
    industryAffinity: ['Real Estate', 'Legal', 'Professional Services', 'Beauty & Fashion'],
    personalityRange: { temporal: [40, 85], energy: [10, 50], tone: [0, 35], market: [50, 100], density: [0, 35] },
  },
  {
    id: 'vibrant-pop',
    name: 'Vibrant Pop',
    description: 'Electric colors, bold statements, youthful energy',
    colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#2C3E50', '#FFFFFF'],
    fontPair: { heading: 'Poppins', body: 'Nunito' },
    tags: ['playful', 'energetic', 'young'],
    industryAffinity: ['Entertainment & Media', 'Fitness & Wellness', 'Education', 'Food & Beverage'],
    personalityRange: { temporal: [50, 100], energy: [55, 100], tone: [50, 100], market: [0, 55], density: [40, 80] },
  },
  {
    id: 'heritage-luxury',
    name: 'Heritage Luxury',
    description: 'Deep tones, serif elegance, refined tradition',
    colors: ['#1B1B1B', '#C9A96E', '#2C2C2C', '#8B7355', '#F0E6D3'],
    fontPair: { heading: 'Playfair Display', body: 'Source Sans Pro' },
    tags: ['luxury', 'classic', 'premium'],
    industryAffinity: ['Finance & Banking', 'Real Estate', 'Legal', 'Beauty & Fashion', 'Travel & Hospitality'],
    personalityRange: { temporal: [0, 40], energy: [10, 50], tone: [0, 30], market: [60, 100], density: [35, 75] },
  },
  {
    id: 'tech-gradient',
    name: 'Tech Gradient',
    description: 'Futuristic gradients, glass effects, digital precision',
    colors: ['#0F0F23', '#667EEA', '#764BA2', '#00D2FF', '#FFFFFF'],
    fontPair: { heading: 'DM Sans', body: 'Inter' },
    tags: ['futuristic', 'tech', 'digital'],
    industryAffinity: ['Technology', 'Telecommunications', 'Healthcare', 'Energy & Sustainability'],
    personalityRange: { temporal: [65, 100], energy: [40, 80], tone: [15, 55], market: [35, 80], density: [30, 70] },
  },
  {
    id: 'earthy-calm',
    name: 'Earthy Calm',
    description: 'Muted earth tones, serene balance, mindful design',
    colors: ['#3D405B', '#81B29A', '#F2CC8F', '#E07A5F', '#F4F1DE'],
    fontPair: { heading: 'Merriweather', body: 'Work Sans' },
    tags: ['calm', 'natural', 'wellness'],
    industryAffinity: ['Fitness & Wellness', 'Healthcare', 'Non-profit', 'Education', 'Agriculture'],
    personalityRange: { temporal: [25, 65], energy: [0, 45], tone: [20, 60], market: [25, 65], density: [25, 65] },
  },
  {
    id: 'neo-brutalist',
    name: 'Neo Brutalist',
    description: 'Raw edges, thick borders, unapologetic impact',
    colors: ['#FFFFFF', '#000000', '#FF5722', '#FFEB3B', '#E0E0E0'],
    fontPair: { heading: 'Space Grotesk', body: 'Roboto' },
    tags: ['bold', 'edgy', 'disruptive'],
    industryAffinity: ['Technology', 'Entertainment & Media', 'Marketing & Advertising', 'Retail & E-commerce'],
    personalityRange: { temporal: [60, 100], energy: [60, 100], tone: [30, 80], market: [0, 50], density: [40, 85] },
  },
  {
    id: 'corporate-trust',
    name: 'Corporate Trust',
    description: 'Navy blues, clean lines, reliability and authority',
    colors: ['#0A2463', '#3E92CC', '#D8E2DC', '#1B3A5C', '#FFFFFF'],
    fontPair: { heading: 'Montserrat', body: 'Open Sans' },
    tags: ['corporate', 'trustworthy', 'professional'],
    industryAffinity: ['Finance & Banking', 'Legal', 'Healthcare', 'Insurance', 'Professional Services'],
    personalityRange: { temporal: [30, 65], energy: [20, 55], tone: [0, 35], market: [40, 85], density: [30, 60] },
  },
  {
    id: 'sunset-creative',
    name: 'Sunset Creative',
    description: 'Warm gradients, creative flair, artistic expression',
    colors: ['#2D2B55', '#FF6E7F', '#BFE6BA', '#FF9A76', '#F9F7F7'],
    fontPair: { heading: 'Raleway', body: 'Nunito' },
    tags: ['creative', 'warm', 'artistic'],
    industryAffinity: ['Marketing & Advertising', 'Entertainment & Media', 'Education', 'Non-profit'],
    personalityRange: { temporal: [40, 80], energy: [40, 80], tone: [40, 85], market: [20, 60], density: [40, 80] },
  },
  {
    id: 'nordic-clean',
    name: 'Nordic Clean',
    description: 'Cool whites, subtle textures, Scandinavian simplicity',
    colors: ['#F7F7F7', '#2E4057', '#048A81', '#D4D4D4', '#FFFFFF'],
    fontPair: { heading: 'DM Sans', body: 'Work Sans' },
    tags: ['clean', 'scandinavian', 'simple'],
    industryAffinity: ['Technology', 'Real Estate', 'Retail & E-commerce', 'Fitness & Wellness'],
    personalityRange: { temporal: [50, 85], energy: [15, 55], tone: [20, 55], market: [40, 80], density: [0, 40] },
  },
  {
    id: 'retro-revival',
    name: 'Retro Revival',
    description: 'Vintage palettes, nostalgic charm, personality-driven',
    colors: ['#1A1A2E', '#E76F51', '#F4A261', '#2A9D8F', '#E9C46A'],
    fontPair: { heading: 'Playfair Display', body: 'Lato' },
    tags: ['retro', 'vintage', 'characterful'],
    industryAffinity: ['Food & Beverage', 'Entertainment & Media', 'Retail & E-commerce', 'Travel & Hospitality'],
    personalityRange: { temporal: [0, 40], energy: [30, 70], tone: [35, 80], market: [20, 60], density: [45, 85] },
  },
];

export function scoreCardAffinity(card, industry, personalityVector) {
  let score = 0;

  // Industry match: +30 if in affinity list
  if (industry && card.industryAffinity.includes(industry)) {
    score += 30;
  }

  // Personality range match: +14 per axis that falls within range (5 axes × 14 = 70 max)
  if (personalityVector) {
    const axes = ['temporal', 'energy', 'tone', 'market', 'density'];
    axes.forEach((axis, i) => {
      const val = personalityVector[i] ?? 50;
      const range = card.personalityRange[axis];
      if (range && val >= range[0] && val <= range[1]) {
        score += 14;
      }
    });
  }

  return score;
}
