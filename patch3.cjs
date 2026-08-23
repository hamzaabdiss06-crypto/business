const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/const orderRef = doc\(db, 'tenants', activeTenant.id, 'orders', demoOrder.id\);\s*delete activeRoadPathsRef\.current\[demoOrder.id\];\s*delete activeRoadProgressRef\.current\[demoOrder.id\];\s*updateDoc\(orderRef, (\{[\s\S]*?})\);/g, (match, updates) => {
  return `delete activeRoadPathsRef.current[demoOrder.id];
          delete activeRoadProgressRef.current[demoOrder.id];
          fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: activeTenant.id, orderId: demoOrder.id, updates: ${updates} })
          });`;
});

content = content.replace(/const orderRef = doc\(db, 'tenants', activeTenant.id, 'orders', order.id\);\s*await updateDoc\(orderRef, (\{[\s\S]*?})\);/g, (match, updates) => {
  return `await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: activeTenant.id, orderId: order.id, updates: ${updates} })
          });`;
});

fs.writeFileSync('src/App.tsx', content);
console.log('Patched App.tsx updateDoc');
