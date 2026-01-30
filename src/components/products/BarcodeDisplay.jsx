import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from '@/components/ui/button';
import {
  Download, Printer, Copy, Check, QrCode, Barcode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * BarcodeDisplay - Automatically generates and displays barcodes from SKU/EAN/UPC codes
 *
 * Supports:
 * - EAN-13 (13-digit European Article Number)
 * - EAN-8 (8-digit short EAN)
 * - UPC-A (12-digit Universal Product Code)
 * - CODE128 (variable length, for SKUs)
 *
 * Auto-detects format based on code length and content
 */
export default function BarcodeDisplay({
  code,
  type = 'auto', // 'auto', 'ean13', 'ean8', 'upca', 'code128'
  label,
  showLabel = true,
  showControls = true,
  height = 60,
  width = 2,
  className,
  displayMode = 'inline', // 'inline', 'card', 'compact'
}) {
  const svgRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [barcodeValid, setBarcodeValid] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState(null);

  // Auto-detect barcode format based on code characteristics
  const detectFormat = (code) => {
    if (!code) return null;

    const cleanCode = code.replace(/[^0-9]/g, '');

    // EAN-13: 13 digits (European Article Number)
    if (/^\d{13}$/.test(cleanCode)) return 'ean13';

    // EAN-8: 8 digits (short form)
    if (/^\d{8}$/.test(cleanCode)) return 'ean8';

    // UPC-A: 12 digits (US/Canada)
    if (/^\d{12}$/.test(cleanCode)) return 'upca';

    // UPC-E: 6 digits (compressed UPC)
    if (/^\d{6}$/.test(cleanCode)) return 'upce';

    // For alphanumeric or other lengths, use Code128
    return 'code128';
  };

  // Generate barcode
  useEffect(() => {
    if (!code || !svgRef.current) {
      setBarcodeValid(false);
      return;
    }

    const format = type === 'auto' ? detectFormat(code) : type;
    setDetectedFormat(format);

    // Map our format names to JsBarcode format names
    const formatMap = {
      'ean13': 'EAN13',
      'ean8': 'EAN8',
      'upca': 'UPC',
      'upce': 'UPC',
      'code128': 'CODE128',
    };

    try {
      JsBarcode(svgRef.current, code, {
        format: formatMap[format] || 'CODE128',
        width: width,
        height: height,
        displayValue: showLabel,
        text: label || code,
        fontOptions: 'bold',
        font: 'monospace',
        fontSize: 14,
        textAlign: 'center',
        textMargin: 6,
        background: 'transparent',
        lineColor: '#ffffff',
        margin: 10,
        marginTop: 10,
        marginBottom: showLabel ? 5 : 10,
        valid: (valid) => {
          setBarcodeValid(valid);
          if (!valid) {
            console.warn(`Invalid barcode: ${code} for format ${format}`);
          }
        }
      });
    } catch (error) {
      console.error('Barcode generation error:', error);
      setBarcodeValid(false);
    }
  }, [code, type, label, showLabel, height, width]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    if (!svgRef.current) return;

    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode-${code}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Barcode downloaded');
  };

  const handlePrint = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${code}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: white;
            }
            svg { max-width: 100%; }
            svg rect { fill: white !important; }
            svg text, svg path { fill: black !important; stroke: none !important; }
            svg g { fill: black !important; }
          </style>
        </head>
        <body>
          ${svgData}
          <script>
            // Invert colors for printing
            document.querySelectorAll('svg rect').forEach(r => r.setAttribute('fill', 'white'));
            document.querySelectorAll('svg path').forEach(p => p.setAttribute('fill', 'black'));
            document.querySelectorAll('svg text').forEach(t => t.setAttribute('fill', 'black'));
            setTimeout(() => { window.print(); window.close(); }, 250);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!code) {
    return (
      <div className={cn(
        "flex items-center justify-center p-4 rounded-lg bg-zinc-800/50 border border-white/5",
        className
      )}>
        <Barcode className="w-8 h-8 text-zinc-600" />
        <span className="ml-2 text-zinc-500 text-sm">No barcode data</span>
      </div>
    );
  }

  // Compact mode - just the barcode inline
  if (displayMode === 'compact') {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <div className="bg-white rounded p-1">
          <svg ref={svgRef} />
        </div>
        {showControls && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
    );
  }

  // Inline mode - barcode with minimal styling
  if (displayMode === 'inline') {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="bg-white rounded-lg p-2 flex-shrink-0">
          <svg ref={svgRef} />
        </div>
        {showControls && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 text-zinc-400 hover:text-white"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-zinc-400 hover:text-white"
              title="Download SVG"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrint}
              className="h-8 w-8 text-zinc-400 hover:text-white"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Card mode - full featured display
  return (
    <div className={cn(
      "rounded-xl bg-zinc-900/50 border border-white/5 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Barcode className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">
            {detectedFormat?.toUpperCase() || 'Barcode'}
          </span>
        </div>
        {!barcodeValid && (
          <span className="text-xs text-cyan-400">Invalid format</span>
        )}
      </div>

      {/* Barcode */}
      <div className="p-4 flex justify-center bg-white">
        <svg ref={svgRef} style={{ maxWidth: '100%' }} />
      </div>

      {/* Controls */}
      {showControls && (
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-sm text-zinc-400 font-mono">{code}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-3 text-zinc-400 hover:text-white"
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-1 text-cyan-400" /> Copied</>
              ) : (
                <><Copy className="w-4 h-4 mr-1" /> Copy</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-3 text-zinc-400 hover:text-white"
            >
              <Download className="w-4 h-4 mr-1" /> SVG
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrint}
              className="h-8 px-3 text-zinc-400 hover:text-white"
            >
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline barcode for use in tables/lists
 */
export function InlineBarcode({ code, className }) {
  return (
    <BarcodeDisplay
      code={code}
      displayMode="compact"
      showControls={false}
      showLabel={false}
      height={30}
      width={1.5}
      className={className}
    />
  );
}
