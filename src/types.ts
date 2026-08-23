export type OrderStatus = 'pending' | 'in_progress' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';
export type UserRole = 'super_admin' | 'tenant_admin' | 'staff_driver' | 'customer';

export interface GPSLocation {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  updatedAt: string;
  addressName?: string;
}

export interface MpesaPaymentInfo {
  mpesaTransactionId?: string;
  phoneNumber: string;
  amount: number;
  status: PaymentStatus;
  checkoutRequestId?: string;
  paidAt?: string;
  merchantRequestId?: string;
  receiptNumber?: string;
}

export interface MpesaTenantConfig {
  paybillOrTill: string;
  accountType: 'paybill' | 'till';
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  environment: 'sandbox' | 'production';
  enabled: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  category: string;
  email: string;
  phone: string;
  currency: string;
  storeLocation: GPSLocation;
  mpesaConfig: MpesaTenantConfig;
  status?: 'active' | 'suspended';
  createdAt: string;
  orderCount?: number;
  totalRevenue?: number;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  tenantId: string;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  destinationLocation: GPSLocation;
  currentGpsLocation: GPSLocation;
  paymentInfo: MpesaPaymentInfo;
  items: OrderItem[];
  totalAmount: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  estimatedArrivalMinutes?: number;
  smsNotificationSent?: boolean;
  smsNotificationTimestamp?: string;
  timestamp: string;
  updatedAt: string;
}

export interface SmsLog {
  id: string;
  tenantId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  message: string;
  functionName: string;
  triggerType: string;
  functionExecutionId: string;
  status: 'SENT_SUCCESS' | 'FAILED';
  smsGateway: string;
  timestamp: string;
}

export interface StaffDriver {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: 'driver' | 'staff';
  isOnline: boolean;
  currentGps?: GPSLocation;
  activeOrderId?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId?: string;
  photoUrl?: string;
}
