export const INDUSTRIES = [
  {
    name: 'Technology',
    subcategories: ['SaaS / B2B Software', 'Consumer Tech', 'AI / Machine Learning', 'Cybersecurity', 'Cloud Infrastructure', 'Dev Tools', 'EdTech', 'HealthTech', 'FinTech'],
    defaults: [75, 60, 40, 55, 35],
  },
  {
    name: 'Finance & Banking',
    subcategories: ['Retail Banking', 'Investment Banking', 'Insurance', 'Wealth Management', 'Cryptocurrency', 'Payments'],
    defaults: [35, 30, 20, 70, 40],
  },
  {
    name: 'Healthcare',
    subcategories: ['Hospitals & Clinics', 'Pharmaceuticals', 'Medical Devices', 'Telehealth', 'Mental Health', 'Wellness'],
    defaults: [40, 35, 25, 50, 45],
  },
  {
    name: 'Education',
    subcategories: ['K-12', 'Higher Education', 'Online Learning', 'Corporate Training', 'Test Prep', 'Language Learning'],
    defaults: [55, 50, 45, 35, 50],
  },
  {
    name: 'Food & Beverage',
    subcategories: ['Restaurants', 'Fast Food / QSR', 'Beverages', 'Organic / Natural', 'Snacks & Confectionery', 'Meal Delivery'],
    defaults: [45, 65, 70, 40, 60],
  },
  {
    name: 'Retail & E-commerce',
    subcategories: ['Fashion Retail', 'General Marketplace', 'Specialty Retail', 'Luxury Retail', 'D2C Brands', 'Grocery'],
    defaults: [55, 55, 50, 45, 55],
  },
  {
    name: 'Real Estate',
    subcategories: ['Residential', 'Commercial', 'Property Management', 'PropTech', 'Architecture', 'Interior Design'],
    defaults: [40, 35, 25, 65, 50],
  },
  {
    name: 'Legal',
    subcategories: ['Corporate Law', 'Family Law', 'IP / Patent', 'Legal Tech', 'Litigation', 'Immigration'],
    defaults: [30, 25, 15, 70, 35],
  },
  {
    name: 'Marketing & Advertising',
    subcategories: ['Digital Marketing', 'Branding Agency', 'PR & Communications', 'Content Marketing', 'Social Media', 'SEO / SEM'],
    defaults: [70, 65, 55, 50, 55],
  },
  {
    name: 'Travel & Hospitality',
    subcategories: ['Hotels & Resorts', 'Airlines', 'Travel Tech', 'Tourism', 'Event Planning', 'Vacation Rentals'],
    defaults: [50, 60, 55, 55, 60],
  },
  {
    name: 'Fitness & Wellness',
    subcategories: ['Gyms & Studios', 'Personal Training', 'Nutrition', 'Mental Wellness', 'Yoga & Meditation', 'Wearables'],
    defaults: [60, 75, 55, 45, 50],
  },
  {
    name: 'Beauty & Fashion',
    subcategories: ['Cosmetics', 'Skincare', 'Hair Care', 'Fashion Design', 'Luxury Fashion', 'Sustainable Fashion'],
    defaults: [55, 55, 50, 60, 65],
  },
  {
    name: 'Automotive',
    subcategories: ['Manufacturers', 'Dealerships', 'EV / Electric', 'Auto Parts', 'Fleet Management', 'Ride Sharing'],
    defaults: [50, 50, 30, 55, 50],
  },
  {
    name: 'Energy & Sustainability',
    subcategories: ['Solar', 'Wind', 'Oil & Gas', 'Clean Tech', 'Carbon Credits', 'Utilities'],
    defaults: [60, 45, 30, 50, 40],
  },
  {
    name: 'Entertainment & Media',
    subcategories: ['Film & TV', 'Music', 'Gaming', 'Streaming', 'Publishing', 'Podcasting'],
    defaults: [65, 70, 65, 45, 65],
  },
  {
    name: 'Non-profit',
    subcategories: ['Charity', 'Environmental', 'Social Justice', 'Arts & Culture', 'Animal Welfare', 'Community Development'],
    defaults: [40, 50, 40, 30, 45],
  },
  {
    name: 'Construction',
    subcategories: ['Residential Construction', 'Commercial Construction', 'Infrastructure', 'Renovation', 'Green Building'],
    defaults: [35, 40, 20, 50, 40],
  },
  {
    name: 'Agriculture',
    subcategories: ['Farming', 'AgTech', 'Livestock', 'Organic Farming', 'Supply Chain', 'Agricultural Equipment'],
    defaults: [35, 40, 30, 35, 45],
  },
  {
    name: 'Manufacturing',
    subcategories: ['Consumer Goods', 'Industrial', 'Electronics', 'Textiles', 'Chemical', 'Packaging'],
    defaults: [40, 40, 25, 50, 45],
  },
  {
    name: 'Professional Services',
    subcategories: ['Consulting', 'Accounting', 'HR / Recruiting', 'IT Services', 'Management Consulting', 'Strategy'],
    defaults: [45, 40, 25, 60, 40],
  },
  {
    name: 'Logistics & Supply Chain',
    subcategories: ['Freight & Shipping', 'Warehousing', 'Last-Mile Delivery', 'Supply Chain Tech', 'Fleet Management'],
    defaults: [50, 45, 25, 45, 40],
  },
  {
    name: 'Telecommunications',
    subcategories: ['Mobile Carriers', 'Internet Providers', 'VoIP', 'Satellite', '5G Infrastructure'],
    defaults: [60, 50, 30, 50, 45],
  },
];

export function getIndustryDefaults(primary) {
  const industry = INDUSTRIES.find(i => i.name === primary);
  return industry?.defaults || [50, 50, 50, 50, 50];
}

export function getSubcategories(primary) {
  const industry = INDUSTRIES.find(i => i.name === primary);
  return industry?.subcategories || [];
}
