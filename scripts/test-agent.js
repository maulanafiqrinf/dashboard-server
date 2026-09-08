async function updateSifina() {
  try {
    const res = await fetch("http://localhost:3000/api/agent/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-secret": "kwsg-intranet-agent-key-2026",
      },
      body: JSON.stringify({
        secretKey: "kwsg-intranet-agent-key-2026",
        monitorId: "VJF3IKYziQMFTmdWxZ1F",
        target: "http://172.20.110.20/sifina/login",
        name: "Web Portal Semen Indonesia Cooperative (Sifina)",
        status: "operational",
        latency: 152,
        statusCode: 200,
        category: "web",
        type: "http"
      }),
    });
    const data = await res.json();
    console.log("Updated Sifina:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
updateSifina();
