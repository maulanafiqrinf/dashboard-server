async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/agent/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-secret": "kwsg-intranet-agent-key-2026",
      },
      body: JSON.stringify({
        target: "http://172.20.110.20/hrdonline",
        name: "HRD Online Intranet (172.20.110.20)",
        status: "operational",
        latency: 35,
        statusCode: 200,
        category: "web",
        type: "http"
      }),
    });
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Test failed:", e);
  }
}
test();
