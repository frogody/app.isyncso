import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { PermissionGuard } from "@/components/guards";
import { ProductsPageTransition } from "@/components/products/ui";
import {
  PackageCheck, Truck, Boxes, ClipboardCheck, Sun, Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import InventoryReceiving from "./InventoryReceiving";
import InventoryShipping from "./InventoryShipping";
import PalletBuilder from "./PalletBuilder";
import ShipmentVerification from "./ShipmentVerification";

const TABS = [
  { id: "receiving", label: "Receiving", icon: PackageCheck },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "packing", label: "Packing", icon: Boxes },
  { id: "verification", label: "Verification", icon: ClipboardCheck },
];

export default function Warehouse() {
  const { t, theme, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "receiving");

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <PermissionGuard permission="inventory.manage" showMessage>
      <ProductsPageTransition>
        <div className={`min-h-screen ${t("bg-gray-50", "bg-zinc-950")} ${t("text-gray-900", "text-white")}`}>
          <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Boxes className={`w-7 h-7 ${t("text-cyan-600", "text-cyan-400")}`} />
                <h1 className="text-2xl font-bold">Warehouse</h1>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>

            {/* Tab Bar */}
            <div className={`flex items-center gap-1 p-1 rounded-xl ${t("bg-gray-100 border border-gray-200", "bg-zinc-900/60 border border-zinc-800")}`}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center
                      ${isActive
                        ? `${t("bg-white shadow-sm", "bg-zinc-800")} text-cyan-400`
                        : `${t("text-gray-500 hover:text-gray-700 hover:bg-gray-50", "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50")}`
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : ""}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === "receiving" && <InventoryReceiving embedded />}
              {activeTab === "shipping" && <InventoryShipping embedded />}
              {activeTab === "packing" && <PalletBuilder embedded />}
              {activeTab === "verification" && <ShipmentVerification embedded />}
            </div>
          </div>
        </div>
      </ProductsPageTransition>
    </PermissionGuard>
  );
}
