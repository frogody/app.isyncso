/**
 * Invoice Processor Agent
 *
 * Uses AI vision to extract structured data from invoice images/PDFs.
 * CRITICAL: Only processes INVOICES, rejects order confirmations.
 */

import Together from 'together-ai';
import type { AgentContext } from '../types';
import type {
  InvoiceExtractionResult,
  EmailClassificationResult,
} from './types';
import { INVOICE_PROCESSOR_CONFIG } from './types';
import { MIN_CONFIDENCE, INVOICE_KEYWORDS, SKIP_KEYWORDS } from '@/lib/db/schema';

export class InvoiceProcessorAgent {
  private client: Together;
  private config = INVOICE_PROCESSOR_CONFIG;

  constructor(apiKey?: string) {
    const key = apiKey || import.meta.env.VITE_TOGETHER_API_KEY;
    if (!key) {
      throw new Error('Together API key is required');
    }
    this.client = new Together({ apiKey: key });
  }

  /**
   * Classify an email to determine if it's an invoice
   * CRITICAL: Rejects order confirmations
   */
  async classifyEmail(
    subject: string,
    bodyText: string,
    fromAddress: string
  ): Promise<EmailClassificationResult> {
    const combinedText = `${subject}\n${bodyText}`.toLowerCase();

    // Quick rejection for order confirmations
    for (const keyword of SKIP_KEYWORDS) {
      if (combinedText.includes(keyword.toLowerCase())) {
        return {
          classification: 'order_confirmation',
          confidence: 0.95,
          reason: `Contains order confirmation keyword: "${keyword}"`,
          should_process: false,
        };
      }
    }

    // Check for invoice indicators
    let invoiceScore = 0;
    const foundKeywords: string[] = [];

    for (const keyword of INVOICE_KEYWORDS) {
      if (combinedText.includes(keyword.toLowerCase())) {
        invoiceScore += 0.2;
        foundKeywords.push(keyword);
      }
    }

    // Check for shipping notification patterns
    if (
      combinedText.includes('track') ||
      combinedText.includes('verzend') ||
      combinedText.includes('pakket onderweg')
    ) {
      return {
        classification: 'shipping_notification',
        confidence: 0.8,
        reason: 'Contains shipping/tracking keywords',
        should_process: false,
      };
    }

    // Determine classification
    if (invoiceScore >= 0.4) {
      return {
        classification: 'invoice',
        confidence: Math.min(invoiceScore, 0.95),
        reason: `Found invoice keywords: ${foundKeywords.join(', ')}`,
        should_process: true,
      };
    }

    return {
      classification: 'other',
      confidence: 0.6,
      reason: 'No clear invoice or order confirmation indicators found',
      should_process: false,
    };
  }

  /**
   * Extract structured data from an invoice image
   */
  async extractFromImage(
    imageUrl: string,
    context?: AgentContext
  ): Promise<InvoiceExtractionResult> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.config.systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all data from this invoice image. Return a JSON object with the following structure:
{
  "is_invoice": boolean,
  "rejection_reason": string | null,
  "supplier_name": string,
  "supplier_email": string | null,
  "invoice_number": string,
  "invoice_date": string (YYYY-MM-DD),
  "due_date": string | null (YYYY-MM-DD),
  "subtotal": number,
  "tax_percent": number,
  "tax_amount": number,
  "total": number,
  "currency": string (default "EUR"),
  "line_items": [
    {
      "description": string,
      "quantity": number,
      "unit": string,
      "unit_price": number,
      "line_total": number,
      "ean": string | null,
      "sku": string | null,
      "is_physical_product": boolean
    }
  ],
  "payment_details": {
    "iban": string | null,
    "bic": string | null,
    "reference": string | null
  },
  "confidence_scores": {
    "overall": number,
    "supplier_name": number,
    "invoice_number": number,
    "total": number,
    "line_items": number
  }
}

IMPORTANT: Set is_invoice to false if this is an order confirmation, pakbon, or any non-invoice document.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          confidence: 0,
          errors: ['No response from model'],
        };
      }

      const parsed = JSON.parse(content);

      // Reject if not an invoice
      if (parsed.is_invoice === false) {
        return {
          success: false,
          confidence: 0,
          errors: [parsed.rejection_reason || 'Document is not an invoice'],
        };
      }

      // Calculate overall confidence
      const confidenceScores = parsed.confidence_scores || {};
      const overallConfidence =
        confidenceScores.overall ||
        this.calculateConfidence(confidenceScores);

      return {
        success: true,
        confidence: overallConfidence,
        data: {
          supplier_name: parsed.supplier_name,
          supplier_email: parsed.supplier_email,
          invoice_number: parsed.invoice_number,
          invoice_date: parsed.invoice_date,
          due_date: parsed.due_date,
          subtotal: parsed.subtotal,
          tax_amount: parsed.tax_amount,
          tax_percent: parsed.tax_percent,
          total: parsed.total,
          currency: parsed.currency || 'EUR',
          line_items: (parsed.line_items || []).map((item: Record<string, unknown>) => ({
            description: item.description as string,
            quantity: item.quantity as number,
            unit: (item.unit as string) || 'stuk',
            unit_price: item.unit_price as number,
            line_total: item.line_total as number,
            ean: item.ean as string | undefined,
            sku: item.sku as string | undefined,
            is_physical_product: item.is_physical_product as boolean ?? true,
            confidence: {
              description: confidenceScores.line_items || 0.8,
              quantity: confidenceScores.line_items || 0.8,
              price: confidenceScores.line_items || 0.8,
            },
          })),
          payment_details: parsed.payment_details,
        },
        raw_response: parsed,
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        errors: [error instanceof Error ? error.message : 'Extraction failed'],
      };
    }
  }

  /**
   * Extract from a PDF document (first converts to images)
   * Note: In production, you'd use a PDF-to-image service
   */
  async extractFromPdf(
    pdfUrl: string,
    context?: AgentContext
  ): Promise<InvoiceExtractionResult> {
    // For now, try to process PDF directly if model supports it
    // Otherwise, this would need PDF-to-image conversion
    return this.extractFromImage(pdfUrl, context);
  }

  /**
   * Validate extracted data and determine if auto-approval is possible
   */
  validateExtraction(extraction: InvoiceExtractionResult): {
    isValid: boolean;
    canAutoApprove: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!extraction.success || !extraction.data) {
      return {
        isValid: false,
        canAutoApprove: false,
        issues: extraction.errors || ['Extraction failed'],
      };
    }

    const { data, confidence } = extraction;

    // Required fields
    if (!data.supplier_name) {
      issues.push('Missing supplier name');
    }
    if (!data.invoice_number) {
      issues.push('Missing invoice number');
    }
    if (!data.total || data.total <= 0) {
      issues.push('Invalid or missing total amount');
    }
    if (!data.line_items || data.line_items.length === 0) {
      issues.push('No line items extracted');
    }

    // Validate totals match
    if (data.line_items && data.line_items.length > 0) {
      const calculatedSubtotal = data.line_items.reduce(
        (sum, item) => sum + (item.line_total || item.quantity * item.unit_price),
        0
      );
      const expectedSubtotal = data.subtotal || data.total - (data.tax_amount || 0);

      if (Math.abs(calculatedSubtotal - expectedSubtotal) > 0.01) {
        issues.push(
          `Line item total (${calculatedSubtotal.toFixed(2)}) doesn't match subtotal (${expectedSubtotal.toFixed(2)})`
        );
      }
    }

    const isValid = issues.length === 0;
    const canAutoApprove = isValid && confidence >= MIN_CONFIDENCE;

    return {
      isValid,
      canAutoApprove,
      issues,
    };
  }

  /**
   * Calculate overall confidence from individual scores
   */
  private calculateConfidence(scores: Record<string, number>): number {
    const weights = {
      supplier_name: 0.15,
      invoice_number: 0.2,
      total: 0.25,
      line_items: 0.4,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [key, weight] of Object.entries(weights)) {
      if (scores[key] !== undefined) {
        weightedSum += scores[key] * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}

// Export singleton factory
let instance: InvoiceProcessorAgent | null = null;

export function getInvoiceProcessorAgent(apiKey?: string): InvoiceProcessorAgent {
  if (!instance) {
    instance = new InvoiceProcessorAgent(apiKey);
  }
  return instance;
}
