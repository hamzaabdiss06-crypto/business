import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Order, SmsLog, Tenant } from '../types';

export type SmsNotificationListener = (log: SmsLog, order: Order) => void;

const listeners: Set<SmsNotificationListener> = new Set();

export function subscribeToSmsNotifications(listener: SmsNotificationListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySmsListeners(log: SmsLog, order: Order) {
  listeners.forEach((listener) => {
    try {
      listener(log, order);
    } catch (err) {
      console.error('Error in SMS notification listener:', err);
    }
  });
}

/**
 * Simulates a Firebase Cloud Function trigger:
 * exports.onOrderDelivered = functions.firestore
 *   .document('tenants/{tenantId}/orders/{orderId}')
 *   .onUpdate(async (change, context) => { ... })
 */
export async function triggerOrderDeliveredCloudFunction(
  order: Order,
  tenant: Tenant
): Promise<SmsLog | null> {
  const logId = `sms-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const executionId = `fn-exec-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();

  const driverName = order.driverName || 'our driver';
  const smsBody = `[${tenant.name}] Hi ${order.customerName}, your order #${order.id} has been DELIVERED by ${driverName}! Thank you for shopping with us. Support: ${tenant.phone}`;

  const smsLog: SmsLog = {
    id: logId,
    tenantId: tenant.id,
    orderId: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    message: smsBody,
    functionName: 'onOrderDeliveredTrigger',
    triggerType: 'firestore.document.onUpdate',
    functionExecutionId: executionId,
    status: 'SENT_SUCCESS',
    smsGateway: "Safaricom SMS Gateway (Africa's Talking)",
    timestamp,
  };

  try {
    // 1. Write SMS Log to Firestore: tenants -> tenantId -> sms_logs -> logId
    const smsLogRef = doc(db, 'tenants', tenant.id, 'sms_logs', logId);
    await setDoc(smsLogRef, smsLog);

    // 2. Mark order as having SMS notification sent
    const orderRef = doc(db, 'tenants', tenant.id, 'orders', order.id);
    await updateDoc(orderRef, {
      smsNotificationSent: true,
      smsNotificationTimestamp: timestamp,
      updatedAt: timestamp,
    });

    // 3. Notify real-time UI listeners for toast / banner
    notifySmsListeners(smsLog, order);

    console.log(`⚡ [Firebase Cloud Function] Executed ${smsLog.functionName} for order #${order.id}. SMS sent to ${order.customerPhone}`);
    return smsLog;
  } catch (error) {
    console.error('Error executing simulated Cloud Function SMS trigger:', error);
    return null;
  }
}
