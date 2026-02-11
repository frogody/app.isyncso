// Products Components
export { default as ProductModal } from './ProductModal';
export { ProductGridCard, ProductListRow, ProductTableView } from './ProductCard';
export { default as ProductHero } from './ProductHero';
export { default as PricingTable } from './PricingTable';
export { default as MediaGallery } from './MediaGallery';
export {
  default as SpecificationsTable,
  ShippingInfo,
  InventoryStatus
} from './SpecificationsTable';
export { default as ProductInquiryModal } from './ProductInquiryModal';

// Image Upload & Barcode
export {
  default as ProductImageUploader,
  ProductImageInput
} from './ProductImageUploader';
export {
  default as BarcodeDisplay,
  InlineBarcode
} from './BarcodeDisplay';

// Inline Editing
export {
  InlineEditText,
  InlineEditNumber,
  InlineEditSelect,
  EditableSection
} from './InlineEdit';

// Product Detail Components
export { default as ActivityTimeline, generateMockActivities } from './ActivityTimeline';
export { default as QuickActions } from './QuickActions';
export { default as DocumentsSection } from './DocumentsSection';
export { default as PricingTiers } from './PricingTiers';
export { default as VariantsManager } from './VariantsManager';

// Digital Product Pricing
export {
  DigitalPricingManager,
  SubscriptionPlanEditor,
  OneTimePricingEditor,
  AddOnEditor
} from './digital';

// Service Product Pricing
export {
  ServicePricingManager,
  HourlyRateEditor,
  RetainerEditor,
  ProjectPricingEditor,
  MilestonePricingEditor,
  SuccessFeeEditor
} from './service';

// Product Bundles
export {
  BundleManager,
  BundleEditor,
  BundlePricingCalculator,
  BundlePriceTag,
  InlineBundlePrice,
  calculateBundlePrice
} from './bundles';
