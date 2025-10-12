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

async function scrapeKinch() {
  const url = "https://wca.cuber.pro/";
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  // Grab table headers
  const headers = [];
  $("table thead tr th").each((_, th) => {
    const text = $(th).text().trim();
    if (text) headers.push(text);
  });

  const rows = [];
  $("table tbody tr").each((_, tr) => {
    const children = $(tr).children(); // both td and th
    const rank = $(children[0]).text().trim();

    const countryTh = $(children[1]);
    const countryName = countryTh.find("span").text().trim();
    const flagClass = countryTh.find("i.flag").attr("class") || "";
    const match = flagClass.match(/flag-([a-z]{2})/i);
    const flag = match ? codeToFlagEmoji(match[1].toLowerCase()) : "";

    const overallTd = $(children[2]);
    const overall = overallTd.find("strong, small").text().trim();

    // Remaining event scores
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

  const newHeaders = ["Rank", "Country", "Overall", ...headers.slice(3)]; // skip Rank, Country, Overall in original

  return { headers: newHeaders, rows };
}

function buildHTML(headers, rows) {
  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WCA Kinch Rankings</title>
<style>
  body { font-family: Arial, sans-serif; margin:20px; background:#f9f9f9; }
  table { border-collapse: collapse; width: 100%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
  th, td { border:1px solid #ddd; padding:6px 8px; text-align:center; font-size:13px; }
  th { background-color:#0078d4; color:white; position:sticky; top:0; }
  tr:nth-child(even){ background:#f2f2f2; }
  td:first-child, th:first-child{ text-align:right; }
  td:nth-child(2), th:nth-child(2){ text-align:left; }
</style>
</head>
<body>
<h1>WCA Kinch Rankings (Scraped)</h1>
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
