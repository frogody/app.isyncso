import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";

const EntityPickerModal = ({
  open,
  onClose,
  entityName = "Item",
  title = "Select Items",
  multi = false,
  onConfirm,
}) => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadItems();
    } else {
      setSelected([]);
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entityName]);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Dynamic import based on entity name
      const { default: Entity } = await import(`@/api/entities`);
      const entityMap = {
        Candidate: Entity.Candidate,
        Project: Entity.Project,
        Campaign: Entity.Campaign,
        Role: Entity.Role,
      };

      const EntityClass = entityMap[entityName];
      if (EntityClass) {
        const data = await EntityClass.list();
        setItems(data || []);
      }
    } catch (error) {
      console.error("Error loading items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const searchLower = search.toLowerCase();
    const name = item.name || item.first_name || item.title || "";
    const email = item.email || "";
    return (
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower)
    );
  });

  const toggleItem = (item) => {
    if (multi) {
      setSelected((prev) =>
        prev.some((s) => s.id === item.id)
          ? prev.filter((s) => s.id !== item.id)
          : [...prev, item]
      );
    } else {
      setSelected([item]);
    }
  };

  const handleConfirm = () => {
    onConfirm?.(selected);
    onClose();
  };

  const getItemLabel = (item) => {
    if (item.first_name && item.last_name) {
      return `${item.first_name} ${item.last_name}`;
    }
    return item.name || item.title || item.email || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No items found
              </p>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => toggleItem(item)}
                >
                  {multi && (
                    <Checkbox
                      checked={selected.some((s) => s.id === item.id)}
                      onChange={() => {}}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getItemLabel(item)}</p>
                    {item.email && (
                      <p className="text-sm text-muted-foreground truncate">
                        {item.email}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.length === 0}>
            {multi ? `Select (${selected.length})` : "Select"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EntityPickerModal;
