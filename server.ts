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

// Initialize Firebase Admin (relies on ADC / environment credentials in production)
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Middleware: Authenticate Request via Firebase Auth ID Token
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    // For the sake of preview demo without real Firebase Auth tokens, we will bypass strict token verification
    // if an x-demo-role header is provided. IN PRODUCTION, remove this bypass.
    if (process.env.NODE_ENV !== 'production' && req.headers['x-demo-role']) {
       (req as any).user = {
         uid: 'demo_user_123',
         tenantId: req.headers['x-demo-tenant-id'] || 'tenant-safari-eats',
         role: req.headers['x-demo-role']
       };
       return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    console.error('Auth verification failed:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'OmniTrack Multi-Tenant Engine', time: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// SECURE ORDER CREATION (Server-side validation & pricing calculation)
// -----------------------------------------------------------------------------
const OrderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  category: z.string().optional(),
});

const CreateOrderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(5),
  deliveryAddress: z.string().min(5),
  destinationLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    addressName: z.string()
  }).optional(),
  items: z.array(OrderItemSchema).min(1),
});

app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    if (!tenantId) {
       return res.status(403).json({ error: 'User is not assigned to a tenant.' });
    }

    if (!['platform_admin', 'tenant_admin', 'manager', 'staff'].includes(user.role)) {
       return res.status(403).json({ error: 'Insufficient role permissions to create orders.' });
    }

    const parseResult = CreateOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid order payload.' });
    }

    const data = parseResult.data;

    // Server-side calculation of total amount to prevent client spoofing
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const orderRef = db.collection('tenants').doc(tenantId).collection('orders').doc();
    const serverNow = FieldValue.serverTimestamp();

    const newOrder = {
      id: orderRef.id,
      tenantId,
      createdBy: user.uid,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryAddress: data.deliveryAddress,
      destinationLocation: data.destinationLocation || null,
      items: data.items,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: serverNow,
      updatedAt: serverNow,
    };

    await orderRef.set(newOrder);

    res.json({ success: true, orderId: orderRef.id, totalAmount });
  } catch (error) {
    console.error('[SEC_AUDIT] Failed to create order:', error);
    res.status(500).json({ error: 'Unable to complete request.' });
  }
});

// -----------------------------------------------------------------------------
// SECURE GPS TELEMETRY INGESTION (IDOR Protected)
// -----------------------------------------------------------------------------
app.post('/api/driver/update-gps', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;
    const { orderId, driverId, lat, lng, speed, heading } = req.body;
    
    if (user.role !== 'driver' && user.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Only drivers can submit telemetry.' });
    }

    // IDOR Protection: Driver can only update their own GPS
    if (user.role === 'driver' && user.uid !== driverId) {
      console.warn(`[SEC_AUDIT] IDOR attempt blocked. UID ${user.uid} tried to update GPS for ${driverId}`);
      return res.status(403).json({ error: 'Cannot submit telemetry for another driver.' });
    }

    const driverRef = db.collection('tenants').doc(tenantId).collection('drivers').doc(driverId);
    const now = FieldValue.serverTimestamp();

    // Batch update: Update current location + append to history
    const batch = db.batch();
    
    batch.set(driverRef, {
      currentLocation: { lat, lng, speed: speed || 0, heading: heading || 0, updatedAt: now },
      updatedAt: now
    }, { merge: true });

    const locationHistoryRef = driverRef.collection('locations').doc();
    batch.set(locationHistoryRef, {
      id: locationHistoryRef.id,
      tenantId,
      driverId,
      orderId: orderId || null,
      latitude: lat,
      longitude: lng,
      speed: speed || 0,
      heading: heading || 0,
      timestamp: now,
    });

    await batch.commit();

    return res.json({ status: 'success', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[SEC_AUDIT] GPS ingestion error:', error);
    return res.status(500).json({ error: 'Unable to complete request.' });
  }
});

// -----------------------------------------------------------------------------
// PREVIEW / DEMO AUTHENTICATION & SEEDING (Admin SDK)
// -----------------------------------------------------------------------------
app.post('/api/demo/set-claims', async (req, res) => {
  try {
    const { uid, role, tenantId } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    
    await getAuth().setCustomUserClaims(uid, {
      role: role || 'tenant_admin',
      tenantId: tenantId || 'tenant-safari-eats'
    });
    
    return res.json({ success: true, message: `Claims set for ${uid}` });
  } catch (error) {
    console.error('[DEMO_API] Error setting claims:', error);
    return res.status(500).json({ error: 'Failed to set claims' });
  }
});

// -----------------------------------------------------------------------------
// DEMO PROXY ENDPOINTS (Bypassing strict client rules for the preview)
// -----------------------------------------------------------------------------
app.get('/api/tenants', async (req, res) => {
  try {
    const snapshot = await db.collection('tenants').get();
    const list = snapshot.docs.map(doc => doc.data());
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

app.get('/api/tenants/:tenantId/orders', async (req, res) => {
  try {
    const snapshot = await db.collection('tenants').doc(req.params.tenantId).collection('orders').get();
    const list = snapshot.docs.map(doc => doc.data());
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/tenants/:tenantId/staff', async (req, res) => {
  try {
    const snapshot = await db.collection('tenants').doc(req.params.tenantId).collection('staff').get();
    const list = snapshot.docs.map(doc => doc.data());
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

import { INITIAL_TENANTS, INITIAL_ORDERS, INITIAL_DRIVERS } from './src/lib/seedData.js';
app.get('/api/tenants/:tenantId/sms_logs', async (req, res) => {
  try {
    const snapshot = await db.collection('tenants').doc(req.params.tenantId).collection('sms_logs').orderBy('timestamp', 'desc').limit(50).get();
    const list = snapshot.docs.map(doc => doc.data());
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sms logs' });
  }
});

app.post('/api/demo/update-order', async (req, res) => {
  try {
    const { tenantId, orderId, updates } = req.body;
    if (!tenantId || !orderId || !updates) return res.status(400).json({ error: 'Missing params' });
    
    await db.collection('tenants').doc(tenantId).collection('orders').doc(orderId).update(updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Update Order Error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.post('/api/demo/seed', async (req, res) => {
  try {
    const snapshot = await db.collection('tenants').limit(1).get();
    if (!snapshot.empty) {
      return res.json({ success: true, message: 'Already seeded' });
    }

    console.log('[DEMO_API] Seeding database via Admin SDK...');
    const batch = db.batch();

    for (const tenant of INITIAL_TENANTS) {
      const tenantRef = db.collection('tenants').doc(tenant.id);
      batch.set(tenantRef, tenant);

      const tenantOrders = INITIAL_ORDERS[tenant.id] || [];
      for (const order of tenantOrders) {
        const orderRef = tenantRef.collection('orders').doc(order.id);
        batch.set(orderRef, order);
      }

      if (tenant.id === 'tenant-safari-eats') {
        for (const driver of INITIAL_DRIVERS) {
          const driverRef = tenantRef.collection('staff').doc(driver.id);
          batch.set(driverRef, driver);
        }
      }
    }

    await batch.commit();
    console.log('[DEMO_API] Seeding complete.');
    return res.json({ success: true });
  } catch (error) {
    console.error('[DEMO_API] Error seeding:', error);
    return res.status(500).json({ error: 'Failed to seed' });
  }
});

// Google Maps Grounding API endpoint
app.post('/api/maps/grounding', async (req, res) => {
  try {
    const { prompt, lat, lng } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const latitude = typeof lat === 'number' ? lat : -1.286389;
    const longitude = typeof lng === 'number' ? lng : 36.817223;

    console.log(`[GEMINI MAPS GROUNDING] Query: "${prompt}" @ Lat: ${latitude}, Lng: ${longitude}`);

    // Call gemini-3.5-flash with googleMaps tool as requested
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude,
              longitude,
            },
          },
        },
      },
    });

    const text = response.text || 'No place details found for this location.';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return res.json({
      text,
      groundingChunks,
    });
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      String(error?.message).includes('429') ||
      String(error?.message).includes('RESOURCE_EXHAUSTED') ||
      String(error?.message).includes('quota');

    if (isRateLimit) {
      console.warn('[GEMINI MAPS API] Quota limit reached; serving local radar fallback dataset.');
      const lat = typeof req.body?.lat === 'number' ? req.body.lat : -1.286389;
      const lng = typeof req.body?.lng === 'number' ? req.body.lng : 36.817223;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

      return res.json({
        text: `📍 [Google Maps Local Radar]\n\nHere is location radar context near coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}):\n\n• Central Transit Hub & Main Street Crossing\n• Fuel & Emergency Services (Shell, TotalEnergies)\n• 24/7 Supermarket & Express Mart\n• Customer Delivery Zone\n\nClick the Google Maps link below to open live navigation directly.`,
        groundingChunks: [
          {
            maps: {
              uri: mapsUrl,
              title: `Google Maps Navigation Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              placeAnswerSources: {
                reviewSnippets: [{ snippet: 'Open live location & surrounding places directly on Google Maps.' }],
              },
            },
          },
        ],
        isFallback: true,
      });
    }

    console.error('Gemini Maps Grounding Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to query Google Maps grounding',
    });
  }
});

// M-Pesa STK Push Simulation & Callback handling per tenant
app.post('/api/mpesa/stkpush', (req, res) => {
  const { tenantId, orderId, phoneNumber, amount, paybillOrTill } = req.body;

  if (!tenantId || !orderId || !phoneNumber || !amount) {
    return res.status(400).json({
      ResponseCode: '1',
      ResponseDescription: 'Missing required STK push parameters',
    });
  }

  // Generate M-Pesa Checkout Request ID and simulated Transaction ID
  const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const mpesaTransactionId = generateMpesaTransactionId();

  console.log(`[M-PESA DARAJA API] Triggered STK Push for Tenant ${tenantId}, Order ${orderId}`);
  console.log(`[M-PESA DARAJA API] Paybill/Till: ${paybillOrTill || '890123'} | Phone: ${phoneNumber} | Amount: KES ${amount}`);

  return res.json({
    MerchantRequestID: `MR_${Date.now()}`,
    CheckoutRequestID: checkoutRequestId,
    ResponseCode: '0',
    ResponseDescription: 'Success. Request accepted for processing',
    CustomerMessage: `STK Push prompt sent to ${phoneNumber}. Enter M-Pesa PIN to complete payment of KES ${amount}.`,
    simulatedTransactionId: mpesaTransactionId,
  });
});

// M-Pesa Webhook Callback Endpoint
app.post('/api/mpesa/callback', (req, res) => {
  console.log('[M-PESA CALLBACK WEBHOOK] Received payload:', JSON.stringify(req.body));
  return res.json({
    ResultCode: 0,
    ResultDesc: 'The service request is processed successfully.',
  });
});

// Vite Middleware for Dev / Static Files for Prod
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OmniTrack Multi-Tenant Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();

