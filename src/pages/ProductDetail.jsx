import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Cloud, Box, ArrowLeft, Edit2, ExternalLink, Play, FileText,
  DollarSign, Check, Star, MessageCircle, Users, Zap, Download,
  Clock, Shield, Award, ChevronRight, Package, Truck, Building2,
  Barcode, Globe, Tag, CheckCircle, XCircle, AlertTriangle,
  Image as ImageIcon, Video, HelpCircle, Share2, Copy, Heart,
  ShoppingCart, Info, Layers, Ruler, Weight, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/components/context/UserContext";
import { Product, DigitalProduct, PhysicalProduct, Supplier } from "@/api/entities";
import {
  ProductModal,
  MediaGallery,
  SpecificationsTable,
  ProductInquiryModal,
  ProductGridCard,
  BarcodeDisplay
} from "@/components/products";
import { toast } from "sonner";

const STATUS_COLORS = {
  published: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'Published' },
  draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

function getStockStatus(inventory) {
  if (!inventory) return { status: 'unknown', label: 'Unknown', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', icon: Info };
  const qty = inventory.quantity || 0;
  const low = inventory.low_stock_threshold || 10;
  if (qty <= 0) return { status: 'out', label: 'Out of Stock', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle };
  if (qty <= low) return { status: 'low', label: `Low Stock (${qty} left)`, color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: AlertTriangle };
  return { status: 'in', label: `In Stock (${qty} available)`, color: 'text-green-400', bgColor: 'bg-green-500/10', icon: CheckCircle };
}

function formatPrice(price, currency = 'USD') {
  if (!price && price !== 0) return null;
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(num);
}

// ============= PHYSICAL PRODUCT DETAIL =============

function PhysicalProductDetail({ product, details, supplier, onEdit, onRequestQuote, relatedProducts }) {
  const pricing = details?.pricing || {};
  const inventory = details?.inventory || {};
  const shipping = details?.shipping || {};
  const stock = getStockStatus(inventory);
  const StockIcon = stock.icon;

  const hasPrice = pricing.base_price && parseFloat(pricing.base_price) > 0;
  const hasComparePrice = pricing.compare_at_price && parseFloat(pricing.compare_at_price) > parseFloat(pricing.base_price || 0);

  // Prepare gallery for MediaGallery component
  const galleryImages = Array.isArray(product.gallery) ? product.gallery : [];

  return (
    <div className="space-y-6">
      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-2">
          <GlassCard className="p-4">
            <MediaGallery
              featuredImage={product.featured_image}
              images={galleryImages}
              videos={[]}
            />
          </GlassCard>
        </div>

        {/* Right: Product Info */}
        <div className="lg:col-span-3 space-y-4">
          {/* Title & Status */}
          <GlassCard className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${STATUS_COLORS[product.status]?.bg} ${STATUS_COLORS[product.status]?.text} ${STATUS_COLORS[product.status]?.border}`}>
                    {STATUS_COLORS[product.status]?.label || product.status}
                  </Badge>
                  {product.category && (
                    <Badge variant="outline" className="border-white/10 text-zinc-400">
                      {product.category}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{product.name}</h1>
                {product.tagline && (
                  <p className="text-zinc-400">{product.tagline}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={onEdit} className="border-white/10 text-zinc-300 hover:text-white">
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </Button>
            </div>

            {/* Price & Stock */}
            <div className="flex flex-wrap items-end gap-6 pt-4 border-t border-white/5">
              {hasPrice ? (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Price</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">
                      {formatPrice(pricing.base_price, pricing.currency)}
                    </span>
                    {hasComparePrice && (
                      <span className="text-lg text-zinc-500 line-through">
                        {formatPrice(pricing.compare_at_price, pricing.currency)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Price</div>
                  <span className="text-lg text-zinc-400">Contact for pricing</span>
                </div>
              )}

              <div className="flex-1" />

              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${stock.bgColor}`}>
                <StockIcon className={`w-5 h-5 ${stock.color}`} />
                <span className={`font-medium ${stock.color}`}>{stock.label}</span>
              </div>
            </div>
          </GlassCard>

          {/* SKU with Barcode Display */}
          {(details?.sku || details?.barcode) && (
            <GlassCard className="p-4">
              <div className="flex flex-wrap items-start gap-6">
                {/* Code Info */}
                <div className="flex-1 min-w-[200px]">
                  <div className="grid grid-cols-2 gap-4">
                    {details?.sku && (
                      <div>
                        <div className="flex items-center gap-2 text-zinc-500 mb-1">
                          <Barcode className="w-4 h-4" />
                          <span className="text-xs">SKU</span>
                        </div>
                        <p className="text-white font-mono text-sm">{details.sku}</p>
                      </div>
                    )}
                    {details?.barcode && (
                      <div>
                        <div className="flex items-center gap-2 text-zinc-500 mb-1">
                          <Tag className="w-4 h-4" />
                          <span className="text-xs">EAN / Barcode</span>
                        </div>
                        <p className="text-white font-mono text-sm">{details.barcode}</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Barcode Visual */}
                <div className="flex-shrink-0">
                  <BarcodeDisplay
                    code={details.barcode || details.sku}
                    displayMode="inline"
                    height={50}
                    showControls={true}
                  />
                </div>
              </div>
            </GlassCard>
          )}

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {details?.country_of_origin && (
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Globe className="w-4 h-4" />
                  <span className="text-xs">Origin</span>
                </div>
                <p className="text-white text-sm">{details.country_of_origin}</p>
              </div>
            )}
            {supplier && (
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs">Supplier</span>
                </div>
                <p className="text-white text-sm">{supplier.name}</p>
              </div>
            )}
            {details?.mpn && (
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Tag className="w-4 h-4" />
                  <span className="text-xs">MPN</span>
                </div>
                <p className="text-white font-mono text-sm">{details.mpn}</p>
              </div>
            )}
          </div>

          {/* Shipping Info */}
          {(shipping.weight || (shipping.dimensions && (shipping.dimensions.length || shipping.dimensions.width || shipping.dimensions.height))) && (
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-orange-400" />
                <span className="font-medium text-white">Shipping Information</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {shipping.weight && (
                  <div className="flex items-center gap-3">
                    <Weight className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-xs text-zinc-500">Weight</div>
                      <div className="text-white">{shipping.weight} {shipping.weight_unit || 'kg'}</div>
                    </div>
                  </div>
                )}
                {shipping.dimensions && (shipping.dimensions.length || shipping.dimensions.width || shipping.dimensions.height) && (
                  <div className="flex items-center gap-3">
                    <Ruler className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-xs text-zinc-500">Dimensions (L × W × H)</div>
                      <div className="text-white">
                        {shipping.dimensions.length || '–'} × {shipping.dimensions.width || '–'} × {shipping.dimensions.height || '–'} cm
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12"
              onClick={onRequestQuote}
            >
              <MessageCircle className="w-5 h-5 mr-2" /> Request Quote
            </Button>
            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white h-12 px-4">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white h-12 px-4">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Description & Specifications Tabs */}
      <GlassCard className="p-6">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="bg-zinc-800/50 border border-white/5 p-1 mb-6">
            <TabsTrigger value="description" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              Description
            </TabsTrigger>
            {details?.specifications && details.specifications.length > 0 && (
              <TabsTrigger value="specifications" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
                Specifications
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="description">
            {product.description ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {product.description}
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 italic">No description available.</p>
            )}
          </TabsContent>

          {details?.specifications && details.specifications.length > 0 && (
            <TabsContent value="specifications">
              <SpecificationsTable
                specifications={details.specifications}
                attributes={details.attributes || []}
                productInfo={{
                  sku: details.sku,
                  barcode: details.barcode,
                  mpn: details.mpn,
                  country_of_origin: details.country_of_origin
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </GlassCard>

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="border-white/10 text-zinc-400">
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" />
            Related Products
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProducts.slice(0, 4).map((relatedProduct) => (
              <ProductGridCard
                key={relatedProduct.id}
                product={relatedProduct}
                onClick={() => {
                  window.location.href = createPageUrl('ProductDetail') + `?type=${relatedProduct.type}&slug=${relatedProduct.slug}`;
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= DIGITAL PRODUCT DETAIL =============

function DigitalProductDetail({ product, details, onEdit, onRequestQuote, relatedProducts }) {
  const galleryImages = Array.isArray(product.gallery) ? product.gallery : [];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <GlassCard className="p-8 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${STATUS_COLORS[product.status]?.bg} ${STATUS_COLORS[product.status]?.text} ${STATUS_COLORS[product.status]?.border}`}>
                {STATUS_COLORS[product.status]?.label || product.status}
              </Badge>
              {details?.pricing_model && (
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                  {details.pricing_model.replace('_', ' ')}
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white mb-3">{product.name}</h1>
              <p className="text-lg text-zinc-400">
                {product.tagline || product.short_description || product.description?.slice(0, 150)}
              </p>
            </div>

            {details?.trial_available && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>{details.trial_days || 14}-day free trial available</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {details?.demo_url && (
                <a href={details.demo_url} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                    <Play className="w-4 h-4 mr-2" /> Try Demo
                  </Button>
                </a>
              )}
              <Button
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={onRequestQuote}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Request Demo
              </Button>
              {details?.documentation_url && (
                <a href={details.documentation_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white">
                    <FileText className="w-4 h-4 mr-2" /> Documentation
                  </Button>
                </a>
              )}
              <Button variant="outline" size="icon" onClick={onEdit} className="border-white/10 text-zinc-300 hover:text-white">
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="aspect-video rounded-xl bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 overflow-hidden border border-cyan-500/20">
            {product.featured_image?.url || galleryImages.length > 0 ? (
              <MediaGallery
                featuredImage={product.featured_image}
                images={galleryImages}
                videos={details?.demo_videos || details?.promo_videos || []}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Cloud className="w-16 h-16 text-cyan-500/30" />
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Features */}
      {details?.features && details.features.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {details.features.map((feature, i) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
                  <Check className="w-5 h-5 text-cyan-400" />
                </div>
                <h4 className="font-medium text-white mb-1">{feature.title || feature.name || feature}</h4>
                {feature.description && (
                  <p className="text-sm text-zinc-500">{feature.description}</p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Description */}
      {product.description && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">About</h3>
          <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {product.description}
          </div>
        </GlassCard>
      )}

      {/* FAQs */}
      {details?.faqs && details.faqs.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            {details.faqs.map((faq, i) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <h4 className="font-medium text-white mb-2">{faq.question}</h4>
                <p className="text-sm text-zinc-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="border-white/10 text-zinc-400">
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Related Products
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProducts.slice(0, 4).map((relatedProduct) => (
              <ProductGridCard
                key={relatedProduct.id}
                product={relatedProduct}
                onClick={() => {
                  window.location.href = createPageUrl('ProductDetail') + `?type=${relatedProduct.type}&slug=${relatedProduct.slug}`;
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= MAIN COMPONENT =============

export default function ProductDetail() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'digital';
  const slug = searchParams.get('slug');

  const [product, setProduct] = useState(null);
  const [details, setDetails] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  const loadProduct = async () => {
    if (!slug) {
      setError('No product slug provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const products = await Product.filter({ slug, type }, { limit: 1 });

      if (!products || products.length === 0) {
        setError('Product not found');
        setLoading(false);
        return;
      }

      const productData = products[0];
      setProduct(productData);

      if (type === 'digital') {
        const digitalData = await DigitalProduct.filter({ product_id: productData.id }, { limit: 1 });
        if (digitalData && digitalData.length > 0) {
          setDetails(digitalData[0]);
        }
      } else {
        const physicalData = await PhysicalProduct.filter({ product_id: productData.id }, { limit: 1 });
        if (physicalData && physicalData.length > 0) {
          setDetails(physicalData[0]);
          if (physicalData[0].supplier_id) {
            const supplierData = await Supplier.get(physicalData[0].supplier_id);
            if (supplierData) setSupplier(supplierData);
          }
        }
      }

      // Load related products (same type, same category, excluding current)
      try {
        const related = await Product.filter(
          { type, category: productData.category, status: 'published' },
          { limit: 5 }
        );
        setRelatedProducts(related.filter(p => p.id !== productData.id));
      } catch (relatedErr) {
        console.log('Could not load related products:', relatedErr);
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [slug, type]);

  // SEO: Update document title and meta tags when product loads
  useEffect(() => {
    if (!product) return;

    // Set document title
    const title = product.seo_meta_title || `${product.name} | iSyncSO Products`;
    document.title = title;

    // Helper to update or create meta tag
    const setMetaTag = (name, content, property = false) => {
      if (!content) return;
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Set meta description
    const description = product.seo_meta_description ||
      product.short_description ||
      product.tagline ||
      (product.description ? product.description.slice(0, 160) : '');
    setMetaTag('description', description);

    // Set Open Graph tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', 'product', true);
    setMetaTag('og:url', window.location.href, true);

    // Set OG image
    const ogImage = product.seo_og_image ||
      product.featured_image?.url ||
      '';
    if (ogImage) {
      setMetaTag('og:image', ogImage, true);
    }

    // Set Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    if (ogImage) {
      setMetaTag('twitter:image', ogImage);
    }

    // Set keywords if available
    if (product.seo_keywords && product.seo_keywords.length > 0) {
      setMetaTag('keywords', product.seo_keywords.join(', '));
    } else if (product.tags && product.tags.length > 0) {
      setMetaTag('keywords', product.tags.join(', '));
    }

    // Cleanup on unmount
    return () => {
      document.title = 'iSyncSO';
    };
  }, [product]);

  const handleEdit = () => {
    setEditModalOpen(true);
  };

  const handleRequestQuote = () => {
    setInquiryModalOpen(true);
  };

  const handleProductSaved = async () => {
    toast.success('Product updated!');
    setEditModalOpen(false);
    await loadProduct();
  };

  const isDigital = type === 'digital';
  const Icon = isDigital ? Cloud : Box;
  const color = isDigital ? 'cyan' : 'orange';
  const backUrl = isDigital ? 'ProductsDigital' : 'ProductsPhysical';

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-10 w-48 bg-zinc-800/50" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-square bg-zinc-800/50 rounded-xl" />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-48 bg-zinc-800/50 rounded-xl" />
              <Skeleton className="h-24 bg-zinc-800/50 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6">
          <GlassCard className="p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h4 className="text-lg font-medium text-white mb-2">{error || 'Product not found'}</h4>
            <p className="text-sm text-zinc-500 mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Link to={createPageUrl('Products')}>
              <Button variant="outline" className="border-white/10 text-zinc-300">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
              </Button>
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-20 right-1/4 w-96 h-96 ${isDigital ? 'bg-cyan-900/10' : 'bg-orange-900/10'} rounded-full blur-3xl`} />
        <div className={`absolute bottom-20 left-1/4 w-80 h-80 ${isDigital ? 'bg-cyan-950/10' : 'bg-orange-950/10'} rounded-full blur-3xl`} />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Back Button */}
        <Link to={createPageUrl(backUrl)}>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isDigital ? 'Digital' : 'Physical'} Products
          </Button>
        </Link>

        {/* Content */}
        {isDigital ? (
          <DigitalProductDetail
            product={product}
            details={details}
            onEdit={handleEdit}
            onRequestQuote={handleRequestQuote}
            relatedProducts={relatedProducts}
          />
        ) : (
          <PhysicalProductDetail
            product={product}
            details={details}
            supplier={supplier}
            onEdit={handleEdit}
            onRequestQuote={handleRequestQuote}
            relatedProducts={relatedProducts}
          />
        )}
      </div>

      {/* Edit Modal */}
      <ProductModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        productType={type}
        product={{
          ...product,
          ...(isDigital ? { digitalDetails: details } : { physicalDetails: details })
        }}
        onSave={handleProductSaved}
      />

      {/* Inquiry Modal */}
      <ProductInquiryModal
        open={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        product={product}
        productDetails={details}
      />
    </div>
  );
}
