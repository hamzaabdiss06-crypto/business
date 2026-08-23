const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/body: JSON\.stringify\(\{ tenantId: activeTenant\.id, orderId: demoOrder\.id, updates: (\{[\s\S]*?\})\n          \}\)\.catch/g,
"body: JSON.stringify({ tenantId: activeTenant.id, orderId: demoOrder.id, updates: $1 })\n          }).catch");
fs.writeFileSync('src/App.tsx', content);
