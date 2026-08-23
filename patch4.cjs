const fs = require('fs');

function patchFile(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  content = content.replace(/const orderRef = doc\(db, 'tenants', (.*?), 'orders', (.*?)\);\s*await updateDoc\(orderRef, (\{[\s\S]*?})\);/g, (match, tenantId, orderId, updates) => {
    return `await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: ${tenantId}, orderId: ${orderId}, updates: ${updates} })
          });`;
  });
  fs.writeFileSync(filename, content);
}

patchFile('src/components/DriverMobileView.tsx');
patchFile('src/components/TenantAdminDashboard.tsx');
patchFile('src/components/MpesaModal.tsx');
