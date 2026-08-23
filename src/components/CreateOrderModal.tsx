import React, { useState } from 'react';
import { Tenant, OrderItem, Order } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, X, Package, Trash2, MapPin, Ban, AlertCircle } from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  onOrderCreated?: (order: Order) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onOrderCreated,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('254712345678');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [destLat, setDestLat] = useState(-1.285);
  const [destLng, setDestLng] = useState(36.815);
  const [items, setItems] = useState<OrderItem[]>([
    { id: 'item-1', name: 'Standard Delivery Goods', quantity: 1, unitPrice: 1500 },
  ]);

  if (!isOpen) return null;

  const isSuspended = tenant.status === 'suspended';

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: `item-${Date.now()}`, name: '', quantity: 1, unitPrice: 500 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuspended) {
      alert('Cannot place order: This business tenant has been taken down by the Super Admin.');
      return;
    }
    
    try {
      // Send secure request to backend instead of writing to Firestore directly
      // By using our custom endpoint, the server correctly computes totalAmount preventing price tampering,
      // and enforces strict rules. (In production, replace x-demo-role with real auth tokens).
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'tenant_admin', // Demo fallback, see server.ts
          'x-demo-tenant-id': tenant.id
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          deliveryAddress,
          items: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.unitPrice })),
          destinationLocation: {
            lat: Number(destLat),
            lng: Number(destLng),
            addressName: deliveryAddress,
          }
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create order');
      }

      const responseData = await response.json();

      // Temporarily construct the object purely to pass back to the UI state if needed
      // (The actual persistent write happened securely on the server).
      const simulatedOrder: Order = {
        id: responseData.orderId,
        tenantId: tenant.id,
        status: 'pending',
        customerId: `cust-${Date.now()}`,
        customerName,
        customerPhone,
        deliveryAddress,
        destinationLocation: {
          lat: Number(destLat),
          lng: Number(destLng),
          addressName: deliveryAddress,
          updatedAt: new Date().toISOString(),
        },
        currentGpsLocation: {
          lat: tenant.storeLocation.lat,
          lng: tenant.storeLocation.lng,
          speed: 0,
          heading: 0,
          addressName: tenant.storeLocation.addressName,
          updatedAt: new Date().toISOString(),
        },
        paymentInfo: {
          phoneNumber: customerPhone,
          amount: responseData.totalAmount || totalAmount,
          status: 'unpaid',
        },
        items,
        totalAmount: responseData.totalAmount || totalAmount,
        estimatedArrivalMinutes: 25,
        timestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (onOrderCreated) onOrderCreated(simulatedOrder);
      onClose();
    } catch (err: any) {
      console.error('Error creating order securely:', err);
      alert(`Failed to save order: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#1C1C1F] rounded-xl shadow-2xl overflow-hidden border border-[#27272A] text-[#FAFAFA]">
        <div className="bg-[#09090B] px-6 py-5 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-[#FAFAFA]">New Order Entry</h3>
              <p className="text-xs text-[#A1A1AA]">Tenant: {tenant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {isSuspended && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-rose-200 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-[11px]">
                <strong className="block text-rose-300">Tenant Business Account Taken Down</strong>
                <span>Order creation is disabled because {tenant.name} has been suspended by the Super Admin.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1">Customer Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Wanjiku Mwangi"
                className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1">M-Pesa Phone Number</label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="254712345678"
                className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#A1A1AA] mb-1">Delivery Address</label>
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="e.g. Westlands Commercial Centre, 2nd Floor"
              className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1">Destination Latitude</label>
              <input
                type="number"
                step="0.00001"
                required
                value={destLat}
                onChange={(e) => setDestLat(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1">Destination Longitude</label>
              <input
                type="number"
                step="0.00001"
                required
                value={destLng}
                onChange={(e) => setDestLng(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2 border-t border-[#27272A] pt-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#FAFAFA] text-xs uppercase tracking-wider">Order Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-blue-400 font-medium flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Item name"
                  required
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none"
                />
                <input
                  type="number"
                  min={1}
                  required
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  className="w-16 px-2 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] text-center font-semibold focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  required
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                  className="w-24 px-2 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] font-mono text-right focus:outline-none"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-[#09090B] p-3 rounded-lg border border-[#27272A] flex justify-between items-center text-xs font-semibold text-[#FAFAFA]">
            <span>Total Amount:</span>
            <span className="text-emerald-400 font-mono text-sm">KES {totalAmount.toLocaleString()}</span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSuspended}
              className={`w-full py-2.5 font-medium rounded-lg shadow-sm transition-all text-xs flex items-center justify-center gap-2 ${
                isSuspended
                  ? 'bg-[#27272A] text-[#A1A1AA] cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
            >
              {isSuspended ? (
                <>
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>Business Suspended • Cannot Place Order</span>
                </>
              ) : (
                <span>Create Order & Assign ID</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
