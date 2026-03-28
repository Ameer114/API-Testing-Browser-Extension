import { useState, useEffect } from "react";
import "./style.css";

function App() {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState([{ key: "", value: "" }]);

  // 🔹 Header presets
  const headerOptions = {
    "Content-Type": [
      "application/json",
      "application/xml",
      "multipart/form-data",
      "application/x-www-form-urlencoded",
      "text/plain"
    ],
    "Accept": [
      "application/json",
      "application/xml",
      "*/*"
    ],
    "Authorization": [
      "Bearer ",
      "Basic "
    ],
    "Cache-Control": [
      "no-cache",
      "no-store",
      "max-age=0"
    ]
  };

  // 🔥 Get URL automatically when popup opens
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setUrl(tabs[0].url);
      }
    });
  }, []);

  // Add new header
  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  // Update header
  const updateHeader = (index, field, value) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;

    // reset value if key changes
    if (field === "key") {
      newHeaders[index].value = "";
    }

    setHeaders(newHeaders);
  };

  // Convert headers array → object
  const getHeadersObject = () => {
    const obj = {};
    headers.forEach((h) => {
      if (h.key) obj[h.key] = h.value;
    });
    return obj;
  };

  const deleteHeader = (index) => {
  const newHeaders = headers.filter((_, i) => i !== index);
  setHeaders(newHeaders);
};

  // Send request
  const sendRequest = (mode) => {

    if (!url.startsWith("http")) {
      alert("⚠ Open a valid API URL first");
      return;
    }

    let parsedBody = undefined;

    if (method !== "GET" && body) {
      try {
        parsedBody = JSON.stringify(JSON.parse(body));
      } catch {
        alert("Invalid JSON format");
        return;
      }
    }

    chrome.runtime.sendMessage(
      {
        type: "API_REQUEST",
        payload: {
          url,
          method,
          headers: getHeadersObject(),
          body: parsedBody
        },
        mode
      },
      (response) => {
        console.log("Response:", response);
      }
    );
  };

  return (
    <div className="container">
      <div className="title">Mini API Tool 🚀</div>

      {!url.startsWith("http") && (
        <div style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>
          ⚠ Open a valid API URL first
        </div>
      )}

      <div className="url">
        <strong>URL:</strong> {url || "Loading..."}
      </div>

      <select  className="method-select" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>PATCH</option>
        <option>DELETE</option>
      </select>

      {method !== "GET" && (
        <textarea
          rows={5}
          placeholder="Enter JSON body..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      )}

      <div className="headers">
  <strong>Headers</strong>

  {headers.map((h, i) => (
    <div key={i} className="header-row">

      {/* Key dropdown */}
      <select
        value={h.key}
        onChange={(e) => updateHeader(i, "key", e.target.value)}
      >
        <option value="">Select Key</option>

        {Object.keys(headerOptions).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}

      </select>

      {/* Value input with suggestions */}
      <input
        list={`values-${i}`}
        placeholder="Value"
        value={h.value}
        onChange={(e) => updateHeader(i, "value", e.target.value)}
      />

      <datalist id={`values-${i}`}>
        {(headerOptions[h.key] || []).map((val) => (
          <option key={val} value={val} />
        ))}
      </datalist>

      {/* Delete header */}
      <button onClick={() => deleteHeader(i)}>❌</button>

    </div>
  ))}

  <button onClick={addHeader}>+ Add Header</button>
</div>

      <div className="button-group">
        <button onClick={() => sendRequest("NEW_TAB")}>
          New Tab
        </button>

        <button onClick={() => sendRequest("CURRENT_TAB")}>
          Current Tab
        </button>
      </div>
    </div>
  );
}

export default App;