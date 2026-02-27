import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, Loader2, Building, Calendar, Euro, Package,
  Search, FileText, Users, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const EMPTY_LINE_ITEM = {
  product_id: null,
  product_name: "",
  sku: "",
  ean: "",
  quantity: 1,
  unit_price: 0,
  _searchQuery: "",
  _searchResults: [],
  _showDropdown: false,
};

export default function PrepOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  companyId,
  organizationId,
  userId,
}) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [internalNotes, setInternalNotes] = useState("");
  const [lineItems, setLineItems] = useState([{ ...EMPTY_LINE_ITEM }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchTimers = useRef({});

  useEffect(() => {
    if (!organizationId || !isOpen) return;
    (async () => {
      const { data } = await supabase
        .from("portal_clients")
        .select("id, company_name, contact_name, email")
        .eq("organization_id", organizationId)
        .order("company_name");
      setClients(data || []);
    })();
  }, [organizationId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setClientId("");
      setIsNewClient(false);
      setNewClientName("");
      setOrderDate(new Date().toISOString().split("T")[0]);
      setInternalNotes("");
      setLineItems([{ ...EMPTY_LINE_ITEM }]);
    }
  }, [isOpen]);

  const searchProducts = useCallback(
    async (query, lineIndex) => {
      if (!query || query.length < 2 || !companyId) {
        setLineItems((prev) =>
          prev.map((item, i) =>
            i === lineIndex
              ? { ...item, _searchResults: [], _showDropdown: false }
              : item
          )
        );
        return;
      }

      const { data } = await supabase
        .from("products")
        .select("id, name, sku, ean, price")
        .eq("company_id", companyId)
        .or(`name.ilike.%${query}%,ean.eq.${query},sku.ilike.%${query}%`)
        .limit(8);

      setLineItems((prev) =>
        prev.map((item, i) =>
          i === lineIndex
            ? { ...item, _searchResults: data || [], _showDropdown: (data || []).length > 0 }
            : item
        )
      );
    },
    [companyId]
  );

  const handleSearchInput = (index, value) => {
    updateLineItem(index, "_searchQuery", value);

    if (searchTimers.current[index]) {
      clearTimeout(searchTimers.current[index]);
    }
    searchTimers.current[index] = setTimeout(() => {
      searchProducts(value, index);
    }, 300);
  };

  const selectProduct = (index, product) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              product_id: product.id,
              product_name: product.name,
              sku: product.sku || "",
              ean: product.ean || "",
              unit_price: product.price || 0,
              _searchQuery: product.name,
              _searchResults: [],
              _showDropdown: false,
            }
          : item
      )
    );
  };

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

  const subtotal = lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const taxAmount = subtotal * 0.21;
  const total = subtotal + taxAmount;

  const handleSubmit = async () => {
    const validLines = lineItems.filter(
      (li) => li.product_id && (parseFloat(li.quantity) || 0) > 0
    );
    if (validLines.length === 0) {
      toast.error("Add at least 1 product with quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalClientId = clientId || null;

      if (isNewClient && newClientName.trim()) {
        const { data: newClient, error: clientErr } = await supabase
          .from("portal_clients")
          .insert({
            organization_id: organizationId,
            company_name: newClientName.trim(),
          })
          .select("id")
          .single();
        if (clientErr) throw clientErr;
        finalClientId = newClient.id;
      }

      const { data: order, error: orderErr } = await supabase
        .from("b2b_orders")
        .insert({
          organization_id: organizationId,
          company_id: companyId,
          client_id: finalClientId,
          status: "confirmed",
          subtotal,
          tax_amount: taxAmount,
          total,
          currency: "EUR",
          internal_notes: internalNotes.trim() || null,
        })
        .select("id, order_number")
        .single();
      if (orderErr) throw orderErr;

      const orderItemInserts = validLines.map((li) => ({
        b2b_order_id: order.id,
        product_id: li.product_id,
        product_name: li.product_name,
        sku: li.sku || null,
        ean: li.ean || null,
        quantity: parseFloat(li.quantity) || 0,
        unit_price: parseFloat(li.unit_price) || 0,
        line_total: lineTotal(li),
        tax_percent: 21,
      }));

      const { error: itemsErr } = await supabase
        .from("b2b_order_items")
        .insert(orderItemInserts);
      if (itemsErr) throw itemsErr;

      const { error: shippingErr } = await supabase
        .from("shipping_tasks")
        .insert({
          company_id: companyId,
          b2b_orders: order.id,
          status: "pending",
          priority: "normal",
        });
      if (shippingErr) throw shippingErr;

      toast.success(
        `Order ${order.order_number || "created"} with ${validLines.length} product${validLines.length > 1 ? "s" : ""}`
      );
      onOrderCreated?.();
      onClose();
    } catch (error) {
      console.error("Failed to create B2B order:", error);
      toast.error(`Error creating order: ${error.message}`);
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
            Prep B2B Order
          </DialogTitle>
          <DialogDescription>
            Create a new B2B order by selecting a customer and adding products.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer */}
          <div className="space-y-2">
            <Label className="text-zinc-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Customer
            </Label>
            {isNewClient ? (
              <div className="flex gap-2">
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="New customer company name"
                  className="bg-zinc-900/50 border-white/10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsNewClient(false);
                    setNewClientName("");
                  }}
                  className="text-zinc-400 shrink-0"
                >
                  Existing
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="bg-zinc-900/50 border-white/10">
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                        {c.contact_name ? ` — ${c.contact_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsNewClient(true);
                    setClientId("");
                  }}
                  className="text-cyan-400 shrink-0"
                >
                  + New
                </Button>
              </div>
            )}
          </div>

          {/* Date + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Order Date
              </Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="bg-zinc-900/50 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Internal Notes
              </Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Warehouse notes..."
                rows={1}
                className="bg-zinc-900/50 border-white/10 resize-none"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Products
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

                  {/* Product Search */}
                  <div className="space-y-1 relative">
                    <Label className="text-xs text-zinc-500">Product</Label>
                    <div className="relative">
                      <Input
                        value={item._searchQuery}
                        onChange={(e) => handleSearchInput(idx, e.target.value)}
                        onFocus={() => {
                          if (item._searchResults.length > 0) {
                            updateLineItem(idx, "_showDropdown", true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => updateLineItem(idx, "_showDropdown", false), 200);
                        }}
                        placeholder="Search by name, EAN, or SKU..."
                        className="bg-zinc-950/50 border-white/10 text-sm pr-8"
                      />
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-zinc-500" />
                    </div>
                    {item._showDropdown && item._searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {item._searchResults.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectProduct(idx, product)}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                          >
                            <p className="text-sm text-white truncate">{product.name}</p>
                            <p className="text-xs text-zinc-500">
                              {product.sku && `SKU: ${product.sku}`}
                              {product.sku && product.ean && " · "}
                              {product.ean && `EAN: ${product.ean}`}
                              {(product.sku || product.ean) && " · "}
                              €{(product.price || 0).toFixed(2)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {item.product_id && (
                      <p className="text-[10px] text-cyan-500/70">
                        {item.sku && `SKU: ${item.sku}`}
                        {item.sku && item.ean && " · "}
                        {item.ean && `EAN: ${item.ean}`}
                      </p>
                    )}
                  </div>

                  {/* Qty + Price + Line Total */}
                  <div className="grid grid-cols-3 gap-2">
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
                      <Label className="text-xs text-zinc-500">Unit Price</Label>
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
                      <Label className="text-xs text-zinc-500">Line Total</Label>
                      <div className="h-9 flex items-center px-3 bg-zinc-950/30 border border-white/5 rounded-md text-sm text-zinc-300">
                        €{lineTotal(item).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500">
                  {lineItems.filter((li) => li.product_id).length} product
                  {lineItems.filter((li) => li.product_id).length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-zinc-500">
                  Total quantity:{" "}
                  {lineItems.reduce(
                    (sum, li) => sum + (parseFloat(li.quantity) || 0),
                    0
                  )}
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <div className="flex items-center justify-end gap-4">
                  <span className="text-xs text-zinc-500">Subtotal</span>
                  <span className="text-sm text-zinc-300">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-end gap-4">
                  <span className="text-xs text-zinc-500">VAT (21%)</span>
                  <span className="text-sm text-zinc-300">€{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-end gap-4 pt-1 border-t border-white/5">
                  <span className="text-xs text-zinc-400 font-medium">Total</span>
                  <span className="text-lg font-bold text-white">€{total.toFixed(2)}</span>
                </div>
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
                Create Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
