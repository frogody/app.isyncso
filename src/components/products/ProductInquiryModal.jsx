import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle, Send, User, Mail, Phone, Building2, Package,
  CheckCircle, Loader2, X, FileText
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

const INQUIRY_TYPES = [
  { value: 'quote', label: 'Request Quote', description: 'Get pricing information' },
  { value: 'demo', label: 'Request Demo', description: 'Schedule a product demo' },
  { value: 'bulk', label: 'Bulk Order', description: 'Inquire about bulk pricing' },
  { value: 'custom', label: 'Customization', description: 'Request product customization' },
  { value: 'other', label: 'Other', description: 'General inquiry' },
];

export default function ProductInquiryModal({
  open,
  onClose,
  product,
  productDetails,
  defaultType = 'quote'
}) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    type: defaultType,
    name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    company: '',
    quantity: '',
    message: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Here you would typically send this to an API endpoint
      // For now, we'll simulate the submission
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Log the inquiry (in production, save to database)
      console.log('Product Inquiry:', {
        product_id: product?.id,
        product_name: product?.name,
        product_sku: productDetails?.sku,
        ...formData,
        submitted_at: new Date().toISOString(),
      });

      setSubmitted(true);
      toast.success('Inquiry submitted successfully!');
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSubmitted(false);
      setFormData({
        type: defaultType,
        name: user?.full_name || '',
        email: user?.email || '',
        phone: '',
        company: '',
        quantity: '',
        message: '',
      });
      onClose();
    }
  };

  const pricing = productDetails?.pricing || {};
  const hasPrice = pricing.base_price && parseFloat(pricing.base_price) > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Inquiry Submitted!</h3>
              <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
                Thank you for your interest. We'll get back to you within 24-48 hours.
              </p>
              <Button onClick={handleClose} className="bg-green-500 hover:bg-green-600 text-white">
                Close
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader className="pb-4 border-b border-white/5">
                <DialogTitle className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-orange-400" />
                  </div>
                  Product Inquiry
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Submit an inquiry about this product
                </DialogDescription>
              </DialogHeader>

              {/* Product Summary */}
              <div className="py-4 border-b border-white/5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                    {product?.featured_image?.url ? (
                      <img
                        src={product.featured_image.url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{product?.name}</h4>
                    {productDetails?.sku && (
                      <p className="text-sm text-zinc-500">SKU: {productDetails.sku}</p>
                    )}
                    {hasPrice && (
                      <p className="text-sm text-orange-400 font-medium mt-1">
                        Starting at ${parseFloat(pricing.base_price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                {/* Inquiry Type */}
                <div>
                  <Label className="text-zinc-300 mb-2 block">Inquiry Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INQUIRY_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.type === type.value
                            ? 'border-orange-500 bg-orange-500/10 text-white'
                            : 'border-white/10 hover:border-white/20 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="text-sm font-medium block">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-zinc-300 mb-2 block">
                      <User className="w-4 h-4 inline mr-2" />
                      Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                      className="bg-zinc-800/50 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-zinc-300 mb-2 block">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@company.com"
                      required
                      className="bg-zinc-800/50 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-zinc-300 mb-2 block">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="bg-zinc-800/50 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company" className="text-zinc-300 mb-2 block">
                      <Building2 className="w-4 h-4 inline mr-2" />
                      Company
                    </Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Company name"
                      className="bg-zinc-800/50 border-white/10 text-white"
                    />
                  </div>
                </div>

                {/* Quantity (for quote/bulk) */}
                {(formData.type === 'quote' || formData.type === 'bulk') && (
                  <div>
                    <Label htmlFor="quantity" className="text-zinc-300 mb-2 block">
                      <Package className="w-4 h-4 inline mr-2" />
                      Quantity Needed
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="e.g. 100"
                      className="bg-zinc-800/50 border-white/10 text-white"
                    />
                  </div>
                )}

                {/* Message */}
                <div>
                  <Label htmlFor="message" className="text-zinc-300 mb-2 block">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us more about your requirements..."
                    rows={4}
                    className="bg-zinc-800/50 border-white/10 text-white resize-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={submitting}
                    className="flex-1 border-white/10 text-zinc-300 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Inquiry
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
