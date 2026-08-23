const fs = require('fs');
let content = fs.readFileSync('src/components/CloudFunctionLogsModal.tsx', 'utf8');

const newCode = `  useEffect(() => {
    if (!isOpen || !tenant) return;
    
    let interval;
    const fetchLogs = async () => {
      try {
        const res = await fetch(\`/api/tenants/\${tenant.id}/sms_logs\`);
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLogs();
    interval = setInterval(fetchLogs, 3000);

    return () => clearInterval(interval);
  }, [isOpen, tenant]);`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('useEffect(() => {'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('}, [isOpen, tenant]);'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1, newCode);
  fs.writeFileSync('src/components/CloudFunctionLogsModal.tsx', lines.join('\n'));
  console.log('Patched modal');
} else {
  console.log('Not found', startIdx, endIdx);
}
