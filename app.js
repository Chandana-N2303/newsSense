const express = require("express");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const fuzz = require("fuzzball");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

let schemes = [];

fs.createReadStream(path.join(__dirname, "data/data.csv"))
  .pipe(csv())
  .on("data", (row) => schemes.push(row))
  .on("end", () => {
    console.log("✅ Schemes loaded:", schemes.length);
    console.log("🔎 Sample:", schemes.slice(0, 2));
  });

// Home page
app.get("/", (req, res) => {
  res.render("news-feed", { query: null, matches: [] });
});

// Search route
app.post("/search", (req, res) => {
  const { query } = req.body;
  const threshold = 70;

  if (!query) {
    return res.render("news-feed", { query, matches: [] });
  }

  const userQuery = query.toString().toLowerCase().trim();
  const matches = [];

  console.log("🔍 Searching for:", userQuery);

  // Fuzzy match on fund name
  schemes.forEach((s) => {
    const fundName = s.name_of_the_fund?.toLowerCase().trim();

    if (fundName) {
      const score = fuzz.token_set_ratio(userQuery, fundName);
      if (score >= threshold) {
        matches.push({
          name: s.name_of_the_fund,
          aum: s.aum_funds_individual_lst || "N/A",
          nav: s.nav_funds_individual_lst || "N/A",
          risk: s.risk_of_the_fund || "N/A",
          type: s.type_of_fund || "N/A",
          returns_1y: s.one_year_returns || "N/A",
          returns_3y: s.three_year_returns || "N/A",
          returns_5y: s.five_year_returns || "N/A",
          link: s.link_of_the_funds || "#",
          score,
        });
      }
    }
  });

  res.render("news-feed", { query, matches });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
