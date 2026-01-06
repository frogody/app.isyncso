import React, { useState } from 'react';
import {
  Package, Copy, Archive, ExternalLink, QrCode, Download,
  Printer, Share2, MoreHorizontal, Truck, DollarSign,
  TrendingUp, Eye, EyeOff, Trash2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function QuickActions({
  product,
  details,
  onDuplicate,
  onArchive,
  onPublish,
  onAdjustStock,
  onReorder,
  onExport,
  isPhysical = true,
  className
}) {
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState(0);
  const [stockReason, setStockReason] = useState('');

  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    toast.success('Product link copied to clipboard');
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(product.id);
    toast.success('Product ID copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    onExport?.('pdf');
    toast.success('Generating PDF...');
  };

  const handleStockSubmit = () => {
    if (stockAdjustment !== 0) {
      onAdjustStock?.(stockAdjustment, stockReason);
      setStockDialogOpen(false);
      setStockAdjustment(0);
      setStockReason('');
      toast.success(`Stock adjusted by ${stockAdjustment > 0 ? '+' : ''}${stockAdjustment}`);
    }
  };

  const isPublished = product?.status === 'published';
  const isArchived = product?.status === 'archived';

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Primary Actions */}
        {isPhysical && (
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-zinc-300 hover:text-white"
            onClick={() => setStockDialogOpen(true)}
          >
            <Package className="w-4 h-4 mr-2" />
            Adjust Stock
          </Button>
        )}

        {isPhysical && details?.inventory?.quantity <= (details?.inventory?.low_stock_threshold || 10) && (
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => onReorder?.()}
          >
            <Truck className="w-4 h-4 mr-2" />
            Reorder
          </Button>
        )}

        {/* Share Button */}
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-zinc-300 hover:text-white"
          onClick={handleCopyLink}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 text-zinc-300 hover:text-white"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800">
            <DropdownMenuItem
              className="text-zinc-300 hover:text-white focus:text-white cursor-pointer"
              onClick={() => onDuplicate?.()}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>

            <DropdownMenuItem
              className="text-zinc-300 hover:text-white focus:text-white cursor-pointer"
              onClick={handleCopyId}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Copy ID
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-zinc-800" />

            {!isPublished && !isArchived && (
              <DropdownMenuItem
                className="text-green-400 hover:text-green-300 focus:text-green-300 cursor-pointer"
                onClick={() => onPublish?.()}
              >
                <Eye className="w-4 h-4 mr-2" />
                Publish
              </DropdownMenuItem>
            )}

            {isPublished && (
              <DropdownMenuItem
                className="text-amber-400 hover:text-amber-300 focus:text-amber-300 cursor-pointer"
                onClick={() => onPublish?.(false)}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Unpublish
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-zinc-800" />

            <DropdownMenuItem
              className="text-zinc-300 hover:text-white focus:text-white cursor-pointer"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </DropdownMenuItem>

            <DropdownMenuItem
              className="text-zinc-300 hover:text-white focus:text-white cursor-pointer"
              onClick={handleExportPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-zinc-800" />

            {!isArchived ? (
              <DropdownMenuItem
                className="text-red-400 hover:text-red-300 focus:text-red-300 cursor-pointer"
                onClick={() => onArchive?.()}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-green-400 hover:text-green-300 focus:text-green-300 cursor-pointer"
                onClick={() => onArchive?.(false)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restore
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Current stock: {details?.inventory?.quantity || 0} units
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Adjustment</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setStockAdjustment(prev => prev - 1)}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(parseInt(e.target.value) || 0)}
                  className="w-24 text-center bg-zinc-800 border-zinc-700"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={() => setStockAdjustment(prev => prev + 1)}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                New quantity: {(details?.inventory?.quantity || 0) + stockAdjustment}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Reason (optional)</Label>
              <Input
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="e.g., Physical count adjustment"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStockDialogOpen(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockSubmit}
              disabled={stockAdjustment === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
