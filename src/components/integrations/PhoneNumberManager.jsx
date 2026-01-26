// PhoneNumberManager.jsx
// Allows users to purchase and manage phone numbers through iSyncSO

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Phone,
  Plus,
  Search,
  Loader2,
  MapPin,
  MessageSquare,
  Mic,
  Image,
  Trash2,
  Edit2,
  Check,
  X,
  DollarSign,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function PhoneNumberManager({ onNumberSelected }) {
  const { user } = useUser();
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState(null);
  const [releasing, setReleasing] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [newName, setNewName] = useState("");

  // Search params
  const [searchCountry, setSearchCountry] = useState("US");
  const [searchAreaCode, setSearchAreaCode] = useState("");
  const [searchContains, setSearchContains] = useState("");

  const fetchNumbers = useCallback(async () => {
    if (!user?.company_id) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/twilio-numbers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "list",
          organization_id: user.company_id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNumbers(data.numbers || []);
      }
    } catch (error) {
      console.error("Failed to fetch numbers:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  const searchAvailableNumbers = async () => {
    setSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/twilio-numbers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "search",
          organization_id: user.company_id,
          country: searchCountry,
          area_code: searchAreaCode || undefined,
          contains: searchContains || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.numbers || []);
        if (data.numbers?.length === 0) {
          toast({
            title: "No numbers found",
            description: "Try a different area code or search term",
          });
        }
      } else {
        toast({
          title: "Search failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const purchaseNumber = async (phoneNumber) => {
    setPurchasing(phoneNumber);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/twilio-numbers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "purchase",
          organization_id: user.company_id,
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Number purchased!",
          description: `${phoneNumber} is now ready to use`,
        });
        setSearchOpen(false);
        fetchNumbers();
      } else {
        toast({
          title: "Purchase failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const releaseNumber = async (numberId) => {
    if (!confirm("Are you sure you want to release this number? This cannot be undone.")) {
      return;
    }

    setReleasing(numberId);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/twilio-numbers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "release",
          organization_id: user.company_id,
          number_id: numberId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Number released",
          description: "The number has been released",
        });
        fetchNumbers();
      } else {
        toast({
          title: "Release failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Release failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReleasing(null);
    }
  };

  const updateNumberName = async (numberId) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/twilio-numbers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "update",
          organization_id: user.company_id,
          number_id: numberId,
          friendly_name: newName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Name updated" });
        fetchNumbers();
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEditingName(null);
      setNewName("");
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    // Format +1234567890 as (123) 456-7890
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--txt)" }}>
            Phone Numbers
          </h3>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Purchase and manage SMS phone numbers
          </p>
        </div>

        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Get New Number
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--txt)" }}>Get a Phone Number</DialogTitle>
              <DialogDescription>
                Search for available numbers and purchase instantly. Numbers cost $2/month.
              </DialogDescription>
            </DialogHeader>

            {/* Search Form */}
            <div className="grid grid-cols-3 gap-3 py-4">
              <div>
                <Label className="text-xs" style={{ color: "var(--muted)" }}>Country</Label>
                <Select value={searchCountry} onValueChange={setSearchCountry}>
                  <SelectTrigger style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs" style={{ color: "var(--muted)" }}>Area Code</Label>
                <Input
                  placeholder="e.g. 415"
                  value={searchAreaCode}
                  onChange={(e) => setSearchAreaCode(e.target.value)}
                  maxLength={3}
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--txt)" }}
                />
              </div>

              <div>
                <Label className="text-xs" style={{ color: "var(--muted)" }}>Contains</Label>
                <Input
                  placeholder="e.g. 2024"
                  value={searchContains}
                  onChange={(e) => setSearchContains(e.target.value)}
                  maxLength={7}
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--txt)" }}
                />
              </div>
            </div>

            <Button
              onClick={searchAvailableNumbers}
              disabled={searching}
              className="w-full gap-2"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search Available Numbers
            </Button>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                {searchResults.map((num) => (
                  <div
                    key={num.phone_number}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "var(--accent-muted)" }}
                      >
                        <Phone className="w-5 h-5" style={{ color: "var(--accent)" }} />
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: "var(--txt)" }}>
                          {formatPhoneNumber(num.phone_number)}
                        </div>
                        <div className="text-xs flex items-center gap-2" style={{ color: "var(--muted)" }}>
                          {num.locality && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {num.locality}, {num.region}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            {num.capabilities?.sms && <MessageSquare className="w-3 h-3" />}
                            {num.capabilities?.mms && <Image className="w-3 h-3" />}
                            {num.capabilities?.voice && <Mic className="w-3 h-3" />}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium" style={{ color: "var(--txt)" }}>
                          ${num.monthly_cost}/mo
                        </div>
                        <div className="text-xs" style={{ color: "var(--muted)" }}>
                          + ${num.setup_cost} setup
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => purchaseNumber(num.phone_number)}
                        disabled={purchasing === num.phone_number}
                      >
                        {purchasing === num.phone_number ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Buy"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Numbers List */}
      {numbers.length === 0 ? (
        <Card style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <CardContent className="py-8 text-center">
            <Phone className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--muted)" }} />
            <h4 className="font-medium mb-2" style={{ color: "var(--txt)" }}>
              No phone numbers yet
            </h4>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Get a phone number to start sending SMS messages
            </p>
            <Button onClick={() => setSearchOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Get Your First Number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {numbers.map((num) => (
            <div
              key={num.id}
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "var(--accent-muted)" }}
                >
                  <Phone className="w-6 h-6" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {editingName === num.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Enter name..."
                          className="h-7 w-40"
                          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--txt)" }}
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateNumberName(num.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingName(null);
                            setNewName("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium" style={{ color: "var(--txt)" }}>
                          {num.friendly_name || formatPhoneNumber(num.phone_number)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingName(num.id);
                            setNewName(num.friendly_name || "");
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    {formatPhoneNumber(num.phone_number)}
                    {num.locality && ` • ${num.locality}, ${num.region}`}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    <span>{num.messages_sent || 0} sent</span>
                    <span>{num.messages_received || 0} received</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  variant={num.status === "active" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {num.status}
                </Badge>

                <div className="text-right text-sm">
                  <div style={{ color: "var(--txt)" }}>${(num.monthly_cost_cents / 100).toFixed(2)}/mo</div>
                </div>

                {onNumberSelected && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNumberSelected(num)}
                  >
                    Select
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={() => releaseNumber(num.id)}
                  disabled={releasing === num.id}
                >
                  {releasing === num.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pricing Info */}
      <div
        className="p-4 rounded-lg border flex items-start gap-3"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <DollarSign className="w-5 h-5 mt-0.5" style={{ color: "var(--accent)" }} />
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--txt)" }}>
            Simple Pricing
          </div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            $2/month per number + $0.01 per SMS sent. No setup fees. Cancel anytime.
          </div>
        </div>
      </div>
    </div>
  );
}
