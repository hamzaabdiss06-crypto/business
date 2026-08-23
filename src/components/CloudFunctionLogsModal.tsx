import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, SmsLog, Tenant } from '../types';
import { triggerOrderDeliveredCloudFunction } from '../lib/cloudFunctionSms';
import {
  Zap,
  X,
  Terminal,
  MessageSquare,
  Send,
  CheckCircle2,
  Code2,
  RefreshCw,
  PhoneCall,
  Clock,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

interface CloudFunctionLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  orders: Order[];
}

export const CloudFunctionLogsModal: React.FC<CloudFunctionLogsModalProps> = ({
  isOpen,
  onClose,
  tenant,
  orders,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'code'>('logs');
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedOrderIdToTest, setSelectedOrderIdToTest] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Delivered orders available for testing
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const availableTestOrders = orders.length > 0 ? orders : [];

  useEffect(() => {
    if (!isOpen || !tenant) return;
    
    let interval;
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/tenants/${tenant.id}/sms_logs`);
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLogs();
    interval = setInterval(fetchLogs, 3000);

    return () => clearInterval(interval);
  }, [isOpen, tenant]);

  const handleTestTrigger = async () => {
    const targetOrder = orders.find((o) => o.id === selectedOrderIdToTest) || orders[0];
    if (!targetOrder) return;

    setIsTriggering(true);
    try {
      await triggerOrderDeliveredCloudFunction(targetOrder, tenant);
    } catch (err) {
      console.error('Trigger error:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  const cloudFunctionCode = `// Firebase Cloud Functions (Node.js / TypeScript)
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Triggered automatically when an Order status changes to 'delivered'
 * Firestore Path: /tenants/{tenantId}/orders/{orderId}
 */
export const onOrderDeliveredSMS = functions.firestore
  .document("tenants/{tenantId}/orders/{orderId}")
  .onUpdate(async (change, context) => {
    const prevData = change.before.data();
    const newData = change.after.data();
    const { tenantId, orderId } = context.params;

    // Detect status transition to 'delivered'
    if (prevData.status !== "delivered" && newData.status === "delivered") {
      console.log(\`⚡ Order \${orderId} delivered! Dispatching SMS to \${newData.customerPhone}\`);

      const smsText = \`[OmniTrack] Hi \${newData.customerName}, your order #\${orderId} has been DELIVERED by \${newData.driverName || 'our driver'}. Thank you!\`;

      // Invoke SMS Gateway (Safaricom / Africa's Talking / Twilio)
      const smsResult = await sendSmsGateway({
        recipient: newData.customerPhone,
        message: smsText,
      });

      // Record SMS Audit Log in Firestore
      const logRef = admin.firestore()
        .collection("tenants")
        .doc(tenantId)
        .collection("sms_logs")
        .doc();

      await logRef.set({
        id: logRef.id,
        tenantId,
        orderId,
        customerName: newData.customerName,
        customerPhone: newData.customerPhone,
        message: smsText,
        functionName: "onOrderDeliveredSMS",
        triggerType: "firestore.document.onUpdate",
        functionExecutionId: context.eventId,
        status: "SENT_SUCCESS",
        smsGateway: "Safaricom SMS Gateway (Africa's Talking)",
        timestamp: new Date().toISOString(),
      });

      // Update Order document with SMS timestamp
      return change.after.ref.update({
        smsNotificationSent: true,
        smsNotificationTimestamp: new Date().toISOString(),
      });
    }

    return null;
  });`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cloudFunctionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#1C1C1F] rounded-xl shadow-2xl overflow-hidden border border-[#27272A] text-[#FAFAFA] flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#09090B] px-6 py-4 border-b border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Firebase Cloud Functions & SMS Service</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  REAL-TIME TRIGGER
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Auto-dispatches customer SMS when order status transitions to <code className="text-emerald-400 font-mono">delivered</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection & Manual Tester */}
        <div className="bg-[#09090B] px-6 py-3 border-b border-[#27272A] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-[#1C1C1F] p-1 rounded-lg border border-[#27272A]">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Live SMS Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" /> Cloud Function Source
            </button>
          </div>

          {/* Manual Test Trigger Control */}
          <div className="flex items-center gap-2">
            <select
              value={selectedOrderIdToTest}
              onChange={(e) => setSelectedOrderIdToTest(e.target.value)}
              className="px-2.5 py-1.5 bg-[#1C1C1F] border border-[#27272A] rounded-lg text-xs font-mono text-[#FAFAFA] focus:outline-none"
            >
              <option value="">-- Select Order to Test SMS --</option>
              {availableTestOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  Order #{o.id} - {o.customerName} ({o.status})
                </option>
              ))}
            </select>

            <button
              onClick={handleTestTrigger}
              disabled={isTriggering || availableTestOrders.length === 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isTriggering ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Test Function
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                <span>Firestore Path: <code className="font-mono text-emerald-400">tenants/{tenant.id}/sms_logs</code></span>
                <span>Trigger Event: <code className="font-mono text-blue-400">onUpdate('status' === 'delivered')</code></span>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-[#A1A1AA]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                  Fetching Cloud Function SMS execution logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="bg-[#09090B] rounded-xl p-8 border border-[#27272A] text-center space-y-3">
                  <MessageSquare className="w-10 h-10 text-[#27272A] mx-auto" />
                  <h4 className="text-sm font-semibold text-white">No SMS Notifications Sent Yet</h4>
                  <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                    When an order's status changes to <strong className="text-emerald-400 font-mono">delivered</strong> (either by the driver or admin), the Firebase Cloud Function will automatically trigger and dispatch a mock SMS to the customer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#09090B] rounded-xl p-4 border border-[#27272A] hover:border-[#3F3F46] transition-colors space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1C1C1F] pb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {log.status}
                          </span>
                          <span className="font-mono text-white font-semibold">
                            Order #{log.orderId}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#A1A1AA] font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#71717A]" />
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-blue-400">{log.functionExecutionId}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[#A1A1AA]">
                          <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                          <span>Customer: <strong className="text-white">{log.customerName}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#A1A1AA] font-mono">
                          <span>Phone: <strong className="text-emerald-400">{log.customerPhone}</strong></span>
                        </div>
                      </div>

                      <div className="bg-[#1C1C1F] p-3 rounded-lg border border-[#27272A] font-mono text-xs text-emerald-300 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-[#71717A] mb-0.5 uppercase tracking-wider font-semibold">
                            SMS Payload Dispatched:
                          </div>
                          <p>{log.message}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1">
                        <span>Gateway: <strong className="text-[#A1A1AA]">{log.smsGateway}</strong></span>
                        <span>Fn: <code className="text-blue-400 font-mono">{log.functionName}</code></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA]">
                  Backend Cloud Function Definition (<code className="text-emerald-400 font-mono">functions/src/index.ts</code>)
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 bg-[#1C1C1F] hover:bg-[#27272A] text-[#FAFAFA] rounded border border-[#27272A] text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copied' : 'Copy Function Code'}
                </button>
              </div>

              <pre className="bg-[#09090B] p-4 rounded-xl border border-[#27272A] text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed">
                <code>{cloudFunctionCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
