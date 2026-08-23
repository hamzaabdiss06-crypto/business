import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { generateMpesaTransactionId } from './src/lib/mpesa.js';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
import { validateDemoMode, requireTenantAccess, requireStaffRole } from './src/lib/productionSecurity.js';

if (!getApps().length) initializeApp();
const db = getFirestore();
const app = express();
const PORT = 3000;

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(v => v.trim()).filter(Boolean) : [];
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(validateDemoMode);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  if (!token) {
    if (process.env.NODE_ENV !== 'production' && req.headers['x-demo-role']) {
      (req as any).user = { uid: 'demo_user_123', tenantId: req.headers['x-demo-tenant-id'] || 'tenant-safari-eats', role: req.headers['x-demo-role'] };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    (req as any).user = await getAuth().verifyIdToken(token);
    return next();
  } catch (error) {
    console.error('Auth verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'OmniTrack Multi-Tenant Engine', time: new Date().toISOString() }));

const OrderItemSchema = z.object({ id: z.string().min(1), name: z.string().min(1), quantity: z.number().int().positive(), price: z.number().positive(), category: z.string().optional() });
const CreateOrderSchema = z.object({ customerName: z.string().min(2), customerPhone: z.string().min(5), deliveryAddress: z.string().min(5), destinationLocation: z.object({ lat: z.number(), lng: z.number(), addressName: z.string() }).optional(), items: z.array(OrderItemSchema).min(1) });

app.post('/api/orders', requireAuth, requireStaffRole, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user.tenantId) return res.status(403).json({ error: 'User is not assigned to a tenant.' });
    const parsed = CreateOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid order payload.' });
    const data = parsed.data;
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const orderRef = db.collection('tenants').doc(user.tenantId).collection('orders').doc();
    const now = FieldValue.serverTimestamp();
    await orderRef.set({ id: orderRef.id, tenantId: user.tenantId, createdBy: user.uid, ...data, totalAmount, status: 'pending', paymentStatus: 'pending', createdAt: now, updatedAt: now });
    return res.json({ success: true, orderId: orderRef.id, totalAmount });
  } catch (error) {
    console.error('[SEC_AUDIT] Failed to create order:', error);
    return res.status(500).json({ error: 'Unable to complete request.' });
  }
});

app.post('/api/driver/update-gps', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { orderId, driverId, lat, lng, speed, heading } = req.body;
    if (!user.tenantId) return res.status(403).json({ error: 'Tenant is required.' });
    if (user.role !== 'driver' && user.role !== 'platform_admin') return res.status(403).json({ error: 'Only drivers can submit telemetry.' });
    if (user.role === 'driver' && user.uid !== driverId) return res.status(403).json({ error: 'Cannot submit telemetry for another driver.' });
    if (typeof lat !== 'number' || typeof lng !== 'number' || lat < -90 || lat > 90 || lng < -180 || lng > 180) return res.status(400).json({ error: 'Invalid coordinates.' });
    const driverRef = db.collection('tenants').doc(user.tenantId).collection('drivers').doc(driverId);
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(driverRef, { currentLocation: { lat, lng, speed: typeof speed === 'number' ? speed : 0, heading: typeof heading === 'number' ? heading : 0, updatedAt: now }, updatedAt: now }, { merge: true });
    const locationHistoryRef = driverRef.collection('locations').doc();
    batch.set(locationHistoryRef, { id: locationHistoryRef.id, tenantId: user.tenantId, driverId, orderId: orderId || null, latitude: lat, longitude: lng, speed: typeof speed === 'number' ? speed : 0, heading: typeof heading === 'number' ? heading : 0, timestamp: now });
    await batch.commit();
    return res.json({ status: 'success', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[SEC_AUDIT] GPS ingestion error:', error);
    return res.status(500).json({ error: 'Unable to complete request.' });
  }
});

app.get('/api/tenants', requireAuth, async (req, res) => {
  try {
    if ((req as any).user.role !== 'platform_admin') return res.status(403).json({ error: 'Platform admin access required' });
    const snapshot = await db.collection('tenants').get();
    return res.json(snapshot.docs.map(doc => doc.data()));
  } catch { return res.status(500).json({ error: 'Failed to fetch tenants' }); }
});

app.get('/api/tenants/:tenantId/orders', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const snapshot = await db.collection('tenants').doc(req.params.tenantId).collection('orders').get();
    return res.json(snapshot.docs.map(doc => doc.data()));
  } catch { return res.status(500).json({ error: 'Failed to fetch orders' }); }
});

app.get('/api/tenants/:tenantId/staff', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const snapshot = await db.collection('tenants').doc(req.params.tenantId).collection('staff').get();
    return res.json(snapshot.docs.map(doc => doc.data()));
  } catch { return res.status(500).json({ error: 'Failed to fetch staff' }); }
});

app.get('/api/tenants/:tenantId/sms_logs', requireAuth, requireTenantAccess, async (req, res) => {
  try {
    const snapshot = await db.collection('tenants').doc(req.params.tenantId).collection('sms_logs').orderBy('timestamp', 'desc').limit(50).get();
    return res.json(snapshot.docs.map(doc => doc.data()));
  } catch { return res.status(500).json({ error: 'Failed to fetch sms logs' }); }
});

app.post('/api/maps/grounding', requireAuth, requireStaffRole, async (req, res) => {
  try {
    const { prompt, lat, lng } = req.body;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 1000) return res.status(400).json({ error: 'Valid prompt is required' });
    const response = await ai.models.generateContent({ model: 'gemini-3.5-flash', contents: prompt, config: { tools: [{ googleMaps: {} }], toolConfig: { retrievalConfig: { latLng: { latitude: typeof lat === 'number' ? lat : -1.286389, longitude: typeof lng === 'number' ? lng : 36.817223 } } } } });
    return res.json({ text: response.text || 'No place details found for this location.', groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] });
  } catch (error) {
    console.error('Gemini Maps Grounding Error:', error);
    return res.status(500).json({ error: 'Failed to query Google Maps grounding' });
  }
});

app.post('/api/mpesa/stkpush', requireAuth, requireStaffRole, async (req, res) => {
  const { tenantId, orderId, phoneNumber, amount, paybillOrTill } = req.body;
  const user = (req as any).user;
  if (!tenantId || !orderId || !phoneNumber || amount === undefined) return res.status(400).json({ ResponseCode: '1', ResponseDescription: 'Missing required STK push parameters' });
  if (user.role !== 'platform_admin' && user.tenantId !== tenantId) return res.status(403).json({ error: 'Tenant access denied' });
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (process.env.NODE_ENV === 'production' && !process.env.MPESA_CONSUMER_KEY) return res.status(503).json({ error: 'Payment provider is not configured' });
  return res.json({ ResponseCode: '0', ResponseDescription: 'Accepted for processing', CheckoutRequestID: `demo_${Date.now()}`, transactionId: generateMpesaTransactionId(), simulated: process.env.NODE_ENV !== 'production', paybillOrTill: paybillOrTill || null });
});

// Demo-only routes are blocked in production by validateDemoMode above.
app.post('/api/demo/set-claims', async (req, res) => {
  try {
    const { uid, role, tenantId } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    await getAuth().setCustomUserClaims(uid, { role: role || 'tenant_admin', tenantId: tenantId || 'tenant-safari-eats' });
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'Failed to set claims' }); }
});

app.post('/api/demo/update-order', async (req, res) => {
  try {
    const { tenantId, orderId, updates } = req.body;
    if (!tenantId || !orderId || !updates) return res.status(400).json({ error: 'Missing params' });
    await db.collection('tenants').doc(tenantId).collection('orders').doc(orderId).update(updates);
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'Failed to update order' }); }
});

import { INITIAL_TENANTS, INITIAL_ORDERS, INITIAL_DRIVERS } from './src/lib/seedData.js';
app.post('/api/demo/seed', async (_req, res) => {
  try {
    const snapshot = await db.collection('tenants').limit(1).get();
    if (!snapshot.empty) return res.json({ success: true, message: 'Already seeded' });
    const batch = db.batch();
    for (const tenant of INITIAL_TENANTS) {
      const tenantRef = db.collection('tenants').doc(tenant.id);
      batch.set(tenantRef, tenant);
      for (const order of INITIAL_ORDERS[tenant.id] || []) batch.set(tenantRef.collection('orders').doc(order.id), order);
      if (tenant.id === 'tenant-safari-eats') for (const driver of INITIAL_DRIVERS) batch.set(tenantRef.collection('staff').doc(driver.id), driver);
    }
    await batch.commit();
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'Failed to seed' }); }
});

const isDev = process.env.NODE_ENV !== 'production';
if (isDev) app.use((await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })).middlewares);
else {
  app.use(express.static(path.resolve(process.cwd(), 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.resolve(process.cwd(), 'dist/index.html')));
}
app.listen(PORT, () => console.log(`OmniTrack server running on port ${PORT}`));
