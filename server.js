const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8787);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const SYSTEM_PROMPT = `
You are the NYCPA.online AI tax and finance guide.
Help users understand CPA, bookkeeping, tax, accounting, entity, payroll, audit, and personal finance questions.
You are educational and practical, but you are not the user's CPA, attorney, or financial advisor.
Do not give final legal, tax, investment, or filing advice. Encourage users to verify with a licensed New York CPA or other qualified professional.
When the question involves dates, deadlines, thresholds, deductions, credits, laws, IRS/NYS rules, or dollar limits, explain that rules can change and recommend verification against current official IRS, New York State, or professional guidance.
Ask concise follow-up questions when facts are missing.
Keep answers short, clear, and action-oriented.
Do not ask for Social Security numbers, full bank details, passwords, or other highly sensitive personal data.
`;

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/chat") {
      await handleChat(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server error. Please try again." });
  }
});

async function handleChat(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 500, {
      error:
        "OPENAI_API_KEY is not set on the server. Set it in your environment, then restart the server."
    });
    return;
  }

  const body = await readJson(req);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const safeMessages = messages
    .filter((message) => message && ["user", "assistant"].includes(message.role))
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 4000)
    }));

  if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
    sendJson(res, 400, { error: "Please send a user question." });
    return;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_output_tokens: 800,
      input: [
        {
          role: "developer",
          content: [{ type: "input_text", text: SYSTEM_PROMPT.trim() }]
        },
        ...safeMessages.map((message) => ({
          role: message.role,
          content: [{ type: "input_text", text: message.content }]
        }))
      ]
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    sendJson(res, response.status, {
      error: data.error?.message || "OpenAI request failed."
    });
    return;
  }

  sendJson(res, 200, {
    answer: extractText(data),
    model: data.model || OPENAI_MODEL
  });
}

function extractText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim() || "I could not generate an answer. Please try again.";
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, `.${requestedPath}`);

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(content);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`NYCPA.online server running at http://127.0.0.1:${PORT}`);
  console.log(`OpenAI model: ${OPENAI_MODEL}`);
});
