const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

function codeToFlagEmoji(code) {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6;
  const chars = code.toUpperCase().split("");
  return String.fromCodePoint(
    base + (chars[0].charCodeAt(0) - 65),
    base + (chars[1].charCodeAt(0) - 65)
  );
}

// Map event names (like "3x3") to their SVG icons
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
  if (!code) return event; // fallback to text if no icon
  return `<img src="https://raw.githubusercontent.com/cubing/icons/main/src/svg/event/${code}.svg" alt="${event}" width="24" height="24">`;
}

async function scrapeKinch() {
  const url = "https://wca.cuber.pro/";
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  const headers = [];
  $("table thead tr th").each((_, th) => {
    const text = $(th).text().trim();
    if (text) headers.push(text);
  });

  const rows = [];
  $("table tbody tr").each((_, tr) => {
    const children = $(tr).children();
    const rank = $(children[0]).text().trim();

    const countryTh = $(children[1]);
    const countryName = countryTh.find("span").text().trim();
    const flagClass = countryTh.find("i.flag").attr("class") || "";
    const match = flagClass.match(/flag-([a-z]{2})/i);
    const flag = match ? codeToFlagEmoji(match[1].toLowerCase()) : "";

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

    rows.push([rank, `${flag} ${countryName}`, overall, ...eventScores]);
  });

  // Convert event headers to icons
  const newHeaders = ["Rank", "Country", "Overall", ...headers.slice(3).map(eventToIcon)];

  // Convert each row's event scores to icons
  const iconRows = rows.map(row => {
    const [rank, country, overall, ...scores] = row;
    const iconScores = scores.map(eventToIcon);
    return [rank, country, overall, ...iconScores];
  });

  return { headers: newHeaders, rows: iconRows };
}

function buildHTML(headers, rows) {
  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Kinch Rankings</title>
<style>
  body { font-family: Arial, sans-serif; margin:20px; background:#f9f9f9; }
  table { border-collapse: collapse; width: 100%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
  th, td { border:1px solid #ddd; padding:6px 8px; text-align:center; font-size:13px; }
  th { background-color:#0078d4; color:white; position:sticky; top:0; }
  tr:nth-child(even){ background:#f2f2f2; }
  td:first-child, th:first-child{ text-align:right; }
  td:nth-child(2), th:nth-child(2){ text-align:left; }
  img { vertical-align: middle; }
</style>
</head>
<body>
<h1>Kinch rankings</h1>
<table>
  ${thead}
  <tbody>${tbody}</tbody>
</table>
</body>
</html>`;
}

(async () => {
  try {
    const { headers, rows } = await scrapeKinch();
    const html = buildHTML(headers, rows);
    fs.writeFileSync("output.html", html, "utf8");
    console.log(`Scraped ${rows.length} rows and wrote output.html`);
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
