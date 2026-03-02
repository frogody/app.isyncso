import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Trash2, Loader2, Building, Calendar, Euro, Package,
  Search, Globe, Link, MessageSquare, ShoppingCart, Check, ChevronsUpDown,
  Users, AlertTriangle, X
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { EU_COUNTRIES, COMMON_NON_EU } from "@/lib/btwRules";
import { getVatRate, calculateExclFromIncl, calculateInclFromExcl } from "@/lib/euVatRates";

const COUNTRIES = [
  ...EU_COUNTRIES.map(c => ({ value: c.code, label: c.name })),
  ...COMMON_NON_EU.map(c => ({ value: c.code, label: c.name })),
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
  const [selectedSupplier, setSelectedSupplier] = useState(null); // { id, name, source }
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [salesChannel, setSalesChannel] = useState("undecided");
  const [lineItems, setLineItems] = useState([{ ...EMPTY_LINE_ITEM }]);
  const [priceEntryMode, setPriceEntryMode] = useState("excl");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eanSearching, setEanSearching] = useState({});

  // Customer reservation
  const [reservedForCustomer, setReservedForCustomer] = useState(null); // { id, name, source: 'crm'|'portal' }
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [customers, setCustomers] = useState([]);

  // Load suppliers + CRM vendors + customers for reservation
  useEffect(() => {
    if (!companyId || !isOpen) return;
    (async () => {
      const [{ data: supplierData }, { data: crmSuppliers }, { data: crmCustomers }, { data: portalClients }] = await Promise.all([
        supabase
          .from("suppliers")
          .select("id, name, crm_company_id")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("prospects")
          .select("id, company, first_name, last_name, contact_type")
          .eq("organization_id", companyId)
          .eq("contact_type", "supplier")
          .order("company"),
        supabase
          .from("prospects")
          .select("id, company, first_name, last_name, contact_type")
          .eq("organization_id", companyId)
          .eq("contact_type", "customer")
          .order("company"),
        supabase
          .from("portal_clients")
          .select("id, company_name, contact_name")
          .eq("organization_id", companyId)
          .eq("status", "active")
          .order("company_name"),
      ]);
      // Deduplicate: if a supplier table entry name matches a CRM prospect, skip the prospect
      const existingSupplierNames = new Set(
        (supplierData || []).map((s) => (s.name || "").toLowerCase())
      );
      const crmSuppliersMapped = (crmSuppliers || [])
        .filter((c) => !existingSupplierNames.has((c.company || "").toLowerCase()))
        .map((c) => ({
          id: c.id,
          name: c.company || `${c.first_name || ""} ${c.last_name || ""}`.trim(),
          source: "crm",
        }));
      const merged = [
        ...(supplierData || []).map((s) => ({ ...s, source: "supplier" })),
        ...crmSuppliersMapped,
      ];
      setSuppliers(merged);

      // Build customer list for reservation from CRM contacts + B2B portal
      const customerList = [
        ...(crmCustomers || []).map((c) => ({
          id: c.id,
          name: c.company || `${c.first_name || ""} ${c.last_name || ""}`.trim(),
          source: "crm",
          type: c.contact_type,
        })),
        ...(portalClients || []).map((c) => ({ id: c.id, name: c.company_name || c.contact_name, source: "portal" })),
      ];
      setCustomers(customerList);
    })();
  }, [companyId, isOpen]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedSupplier(null);
      setNewSupplierName("");
      setIsNewSupplier(false);
      setGroupName("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setSalesChannel("undecided");
      setPriceEntryMode("excl");
      setLineItems([{ ...EMPTY_LINE_ITEM }]);
      setReservedForCustomer(null);
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

  const lineTotalExcl = (item) => {
    const raw = lineTotal(item);
    if (priceEntryMode === "incl") {
      return calculateExclFromIncl(raw, getVatRate(item.country_of_purchase));
    }
    return raw;
  };

  const lineTotalIncl = (item) => {
    const raw = lineTotal(item);
    if (priceEntryMode === "excl") {
      return calculateInclFromExcl(raw, getVatRate(item.country_of_purchase));
    }
    return raw;
  };

  const grandTotalExcl = lineItems.reduce((sum, item) => sum + lineTotalExcl(item), 0);
  const grandTotalIncl = lineItems.reduce((sum, item) => sum + lineTotalIncl(item), 0);
  const grandTaxAmount = grandTotalIncl - grandTotalExcl;

  const supplierItems = useMemo(
    () => suppliers.filter((s) => s.source === "supplier"),
    [suppliers]
  );
  const crmItems = useMemo(
    () => suppliers.filter((s) => s.source === "crm"),
    [suppliers]
  );
  const crmCustomerItems = useMemo(
    () => customers.filter((c) => c.source === "crm"),
    [customers]
  );
  const portalCustomerItems = useMemo(
    () => customers.filter((c) => c.source === "portal"),
    [customers]
  );

  const handlePriceEntryModeChange = (newMode) => {
    if (newMode === priceEntryMode) return;
    setLineItems(prev => prev.map(item => {
      const currentPrice = parseFloat(item.unit_price) || 0;
      if (currentPrice === 0) return item;
      const vatRate = getVatRate(item.country_of_purchase);
      let newPrice;
      if (newMode === "incl") {
        newPrice = calculateInclFromExcl(currentPrice, vatRate);
      } else {
        newPrice = calculateExclFromIncl(currentPrice, vatRate);
      }
      return { ...item, unit_price: Math.round(newPrice * 100) / 100 };
    }));
    setPriceEntryMode(newMode);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedSupplier && !newSupplierName.trim()) {
      toast.error("Select or enter a supplier");
      return;
    }
    const validLines = lineItems.filter(
      (li) => li.ean.trim() && (parseFloat(li.quantity) || 0) > 0
    );
    if (validLines.length === 0) {
      toast.error("Add at least 1 product with EAN and quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalSupplierId = selectedSupplier?.id || null;

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
      } else if (selectedSupplier?.source === "crm") {
        // Auto-create a supplier row from the CRM contact
        const { data: newSupplier, error: supplierErr } = await supabase
          .from("suppliers")
          .insert({
            company_id: companyId,
            name: selectedSupplier.name,
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

      // Calculate proper tax values from per-line country rates
      const subtotalExcl = validLines.reduce((sum, li) => sum + lineTotalExcl(li), 0);
      const totalIncl = validLines.reduce((sum, li) => sum + lineTotalIncl(li), 0);
      const taxAmount = totalIncl - subtotalExcl;
      const avgTaxPercent = subtotalExcl > 0 ? (taxAmount / subtotalExcl) * 100 : 21;

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

      // Step 1: Create stock purchase as draft (line items need to exist before approval)
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
          subtotal: subtotalExcl,
          tax_percent: Math.round(avgTaxPercent * 100) / 100,
          tax_amount: taxAmount,
          total: totalIncl,
          price_entry_mode: priceEntryMode,
          currency: "EUR",
          status: "draft",
          needs_review: false,
          review_status: "pending",
          source_type: "manual",
          reserved_for_customer_id: reservedForCustomer?.source === 'crm' ? reservedForCustomer.id : null,
          reserved_for_customer_name: reservedForCustomer?.name || null,
          reserved_for_portal_client_id: reservedForCustomer?.source === 'portal' ? reservedForCustomer.id : null,
        })
        .select("id")
        .single();
      if (purchaseErr) throw purchaseErr;

      // Step 2: Create line items with per-line tax data
      const lineItemInserts = validLines.map((li, idx) => {
        const vatRate = getVatRate(li.country_of_purchase);
        const unitPriceFloat = parseFloat(li.unit_price) || 0;
        const unitExcl = priceEntryMode === "incl" ? calculateExclFromIncl(unitPriceFloat, vatRate) : unitPriceFloat;
        const unitIncl = priceEntryMode === "excl" ? calculateInclFromExcl(unitPriceFloat, vatRate) : unitPriceFloat;
        const exclTotal = lineTotalExcl(li);
        const inclTotal = lineTotalIncl(li);

        return {
          stock_purchase_id: purchase.id,
          product_id: li.product_id || null,
          description: li.product_name.trim() || `Product ${li.ean}`,
          quantity: parseFloat(li.quantity) || 0,
          unit_price: unitExcl,
          unit_price_excl: unitExcl,
          unit_price_incl: unitIncl,
          line_total: exclTotal,
          line_total_excl: exclTotal,
          line_total_incl: inclTotal,
          tax_rate_used: vatRate,
          ean: li.ean.trim(),
          order_url: li.order_url.trim() || null,
          country_of_purchase: li.country_of_purchase,
          sales_channel: li.sales_channel,
          remarks: li.remarks?.trim() || null,
          is_physical_product: true,
          line_number: idx + 1,
        };
      });

      const { error: lineErr } = await supabase
        .from("stock_purchase_line_items")
        .insert(lineItemInserts);
      if (lineErr) throw lineErr;

      // Step 3: Approve the purchase (fires DB trigger to create expected deliveries + update inventory)
      const { error: approveErr } = await supabase
        .from("stock_purchases")
        .update({
          status: "approved",
          needs_review: false,
          review_status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", purchase.id);
      if (approveErr) throw approveErr;

      toast.success(
        `Purchase created with ${validLines.length} product${validLines.length > 1 ? "s" : ""}`
      );
      onPurchaseCreated?.();
      onClose();
    } catch (error) {
      console.error("Failed to create manual purchase:", error);
      toast.error(`Error creating purchase: ${error.message}`);
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
            Manual Purchase
          </DialogTitle>
          <DialogDescription>
            Add a new purchase manually with products, quantities and prices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Supplier */}
          <div className="space-y-2">
            <Label className="text-zinc-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Supplier
            </Label>
            {isNewSupplier ? (
              <div className="flex gap-2">
                <Input
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="New supplier name"
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
                  Existing
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supplierPopoverOpen}
                      className="w-full justify-between bg-zinc-900/50 border-white/10 text-left font-normal hover:bg-zinc-800"
                    >
                      {selectedSupplier ? (
                        <span className="flex items-center gap-2 truncate">
                          {selectedSupplier.name}
                          {selectedSupplier.source === "crm" && (
                            <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px] px-1.5 py-0">
                              CRM
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-500">Search suppliers...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-zinc-900 border-white/10" align="start">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Search suppliers..." className="text-sm" />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty className="py-4 text-center text-sm text-zinc-500">
                          No suppliers found.
                        </CommandEmpty>
                        {supplierItems.length > 0 && (
                          <CommandGroup heading="Suppliers">
                            {supplierItems.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={s.name}
                                onSelect={() => {
                                  setSelectedSupplier(s);
                                  setSupplierPopoverOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedSupplier?.id === s.id ? "opacity-100 text-cyan-400" : "opacity-0"
                                  }`}
                                />
                                {s.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {crmItems.length > 0 && (
                          <CommandGroup heading="CRM Vendors">
                            {crmItems.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => {
                                  setSelectedSupplier(c);
                                  setSupplierPopoverOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedSupplier?.id === c.id ? "opacity-100 text-cyan-400" : "opacity-0"
                                  }`}
                                />
                                <span className="flex items-center gap-2">
                                  {c.name}
                                  <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px] px-1.5 py-0">
                                    CRM
                                  </Badge>
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsNewSupplier(true);
                    setSelectedSupplier(null);
                  }}
                  className="text-cyan-400 shrink-0"
                >
                  + New
                </Button>
              </div>
            )}
          </div>

          {/* Group name + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-zinc-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Group Name (optional)
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
                <Calendar className="w-3.5 h-3.5" /> Date
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
            <Label className="text-zinc-400">Sales Channel</Label>
            <div className="flex gap-2">
              {[
                { value: "b2b", label: "B2B", color: "blue" },
                { value: "b2c", label: "B2C", color: "green" },
                { value: "undecided", label: "Undecided", color: "zinc" },
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

          {/* Price Entry Mode */}
          <div className="space-y-2">
            <Label className="text-zinc-400 flex items-center gap-1.5">
              <Euro className="w-3.5 h-3.5" /> Price Entry Mode
            </Label>
            <div className="flex gap-2">
              {[
                { value: "excl", label: "Excl. VAT" },
                { value: "incl", label: "Incl. VAT" },
              ].map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => handlePriceEntryModeChange(mode.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    priceEntryMode === mode.value
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                      : "bg-zinc-900/50 border-white/10 text-zinc-500 hover:border-white/20"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reserved for Customer (optional) */}
          <div className="space-y-2">
            <Label className="text-zinc-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Reserved for Customer (optional)
            </Label>
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between bg-zinc-900/50 border-white/10 hover:bg-zinc-800 text-left"
                >
                  {reservedForCustomer ? (
                    <span className="text-white truncate">{reservedForCustomer.name}</span>
                  ) : (
                    <span className="text-zinc-500">Select customer...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search customers..." />
                  <CommandList>
                    <CommandEmpty>No customers found.</CommandEmpty>
                    {crmCustomerItems.length > 0 && (
                      <CommandGroup heading="CRM Customers">
                        {crmCustomerItems.map((c) => (
                          <CommandItem
                            key={`crm-${c.id}`}
                            value={c.name}
                            onSelect={() => {
                              setReservedForCustomer(c);
                              setCustomerPopoverOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${reservedForCustomer?.id === c.id ? 'opacity-100' : 'opacity-0'}`} />
                            <span>{c.name}</span>
                            {c.type && (
                              <Badge variant="outline" className="ml-auto text-[10px]">{c.type}</Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {portalCustomerItems.length > 0 && (
                      <CommandGroup heading="B2B Portal Clients">
                        {portalCustomerItems.map((c) => (
                          <CommandItem
                            key={`portal-${c.id}`}
                            value={c.name}
                            onSelect={() => {
                              setReservedForCustomer(c);
                              setCustomerPopoverOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${reservedForCustomer?.id === c.id ? 'opacity-100' : 'opacity-0'}`} />
                            <span>{c.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {reservedForCustomer && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      This entire purchase will be reserved for <strong>{reservedForCustomer.name}</strong>
                    </p>
                    <p className="text-xs text-amber-400/70 mt-1">Products will not be marked as free stock when received.</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-amber-400 hover:text-amber-300 shrink-0"
                    onClick={() => setReservedForCustomer(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-400 flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5" /> Products
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addLineItem}
                className="text-cyan-400 h-7"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add line
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
                      Line {idx + 1}
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
                        Product name
                      </Label>
                      <Input
                        value={item.product_name}
                        onChange={(e) =>
                          updateLineItem(idx, "product_name", e.target.value)
                        }
                        placeholder={
                          item._eanSearchResult
                            ? item._eanSearchResult.name
                            : "Product name"
                        }
                        className="bg-zinc-950/50 border-white/10 text-sm"
                      />
                      {item._eanSearchResult && (
                        <p className="text-[10px] text-green-500/70">
                          Found: {item._eanSearchResult.name}
                        </p>
                      )}
                      {item.ean.length >= 8 &&
                        !item._eanSearchResult &&
                        !eanSearching[idx] && (
                          <p className="text-[10px] text-yellow-500/70">
                            New product — will be created automatically
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Qty + Price + Country */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500">Quantity</Label>
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
                        Price ({priceEntryMode === "incl" ? "incl." : "excl."} VAT)
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
                      <Label className="text-xs text-zinc-500">Country</Label>
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
                      <Label className="text-xs text-zinc-500">Subtotal</Label>
                      <div className="h-9 flex items-center px-3 bg-zinc-950/30 border border-white/5 rounded-md text-sm text-zinc-300">
                        €{lineTotal(item).toFixed(2)}
                      </div>
                      <p className="text-[10px] text-zinc-600">
                        {getVatRate(item.country_of_purchase)}% VAT ({item.country_of_purchase})
                      </p>
                    </div>
                  </div>

                  {/* URL + Remarks (collapsed) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500 flex items-center gap-1">
                        <Link className="w-3 h-3" /> Order URL
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
                        <MessageSquare className="w-3 h-3" /> Remark
                      </Label>
                      <Input
                        value={item.remarks}
                        onChange={(e) =>
                          updateLineItem(idx, "remarks", e.target.value)
                        }
                        placeholder="Notes..."
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
                    ? "s"
                    : ""}
                </p>
                <p className="text-xs text-zinc-500">
                  Total quantity:{" "}
                  {lineItems.reduce(
                    (sum, li) => sum + (parseFloat(li.quantity) || 0),
                    0
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Subtotal (excl. VAT)</p>
                <p className="text-lg font-bold text-white">
                  €{grandTotalExcl.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500">
                  VAT: €{grandTaxAmount.toFixed(2)}
                </p>
                <p className="text-sm font-medium text-zinc-300">
                  Total incl. VAT: €{grandTotalIncl.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Create Purchase
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
