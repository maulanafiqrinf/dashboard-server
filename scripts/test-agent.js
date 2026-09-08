async function testBatch() {
  try {
    const res = await fetch("http://localhost:3000/api/agent/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-secret": "kwsg-intranet-agent-key-2026",
      },
      body: JSON.stringify({
        secretKey: "kwsg-intranet-agent-key-2026",
        reports: [
          {
            target: "http://172.20.110.20/hrdonline",
            name: "HRD Online (Server 20)",
            status: "operational",
            latency: 32,
            statusCode: 200,
            category: "web",
            type: "http"
          },
          {
            target: "http://172.20.110.20",
            name: "Portal Intranet (Server 20)",
            status: "operational",
            latency: 28,
            statusCode: 200,
            category: "web",
            type: "http"
          },
          {
            target: "http://172.20.110.20/sipk",
            name: "Sistem Kepegawaian SIPK (Server 20)",
            status: "operational",
            latency: 41,
            statusCode: 200,
            category: "web",
            type: "http"
          },
          {
            target: "172.20.110.20",
            port: 3306,
            name: "Database MySQL Server 20 (Port 3306)",
            status: "operational",
            latency: 18,
            category: "database",
            type: "tcp"
          }
        ]
      }),
    });
    const data = await res.json();
    console.log("Batch Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Test failed:", e);
  }
}
testBatch();
