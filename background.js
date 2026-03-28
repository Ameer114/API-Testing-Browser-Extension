chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "API_REQUEST") {
    handleRequest(msg, sender, sendResponse);
    return true; // VERY IMPORTANT (async response)
  }
});

async function handleRequest(msg, sender, sendResponse) {
  const { url, method, headers, body } = msg.payload;

  try {
    const start = performance.now();
    const res = await fetch(url, {
      method,
      headers,
      body: body || undefined,
    });

    const contentType = res.headers.get("content-type");
    const end = performance.now();
    const responseTime = Math.round(end - start);
    let data;
    let isJSON = false;

    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
      isJSON = true;
    } else {
      data = await res.text();
    }

    // Send response back to popup
    sendResponse({
      success: true,
      data,
      status: res.status,
      time: responseTime,
    });

    console.log(`mode: ${msg.mode}`);

    // Handle display mode
    if (msg.mode === "NEW_TAB") {
      console.log("Opening new tab...");
      openInNewTab(data);
    } else {
      console.log("Replacing current tab...");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) return;

        if (!tabs || !tabs.length) {
          console.error("No active tab found");
          return;
        }

        const tabId = tabs[0].id;
        replaceCurrentTab(tabId, data);
      });
    }
  } catch (err) {
    sendResponse({
      success: false,
      error: err.message,
    });
  }
}

function openInNewTab(data, isJSON) {
  const html = `
  <html>
  <head>
    <title>API Response</title>
    <style>
      body {
        margin:0;
        font-family: monospace;
        background:#0f172a;
        color:white;
      }

      .toolbar {
        padding:10px;
        background:#1e293b;
        display:flex;
        gap:10px;
        align-items:center;
      }

      button {
        padding:4px 10px;
        cursor:pointer;
        border:none;
        background:#22c55e;
        color:black;
        border-radius:4px;
      }

      .viewer {
        padding:20px;
        white-space:pre-wrap;
        word-break:break-word;
      }
    </style>
  </head>

  <body>

    <div class="toolbar">
      <strong>Response Viewer</strong>
      <button onclick="showPretty()">Pretty</button>
      <button onclick="showRaw()">Raw</button>
    </div>

    <div id="viewer" class="viewer"></div>

    <script>
      const rawData = ${JSON.stringify(data)};
      const rawText = ${JSON.stringify(
        typeof data === "string" ? data : JSON.stringify(data),
      )};

      function showPretty(){
        try{
          document.getElementById("viewer").textContent =
            JSON.stringify(rawData, null, 2);
        }catch{
          document.getElementById("viewer").textContent = rawText;
        }
      }

      function copy(){
        const text = document.getElementById("viewer").textContent;
  navigator.clipboard.writeText(text);
  alert("Copied");
      }


      function showRaw(){
        document.getElementById("viewer").textContent = rawText;
      }
    
      showPretty();
    </script>

  </body>
  </html>
  `;

  const url = "data:text/html;charset=utf-8," + encodeURIComponent(html);

  chrome.tabs.create({ url });
}

function replaceCurrentTab(tabId, data) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (responseData) => {
      const rawText =
        typeof responseData === "string"
          ? responseData
          : JSON.stringify(responseData);

      const prettyText =
        typeof responseData === "string"
          ? responseData
          : JSON.stringify(responseData, null, 2);

      document.open();

      document.write(`
        <html>
        <head>
          <style>
            body{
              margin:0;
              background:#0f172a;
              color:white;
              font-family:monospace;
            }

            .toolbar{
              background:#1e293b;
              padding:10px;
              display:flex;
              gap:10px;
            }

            button{
              padding:4px 10px;
              background:#22c55e;
              border:none;
              border-radius:4px;
              cursor:pointer;
            }

            .viewer{
              padding:20px;
              white-space:pre-wrap;
              word-break:break-word;
            }
          </style>
        </head>

        <body>

          <div class="toolbar">
            <button id="prettyBtn">Pretty</button>
            <button id="rawBtn">Raw</button>
          </div>

          <div id="viewer" class="viewer"></div>

        </body>
        </html>
      `);

      document.close();

      const viewer = document.getElementById("viewer");
      const prettyBtn = document.getElementById("prettyBtn");
      const rawBtn = document.getElementById("rawBtn");

      viewer.textContent = prettyText;

      prettyBtn.onclick = () => {
        viewer.textContent = prettyText;
      };

      rawBtn.onclick = () => {
        viewer.textContent = rawText;
      };
    },
    args: [data],
  });
}
