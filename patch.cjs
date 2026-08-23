const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const newCode = `  // Initialize and poll tenants
  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function init() {
      try {
        await fetch('/api/demo/seed', { method: 'POST' });
        
        const fetchTenants = async () => {
          const res = await fetch('/api/tenants');
          const list = await res.json();
          setTenants(list);
          if (list.length > 0) {
            setActiveTenant(prev => prev || list[0]);
          }
          setIsLoading(false);
        };

        await fetchTenants();
        interval = setInterval(fetchTenants, 5000); // Poll every 5s for demo
      } catch (e) {
        console.error("Init error", e);
        setIsLoading(false);
      }
    }

    init();
    return () => clearInterval(interval);
  }, []);

  // Listen to orders & drivers under activeTenant via polling
  useEffect(() => {
    if (!activeTenant) return;
    
    let interval: NodeJS.Timeout;

    const fetchTenantData = async () => {
      try {
        const [ordersRes, staffRes] = await Promise.all([
          fetch(\`/api/tenants/\${activeTenant.id}/orders\`),
          fetch(\`/api/tenants/\${activeTenant.id}/staff\`)
        ]);

        const orderList = await ordersRes.json();
        const driverList = await staffRes.json();

        orderList.forEach((order) => {
          const prevStatus = prevOrdersStatusRef.current[order.id];
          if (
            order.status === 'delivered' &&
            !order.smsNotificationSent &&
            prevStatus &&
            prevStatus !== 'delivered'
          ) {
            console.log(\`⚡ [Cloud Function Trigger] Order #\${order.id} status changed to 'delivered'. Dispatching SMS...\`);
            triggerOrderDeliveredCloudFunction(order, activeTenant);
          }
          prevOrdersStatusRef.current[order.id] = order.status;
        });

        orderList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setOrders(orderList);
        setDrivers(driverList);
      } catch (err) {
        console.error("Failed to fetch tenant data:", err);
      }
    };

    fetchTenantData();
    interval = setInterval(fetchTenantData, 5000);

    return () => clearInterval(interval);
  }, [activeTenant]);`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('// Initialize and listen to tenants'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('}, [activeTenant]);'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1, newCode);
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log('Patched');
} else {
  console.log('Not found', startIdx, endIdx);
}
