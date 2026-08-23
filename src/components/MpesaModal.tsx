import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Tenant } from '../types';
import { isValidMpesaPhone, formatMpesaPhone, formatCurrency } from '../lib/mpesa';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, PhoneCall, ShieldCheck, Smartphone, X, AlertCircle } from 'lucide-react';

interface MpesaModalProps {
  order: Order;
  tenant: Tenant;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MpesaModal: React.FC<MpesaModalProps> = ({
  order,
  tenant,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(order.customerPhone || '254712345678');
  const [step, setStep] = useState<'input' | 'push_sent' | 'pin_prompt' | 'processing' | 'success'>('input');
  const [mpesaPin, setMpesaPin] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInitiateStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isValidMpesaPhone(phoneNumber)) {
      setErrorMessage('Please enter a valid Kenyan Safaricom M-Pesa phone number (e.g. 0712345678 or 254712345678)');
      return;
    }

    const formattedPhone = formatMpesaPhone(phoneNumber);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          orderId: order.id,
          phoneNumber: formattedPhone,
          amount: order.totalAmount,
          paybillOrTill: tenant.mpesaConfig.paybillOrTill,
        }),
      });

      const data = await response.json();
      if (data.ResponseCode === '0') {
        setTransactionId(data.simulatedTransactionId || `QKJ${Math.floor(Math.random() * 899999 + 100000)}X`);
        setStep('pin_prompt');
      } else {
        setErrorMessage(data.ResponseDescription || 'M-Pesa Gateway timeout');
      }
    } catch (err) {
      console.error('STK Push API error:', err);
      // Fallback for simulation
      setTransactionId(`QKJ${Math.floor(Math.random() * 899999 + 100000)}X`);
      setStep('pin_prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPin = async () => {
    setIsSubmitting(true);
    setStep('processing');

    try {
      // Simulate Safaricom network roundtrip delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tenant.id, orderId: order.id, updates: {
        'paymentInfo.status': 'paid',
        'paymentInfo.mpesaTransactionId': transactionId,
        'paymentInfo.phoneNumber': formatMpesaPhone(phoneNumber),
        'paymentInfo.paidAt': new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } })
          });

      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error updating payment in Firestore:', err);
      setErrorMessage('Failed to record payment in database.');
      setStep('input');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-[#1C1C1F] rounded-xl shadow-2xl overflow-hidden border border-[#27272A] text-[#FAFAFA]"
      >
        {/* Header Banner */}
        <div className="bg-[#09090B] px-6 py-5 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">M-Pesa Express Payment</div>
              <h3 className="text-lg font-semibold text-[#FAFAFA]">{tenant.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-[#1C1C1F] hover:bg-[#27272A] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Amount Card */}
          <div className="bg-[#09090B] rounded-lg p-4 border border-[#27272A] mb-6 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#A1A1AA] font-medium">Total Order Amount</span>
              <div className="text-2xl font-semibold text-emerald-400">
                {formatCurrency(order.totalAmount, tenant.currency)}
              </div>
            </div>
            <div className="text-right text-xs text-[#A1A1AA] font-medium">
              <div>Order: <span className="font-mono font-bold text-[#FAFAFA]">{order.id}</span></div>
              <div>{tenant.mpesaConfig.accountType.toUpperCase()}: <span className="font-bold text-[#FAFAFA]">{tenant.mpesaConfig.paybillOrTill}</span></div>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Phone Number Input */}
          {step === 'input' && (
            <form onSubmit={handleInitiateStkPush} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 uppercase tracking-wider">
                  Safaricom M-Pesa Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 0712345678 or 254712345678"
                    className="w-full px-4 py-2.5 rounded-lg bg-[#09090B] border border-[#27272A] focus:ring-1 focus:ring-blue-500 font-mono text-[#FAFAFA] text-sm focus:outline-none"
                    required
                  />
                  <PhoneCall className="w-4 h-4 text-[#71717A] absolute right-3.5 top-3" />
                </div>
                <p className="mt-1 text-xs text-[#71717A]">
                  An M-Pesa STK Push prompt will be sent directly to this handset.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] text-xs"
                >
                  {isSubmitting ? (
                    <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Send M-Pesa STK Push Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Interactive Simulated Phone Screen Popup */}
          {step === 'pin_prompt' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-medium mb-2">
                  STK Push Prompt Received on Phone
                </div>
                <h4 className="text-xs text-[#A1A1AA]">Simulated Phone SIM Toolkit Prompt</h4>
              </div>

              {/* Phone Frame Mockup */}
              <div className="bg-[#09090B] text-[#FAFAFA] rounded-xl p-4 shadow-xl border border-[#27272A] font-sans max-w-sm mx-auto">
                <div className="bg-[#1C1C1F] rounded-lg p-4 border border-[#27272A] text-left space-y-3">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-mono">
                    <span>M-PESA PAYBILL</span>
                    <span>{tenant.mpesaConfig.paybillOrTill}</span>
                  </div>
                  <p className="text-xs font-medium text-[#FAFAFA] leading-snug">
                    Do you want to pay KES {order.totalAmount} to <span className="font-bold text-white">{tenant.name}</span> for Order #{order.id}?
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#A1A1AA] mb-1">
                      Enter 4-Digit M-Pesa PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={mpesaPin}
                      onChange={(e) => setMpesaPin(e.target.value)}
                      placeholder="••••"
                      className="w-full text-center px-4 py-2 bg-[#09090B] border border-[#27272A] rounded-md text-emerald-400 font-mono tracking-[0.5em] text-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setStep('input')}
                  className="w-1/3 py-2.5 border border-[#27272A] bg-[#09090B] hover:bg-[#27272A] text-[#FAFAFA] font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPin}
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize & Pay</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <div className="inline-block animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
              <h4 className="text-base font-semibold text-[#FAFAFA]">Validating M-Pesa Payment...</h4>
              <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto">
                Connecting to Safaricom Daraja API Gateway and confirming transaction callback.
              </p>
            </div>
          )}

          {/* STEP 4: Success Receipt */}
          {step === 'success' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#FAFAFA]">Payment Successful!</h4>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  M-Pesa transaction confirmed and linked to Order {order.id}.
                </p>
              </div>

              {/* Receipt Box */}
              <div className="bg-[#09090B] rounded-lg p-4 border border-[#27272A] text-left font-mono text-xs space-y-1.5 text-[#A1A1AA]">
                <div className="flex justify-between border-b border-[#27272A] pb-2 mb-2 font-bold text-[#FAFAFA]">
                  <span>SAFARICOM M-PESA RECEIPT</span>
                  <span className="text-emerald-400">{transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Merchant:</span>
                  <span className="font-semibold text-[#FAFAFA]">{tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(order.totalAmount, tenant.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid By:</span>
                  <span className="text-[#FAFAFA]">{formatMpesaPhone(phoneNumber)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-[#FAFAFA]">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer text-xs"
              >
                Close & View Order Map
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
