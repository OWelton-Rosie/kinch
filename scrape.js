console.log(`\n=== Scrape started at ${new Date().toLocaleString()} ===`);

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// ---------------------
// Utilities
// ---------------------

function countryCodeToTwemojiURL(code) {
  if (!code || code.length !== 2) return "";
  const chars = code.toUpperCase().split("");
  const codePoints = chars.map(c => 0x1f1e6 + (c.charCodeAt(0) - 65));
  const hex = codePoints.map(cp => cp.toString(16)).join("-");
  return `https://twemoji.maxcdn.com/v/latest/72x72/${hex}.png`;
}

function codeToFlagTwemoji(code) {
  const url = countryCodeToTwemojiURL(code);
  return `<img src="${url}" width="28" height="28" style="vertical-align:middle; margin-right:8px;" alt="${code}">`;
}

function eventToIcon(event) {
  const codeMap = {
    "333": "333",
    "222": "222",
    "333bf": "333bf",
    "333oh": "333oh",
    "333fm": "333fm",
    "333mbf": "333mbf",
    "444": "444",
    "444bf": "444bf",
    "555": "555",
    "555bf": "555bf",
    "666": "666",
    "777": "777",
    "clock": "clock",
    "minx": "minx",
    "pyram": "pyram",
    "skewb": "skewb",
    "sq1": "sq1"
  };
  const code = codeMap[event.toLowerCase()];
  return `<img src="https://raw.githubusercontent.com/cubing/icons/main/src/svg/event/${code}.svg" 
              alt="${event}" width="32" height="32" style="vertical-align:middle;">`;
}

// ---------------------
// Scraping
// ---------------------
async function scrapeKinch() {
  console.log("Fetching site...");
  const url = "https://wca.cuber.pro/";

  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    timeout: 20000,
  });

  console.log("Loaded HTML, parsing...");
  const $ = cheerio.load(html);

  // Headers
  const headers = [];
  $("table thead tr th").each((_, th) => {
    const text = $(th).text().trim();
    if (text) headers.push(text);
  });

  // Rows
  const rows = [];
  $("table tbody tr").each((_, tr) => {
    const children = $(tr).children();
    const rank = $(children[0]).text().trim();

    const countryTh = $(children[1]);
    const countryName = countryTh.find("span").text().trim();
    const flagClass = countryTh.find("i.flag").attr("class") || "";
    const match = flagClass.match(/flag-([a-z]{2})/i);
    const flagSpan = match ? codeToFlagTwemoji(match[1].toLowerCase()) : "";

    const overallTd = $(children[2]);
    const overall = overallTd.find("strong, small").text().trim();

    const eventScores = [];
    for (let i = 3; i < children.length; i++) {
      const td = $(children[i]);
      if (td.is("td")) {
        const score = td.find("strong, small").text().trim();
        if (score) eventScores.push(score);
      }
    }

    const rowClass = countryName.toLowerCase() === "new zealand" ? "highlight-nz" : "";

    rows.push({ data: [rank, `${flagSpan}${countryName}`, overall, ...eventScores], class: rowClass });
  });

  const newHeaders = ["Rank", "Country", "Overall", ...headers.slice(3).map(eventToIcon)];

  return { headers: newHeaders, rows };
}

// ---------------------
// Build HTML
// ---------------------
function buildHTML(headers, rows) {
  console.log("Building HTML output...");
  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = rows
    .map(r => `<tr class="${r.class}">${r.data.map(c => `<td>${c}</td>`).join("")}</tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Kinch Rankings</title>
<style>
  body { font-family: Arial, sans-serif; margin:20px; background:#121212; color:#fff; }
  table { border-collapse: collapse; width: 100%; background:#1c1c1c; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
  th, td { border:1px solid #333; padding:6px 8px; text-align:center; font-size:13px; color:#fff; }
  th { background-color:#46b04c; color:white; position:sticky; top:0; }
  tr:nth-child(even){ background:#262626; }
  td:first-child, th:first-child{ text-align:right; }
  td:nth-child(2), th:nth-child(2){ text-align:left; }
  img { vertical-align: middle; }
  th img { filter: brightness(0) invert(1); width:32px; height:32px; } 
  tr.highlight-nz { background:#333 !important; font-weight:bold; }
  th:nth-child(-n+3), td:nth-child(-n+3) { font-weight: bold; }
</style>
</head>
<body>
<h1>Kinch Rankings</h1>
<table>
  ${thead}
  <tbody>${tbody}</tbody>
</table>
</body>
</html>`;
}

// ---------------------
// Main function (exportable)
// ---------------------
async function updateKinch(outputPath = "output.html") {
  console.log("Starting scrape...");
  try {
    const { headers, rows } = await scrapeKinch();
    console.log(`Scrape complete, found ${rows.length} rows`);
    const html = buildHTML(headers, rows);
    fs.writeFileSync(outputPath, html, "utf8");
    console.log(`Wrote ${outputPath}`);
  } catch (err) {
    console.error("Error during scrape:", err.message);
  }
}

// ---------------------
// Run if called directly
// ---------------------
if (require.main === module) {
  (async () => {
    await updateKinch("output.html");
  })();
}

// ---------------------
// Export for cron/other scripts
// ---------------------
module.exports = updateKinch;
