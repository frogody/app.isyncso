import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Link2, Loader2, CheckCircle, AlertTriangle, X, Plus, Trash2,
  Image as ImageIcon, Package, Tag, Barcode, Euro, Weight, Ruler,
  Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import { useUser } from "@/components/context/UserContext";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { Product, PhysicalProduct } from "@/api/entities";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://sfxpmzicgpaxfntqleig.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function ImportFromURLModal({ open, onClose, onSave }) {
  const { user } = useUser();
  const { t } = useTheme();

  // Step state: 'input' | 'loading' | 'review'
  const [step, setStep] = useState("input");
  const [url, setUrl] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Extracted product data
  const [productData, setProductData] = useState(null);
  // Image selection (all selected by default)
  const [selectedImages, setSelectedImages] = useState([]);
  // Editable fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [ean, setEan] = useState("");
  const [mpn, setMpn] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [dimensions, setDimensions] = useState({ length: "", width: "", height: "" });
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [specifications, setSpecifications] = useState([]);
  const [showSpecs, setShowSpecs] = useState(false);

  const resetState = useCallback(() => {
    setStep("input");
    setUrl("");
    setLoadingMessage("");
    setError(null);
    setSaving(false);
    setProductData(null);
    setSelectedImages([]);
    setName("");
    setBrand("");
    setDescription("");
    setEan("");
    setMpn("");
    setCategory("");
    setPrice("");
    setCompareAtPrice("");
    setWeight("");
    setWeightUnit("kg");
    setDimensions({ length: "", width: "", height: "" });
    setCountryOfOrigin("");
    setSpecifications([]);
    setShowSpecs(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Step 1 → Step 2: Fetch & extract
  const handleImport = async () => {
    if (!url.trim()) return;

    setStep("loading");
    setError(null);
    setLoadingMessage("Fetching product page...");

    try {
      setLoadingMessage("Extracting product data...");

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/scrape-product-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ url: url.trim(), userId: user?.id }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to extract product data");
      }

      const data = result.data;
      setProductData(data);

      // Populate editable fields
      setName(data.name || "");
      setBrand(data.brand || "");
      setDescription(data.description || "");
      setEan(data.ean || "");
      setMpn(data.mpn || "");
      setCategory(data.category || "");
      setPrice(data.price ? String(data.price) : "");
      setCompareAtPrice(data.compare_at_price ? String(data.compare_at_price) : "");
      setWeight(data.weight ? String(data.weight) : "");
      setWeightUnit(data.weight_unit || "kg");
      setDimensions({
        length: data.dimensions?.length ? String(data.dimensions.length) : "",
        width: data.dimensions?.width ? String(data.dimensions.width) : "",
        height: data.dimensions?.height ? String(data.dimensions.height) : "",
      });
      setCountryOfOrigin(data.country_of_origin || "");
      setSpecifications(data.specifications || []);
      setSelectedImages((data.images || []).map((_, i) => i));

      setStep("review");
    } catch (err) {
      console.error("Import error:", err);
      setError(err.message);
      setStep("input");
    }
  };

  // Step 3: Save product
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    setSaving(true);
    try {
      // Build image arrays from selected images
      const images = productData?.images
        ? selectedImages.map((i) => productData.images[i]).filter(Boolean)
        : [];

      const featuredImage = images[0]?.url || null;
      const gallery = images.map((img) => ({
        url: img.url,
        alt: img.alt || name,
        uploaded_at: img.uploaded_at,
      }));

      // Create base product
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 80);

      const productPayload = {
        name: name.trim(),
        slug,
        type: "physical",
        status: "draft",
        company_id: user?.company_id,
        description: description.trim() || null,
        category: category.trim() || null,
        featured_image: featuredImage,
        gallery,
        created_by: user?.id,
      };

      const savedProduct = await Product.create(productPayload);

      // Create physical product details
      const hasDimensions =
        dimensions.length || dimensions.width || dimensions.height;

      const physicalPayload = {
        product_id: savedProduct.id,
        barcode: ean || null,
        mpn: mpn || null,
        specifications: specifications.length > 0 ? specifications : null,
        pricing: {
          base_price: price ? parseFloat(price) : null,
          compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
          currency: productData?.currency || "EUR",
        },
        shipping: {
          weight: weight ? parseFloat(weight) : null,
          weight_unit: weightUnit,
          dimensions: hasDimensions
            ? {
                length: dimensions.length ? parseFloat(dimensions.length) : null,
                width: dimensions.width ? parseFloat(dimensions.width) : null,
                height: dimensions.height ? parseFloat(dimensions.height) : null,
              }
            : null,
          requires_shipping: true,
        },
        country_of_origin: countryOfOrigin || null,
      };

      await PhysicalProduct.create(physicalPayload);

      toast.success(`Product "${name}" imported successfully`);
      handleClose();
      if (onSave) onSave(savedProduct);
    } catch (err) {
      console.error("Save error:", err);
      toast.error(`Failed to save product: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleImage = (index) => {
    setSelectedImages((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const addSpec = () => {
    setSpecifications([...specifications, { name: "", value: "" }]);
  };

  const removeSpec = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const updateSpec = (index, field, value) => {
    const updated = [...specifications];
    updated[index] = { ...updated[index], [field]: value };
    setSpecifications(updated);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`max-w-2xl max-h-[85vh] overflow-hidden flex flex-col ${t(
          "bg-white",
          "bg-zinc-900 border-zinc-800"
        )}`}
      >
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${t(
              "text-slate-900",
              "text-white"
            )}`}
          >
            <Link2 className="w-5 h-5 text-cyan-400" />
            Import Product from URL
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: URL Input */}
        {step === "input" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label
                className={`text-sm font-medium ${t(
                  "text-slate-700",
                  "text-zinc-300"
                )}`}
              >
                Product listing URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.bol.com/nl/p/..."
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  )}
                  onKeyDown={(e) => e.key === "Enter" && handleImport()}
                />
                <Button
                  onClick={handleImport}
                  disabled={!url.trim()}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white shrink-0"
                >
                  Import
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div
              className={`p-3 rounded-lg ${t(
                "bg-slate-50 border border-slate-200",
                "bg-zinc-800/50 border border-zinc-700/50"
              )}`}
            >
              <p className={`text-xs ${t("text-slate-500", "text-zinc-500")}`}>
                Paste a product URL from any webshop (Amazon, bol.com, Coolblue,
                etc.) and we'll automatically extract the product data, images,
                specifications, and pricing.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className={`text-sm ${t("text-slate-500", "text-zinc-400")}`}>
              {loadingMessage}
            </p>
            <p className={`text-xs ${t("text-slate-400", "text-zinc-500")}`}>
              This may take 10-15 seconds...
            </p>
          </div>
        )}

        {/* Step 3: Review & Edit */}
        {step === "review" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
            {/* Images */}
            {productData?.images?.length > 0 && (
              <div className="space-y-2">
                <label
                  className={`text-xs font-medium flex items-center gap-1 ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Images (
                  {selectedImages.length}/{productData.images.length} selected)
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {productData.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => toggleImage(i)}
                      className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImages.includes(i)
                          ? "border-cyan-400 ring-1 ring-cyan-400/30"
                          : t(
                              "border-slate-200 opacity-40",
                              "border-zinc-700 opacity-40"
                            )
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.alt}
                        className="w-full h-full object-cover"
                      />
                      {selectedImages.includes(i) && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label
                  className={`text-xs font-medium flex items-center gap-1 ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  <Package className="w-3.5 h-3.5" /> Product Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white"
                  )}
                />
              </div>

              <div className="space-y-1">
                <label
                  className={`text-xs font-medium flex items-center gap-1 ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  <Tag className="w-3.5 h-3.5" /> Brand
                </label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white"
                  )}
                />
              </div>

              <div className="space-y-1">
                <label
                  className={`text-xs font-medium flex items-center gap-1 ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  <Tag className="w-3.5 h-3.5" /> Category
                </label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white"
                  )}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label
                className={`text-xs font-medium ${t(
                  "text-slate-600",
                  "text-zinc-400"
                )}`}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 rounded-md text-sm resize-none ${t(
                  "bg-white border border-slate-200",
                  "bg-zinc-800 border border-zinc-700 text-white"
                )}`}
              />
            </div>

            {/* Identifiers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  className={`text-xs font-medium flex items-center gap-1 ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  <Barcode className="w-3.5 h-3.5" /> EAN / Barcode
                </label>
                <Input
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  placeholder="e.g. 8710103817857"
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  )}
                />
              </div>

              <div className="space-y-1">
                <label
                  className={`text-xs font-medium ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  MPN
                </label>
                <Input
                  value={mpn}
                  onChange={(e) => setMpn(e.target.value)}
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white"
                  )}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  className={`text-xs font-medium flex items-center gap-1 ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  <Euro className="w-3.5 h-3.5" /> Price
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  )}
                />
              </div>

              <div className="space-y-1">
                <label
                  className={`text-xs font-medium ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  Compare at Price
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="0.00"
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  )}
                />
              </div>
            </div>

            {/* Weight & Dimensions */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <label
                  className={`text-xs font-medium flex items-center gap-1 ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  <Weight className="w-3.5 h-3.5" /> Weight
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="kg"
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  )}
                />
              </div>
              <div className="space-y-1">
                <label
                  className={`text-xs font-medium flex items-center gap-1 ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  <Ruler className="w-3.5 h-3.5" /> L (cm)
                </label>
                <Input
                  type="number"
                  value={dimensions.length}
                  onChange={(e) =>
                    setDimensions({ ...dimensions, length: e.target.value })
                  }
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white"
                  )}
                />
              </div>
              <div className="space-y-1">
                <label
                  className={`text-xs font-medium ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  W (cm)
                </label>
                <Input
                  type="number"
                  value={dimensions.width}
                  onChange={(e) =>
                    setDimensions({ ...dimensions, width: e.target.value })
                  }
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white"
                  )}
                />
              </div>
              <div className="space-y-1">
                <label
                  className={`text-xs font-medium ${t(
                    "text-slate-600",
                    "text-zinc-400"
                  )}`}
                >
                  H (cm)
                </label>
                <Input
                  type="number"
                  value={dimensions.height}
                  onChange={(e) =>
                    setDimensions({ ...dimensions, height: e.target.value })
                  }
                  className={t(
                    "",
                    "bg-zinc-800 border-zinc-700 text-white"
                  )}
                />
              </div>
            </div>

            {/* Country of Origin */}
            <div className="space-y-1">
              <label
                className={`text-xs font-medium flex items-center gap-1 ${t(
                  "text-slate-600",
                  "text-zinc-400"
                )}`}
              >
                <Globe className="w-3.5 h-3.5" /> Country of Origin
              </label>
              <Input
                value={countryOfOrigin}
                onChange={(e) => setCountryOfOrigin(e.target.value)}
                className={t(
                  "",
                  "bg-zinc-800 border-zinc-700 text-white"
                )}
              />
            </div>

            {/* Specifications */}
            <div className="space-y-2">
              <button
                onClick={() => setShowSpecs(!showSpecs)}
                className={`flex items-center gap-2 text-xs font-medium ${t(
                  "text-slate-600",
                  "text-zinc-400"
                )}`}
              >
                {showSpecs ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                Specifications ({specifications.length})
              </button>

              {showSpecs && (
                <div className="space-y-2">
                  {specifications.map((spec, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={spec.name}
                        onChange={(e) => updateSpec(i, "name", e.target.value)}
                        placeholder="Name"
                        className={`flex-1 text-sm ${t(
                          "",
                          "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        )}`}
                      />
                      <Input
                        value={spec.value}
                        onChange={(e) => updateSpec(i, "value", e.target.value)}
                        placeholder="Value"
                        className={`flex-1 text-sm ${t(
                          "",
                          "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        )}`}
                      />
                      <button
                        onClick={() => removeSpec(i)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addSpec}
                    className={`text-xs ${t(
                      "text-slate-500",
                      "text-zinc-500"
                    )}`}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Spec
                  </Button>
                </div>
              )}
            </div>

            {/* Source URL badge */}
            {productData?.source_url && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${t(
                    "border-slate-200 text-slate-500",
                    "border-zinc-700 text-zinc-500"
                  )}`}
                >
                  <Link2 className="w-3 h-3 mr-1" />
                  {new URL(productData.source_url).hostname}
                </Badge>
              </div>
            )}

            {/* Save buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/50">
              <Button
                variant="ghost"
                onClick={handleClose}
                className={t("text-slate-600", "text-zinc-400")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" /> Save Product
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
