import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Loader2, Building, Calendar, Euro, Package,
  Search, Globe, Link, MessageSquare, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

const COUNTRIES = [
  { value: "NL", label: "Nederland" },
  { value: "DE", label: "Duitsland" },
  { value: "BE", label: "België" },
  { value: "UK", label: "Verenigd Koninkrijk" },
  { value: "US", label: "Verenigde Staten" },
  { value: "CN", label: "China" },
  { value: "Other", label: "Anders" },
];

const EMPTY_LINE_ITEM = {
  product_id: null,
  product_name: "",
  ean: "",
  quantity: 1,
  unit_price: 0,
  order_url: "",
  country_of_purchase: "NL",
  sales_channel: "undecided",
  remarks: "",
  _eanSearchResult: null,
};

export default function ManualPurchaseModal({
  isOpen,
  onClose,
  onPurchaseCreated,
  companyId,
  userId,
}) {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [salesChannel, setSalesChannel] = useState("undecided");
  const [lineItems, setLineItems] = useState([{ ...EMPTY_LINE_ITEM }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eanSearching, setEanSearching] = useState({});

  // Load suppliers
  useEffect(() => {
    if (!companyId || !isOpen) return;
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      setSuppliers(data || []);
    })();
  }, [companyId, isOpen]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setSupplierId("");
      setNewSupplierName("");
      setIsNewSupplier(false);
      setGroupName("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setSalesChannel("undecided");
      setLineItems([{ ...EMPTY_LINE_ITEM }]);
    }
  }, [isOpen]);

  // EAN product lookup
  const searchByEan = useCallback(
    async (ean, lineIndex) => {
      if (!ean || ean.length < 8 || !companyId) return;
      const cleanEan = ean.replace(/\D/g, "");
      if (cleanEan.length < 8) return;

      setEanSearching((prev) => ({ ...prev, [lineIndex]: true }));
      try {
        const variants = [cleanEan];
        if (cleanEan.length === 12) variants.push("0" + cleanEan);
        if (cleanEan.length === 13 && cleanEan.startsWith("0"))
          variants.push(cleanEan.substring(1));

        for (const variant of variants) {
          const { data } = await supabase
            .from("products")
            .select("id, name, sku, ean, price")
            .eq("company_id", companyId)
            .eq("ean", variant)
            .limit(1)
            .maybeSingle();

          if (data) {
            setLineItems((prev) =>
              prev.map((item, i) =>
                i === lineIndex
                  ? {
                      ...item,
                      product_id: data.id,
                      product_name: data.name,
                      ean: data.ean,
                      unit_price: item.unit_price || data.price || 0,
                      _eanSearchResult: data,
                    }
                  : item
              )
            );
            return;
          }
        }
        // No match — will auto-create product on submit
        setLineItems((prev) =>
          prev.map((item, i) =>
            i === lineIndex
              ? { ...item, product_id: null, _eanSearchResult: null }
              : item
          )
        );
      } finally {
        setEanSearching((prev) => ({ ...prev, [lineIndex]: false }));
      }
    },
    [companyId]
  );

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { ...EMPTY_LINE_ITEM }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const lineTotal = (item) =>
    (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);

  const grandTotal = lineItems.reduce((sum, item) => sum + lineTotal(item), 0);

  const handleSubmit = async () => {
    // Validation
    if (!supplierId && !newSupplierName.trim()) {
      toast.error("Selecteer of vul een leverancier in");
      return;
    }
    const validLines = lineItems.filter(
      (li) => li.ean.trim() && (parseFloat(li.quantity) || 0) > 0
    );
    if (validLines.length === 0) {
      toast.error("Voeg minimaal 1 product toe met EAN en aantal");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalSupplierId = supplierId;

      // Create new supplier if needed
      if (isNewSupplier && newSupplierName.trim()) {
        const { data: newSupplier, error: supplierErr } = await supabase
          .from("suppliers")
          .insert({
            company_id: companyId,
            name: newSupplierName.trim(),
          })
          .select("id")
          .single();
        if (supplierErr) throw supplierErr;
        finalSupplierId = newSupplier.id;
      }

      // Create purchase group if name provided
      let purchaseGroupId = null;
      if (groupName.trim()) {
        const { data: group, error: groupErr } = await supabase
          .from("purchase_groups")
          .insert({
            company_id: companyId,
            name: groupName.trim(),
            purchase_date: purchaseDate,
            supplier_id: finalSupplierId || null,
            sales_channel: salesChannel,
            created_by: userId,
          })
          .select("id")
          .single();
        if (groupErr) throw groupErr;
        purchaseGroupId = group.id;
      }

      // Auto-create products for unknown EANs
      for (const line of validLines) {
        if (!line.product_id && line.ean.trim()) {
          const productName = line.product_name.trim() || `Product ${line.ean}`;
          const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + line.ean.trim();
          const { data: newProduct, error: prodErr } = await supabase
            .from("products")
            .insert({
              company_id: companyId,
              name: productName,
              slug: slug,
              ean: line.ean.trim(),
              price: parseFloat(line.unit_price) || 0,
              type: "physical",
              status: "draft",
              created_by: userId,
            })
            .select("id")
            .single();
          if (prodErr) {
            console.error("Failed to create product:", prodErr);
          } else {
            line.product_id = newProduct.id;
          }
        }
      }

      // Create stock purchase
      const { data: purchase, error: purchaseErr } = await supabase
        .from("stock_purchases")
        .insert({
          company_id: companyId,
          user_id: userId,
          supplier_id: finalSupplierId || null,
          entry_method: "manual",
          purchase_group_id: purchaseGroupId,
          sales_channel: salesChannel,
          invoice_date: purchaseDate,
          subtotal: grandTotal,
          tax_percent: 21,
          tax_amount: grandTotal * 0.21,
          total: grandTotal * 1.21,
          currency: "EUR",
          status: "approved",
          needs_review: false,
          review_status: "approved",
          source_type: "manual",
        })
        .select("id")
        .single();
      if (purchaseErr) throw purchaseErr;

      // Create line items
      const lineItemInserts = validLines.map((li, idx) => ({
        stock_purchase_id: purchase.id,
        product_id: li.product_id || null,
        description: li.product_name.trim() || `Product ${li.ean}`,
        quantity: parseFloat(li.quantity) || 0,
        unit_price: parseFloat(li.unit_price) || 0,
        line_total: lineTotal(li),
        ean: li.ean.trim(),
        order_url: li.order_url.trim() || null,
        country_of_purchase: li.country_of_purchase,
        sales_channel: li.sales_channel,
        is_physical_product: true,
        line_number: idx + 1,
      }));

      const { error: lineErr } = await supabase
        .from("stock_purchase_line_items")
        .insert(lineItemInserts);
      if (lineErr) throw lineErr;

      toast.success(
        `Inkoop aangemaakt met ${validLines.length} product${validLines.length > 1 ? "en" : ""}`
      );
      onPurchaseCreated?.();
      onClose();
    } catch (error) {
      console.error("Failed to create manual purchase:", error);
      toast.error(`Fout bij aanmaken: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
            Handmatige Inkoop
          </DialogTitle>
          <DialogDescription>
            Voeg een nieuwe inkoop handmatig toe met producten, hoeveelheden en
            prijzen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Supplier */}
          <div className="space-y-2">
            <Label className="text-zinc-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Leverancier
            </Label>
            {isNewSupplier ? (
              <div className="flex gap-2">
                <Input
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Naam nieuwe leverancier"
                  className="bg-zinc-900/50 border-white/10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsNewSupplier(false);
                    setNewSupplierName("");
                  }}
                  className="text-zinc-400 shrink-0"
                >
                  Bestaande
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="bg-zinc-900/50 border-white/10">
                    <SelectValue placeholder="Selecteer leverancier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsNewSupplier(true);
                    setSupplierId("");
                  }}
                  className="text-cyan-400 shrink-0"
                >
                  + Nieuw
                </Button>
              </div>
            )}
          </div>

          {/* Group name + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-zinc-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Groepsnaam (optioneel)
              </Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder='bijv. "Amazon deal 10 feb"'
                className="bg-zinc-900/50 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Datum
              </Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-zinc-900/50 border-white/10"
              />
            </div>
          </div>

          {/* Sales Channel */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Verkoopkanaal</Label>
            <div className="flex gap-2">
              {[
                { value: "b2b", label: "B2B", color: "blue" },
                { value: "b2c", label: "B2C", color: "green" },
                { value: "undecided", label: "Onbepaald", color: "zinc" },
              ].map((ch) => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => setSalesChannel(ch.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    salesChannel === ch.value
                      ? ch.color === "blue"
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                        : ch.color === "green"
                          ? "bg-green-500/20 border-green-500/50 text-green-400"
                          : "bg-zinc-500/20 border-zinc-500/50 text-zinc-400"
                      : "bg-zinc-900/50 border-white/10 text-zinc-500 hover:border-white/20"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-400 flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5" /> Producten
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addLineItem}
                className="text-cyan-400 h-7"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Regel toevoegen
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500 font-medium">
                      Regel {idx + 1}
                    </span>
                    {lineItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(idx)}
                        className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* EAN + Product Name */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-zinc-500">EAN</Label>
                      <div className="relative">
                        <Input
                          value={item.ean}
                          onChange={(e) => {
                            updateLineItem(idx, "ean", e.target.value);
                          }}
                          onBlur={() => searchByEan(item.ean, idx)}
                          placeholder="EAN / barcode"
                          className="bg-zinc-950/50 border-white/10 text-sm pr-8"
                        />
                        {eanSearching[idx] && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2.5 top-2.5 text-zinc-500" />
                        )}
                        {item._eanSearchResult && (
                          <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-green-500" />
                        )}
                      </div>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs text-zinc-500">
                        Productnaam
                      </Label>
                      <Input
                        value={item.product_name}
                        onChange={(e) =>
                          updateLineItem(idx, "product_name", e.target.value)
                        }
                        placeholder={
                          item._eanSearchResult
                            ? item._eanSearchResult.name
                            : "Productnaam"
                        }
                        className="bg-zinc-950/50 border-white/10 text-sm"
                      />
                      {item._eanSearchResult && (
                        <p className="text-[10px] text-green-500/70">
                          Gevonden: {item._eanSearchResult.name}
                        </p>
                      )}
                      {item.ean.length >= 8 &&
                        !item._eanSearchResult &&
                        !eanSearching[idx] && (
                          <p className="text-[10px] text-yellow-500/70">
                            Nieuw product — wordt automatisch aangemaakt
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Qty + Price + Country */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500">Aantal</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(idx, "quantity", e.target.value)
                        }
                        className="bg-zinc-950/50 border-white/10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500">
                        Prijs (ex BTW)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateLineItem(idx, "unit_price", e.target.value)
                        }
                        className="bg-zinc-950/50 border-white/10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500">Land</Label>
                      <Select
                        value={item.country_of_purchase}
                        onValueChange={(v) =>
                          updateLineItem(idx, "country_of_purchase", v)
                        }
                      >
                        <SelectTrigger className="bg-zinc-950/50 border-white/10 text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500">Subtotaal</Label>
                      <div className="h-9 flex items-center px-3 bg-zinc-950/30 border border-white/5 rounded-md text-sm text-zinc-300">
                        €{lineTotal(item).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* URL + Remarks (collapsed) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500 flex items-center gap-1">
                        <Link className="w-3 h-3" /> Bestel-URL
                      </Label>
                      <Input
                        value={item.order_url}
                        onChange={(e) =>
                          updateLineItem(idx, "order_url", e.target.value)
                        }
                        placeholder="https://..."
                        className="bg-zinc-950/50 border-white/10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Opmerking
                      </Label>
                      <Input
                        value={item.remarks}
                        onChange={(e) =>
                          updateLineItem(idx, "remarks", e.target.value)
                        }
                        placeholder="Notities..."
                        className="bg-zinc-950/50 border-white/10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total summary */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500">
                  {lineItems.filter((li) => li.ean.trim()).length} product
                  {lineItems.filter((li) => li.ean.trim()).length !== 1
                    ? "en"
                    : ""}
                </p>
                <p className="text-xs text-zinc-500">
                  Totale hoeveelheid:{" "}
                  {lineItems.reduce(
                    (sum, li) => sum + (parseFloat(li.quantity) || 0),
                    0
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Subtotaal (ex BTW)</p>
                <p className="text-lg font-bold text-white">
                  €{grandTotal.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500">
                  incl. 21% BTW: €{(grandTotal * 1.21).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aanmaken...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Inkoop Aanmaken
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
