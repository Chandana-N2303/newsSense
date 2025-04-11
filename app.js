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

let entities = [];

// Load entity metadata from CSV
fs.createReadStream(path.join(__dirname, "data/entities.csv"))
  .pipe(csv())
  .on("data", (row) => entities.push(row))
  .on("end", () => {
    console.log("✅ Entities loaded");
  });

// Home route – just renders the UI with no crash
app.get("/", (req, res) => {
  const searchQuery = req.query.search ? req.query.search.toLowerCase() : "";
  let headlines = [];

  try {
    headlines = JSON.parse(fs.readFileSync(path.join(__dirname, "data/headlines.json")));
  } catch (err) {
    console.error("❌ Error loading headlines:", err.message);
  }

  const filtered = searchQuery
    ? headlines.filter(item =>
        item.Headline && item.Headline.toLowerCase().includes(searchQuery)
      )
    : [];

  res.render("news-feed", {
    results: null,
    query: searchQuery,
    news: filtered,
  });
});

// Search route
app.post("/search", (req, res) => {
  const { query } = req.body;
  let headlines = [];

  try {
    headlines = JSON.parse(fs.readFileSync(path.join(__dirname, "data/headlines.json")));
  } catch (err) {
    console.error("❌ Error loading headlines:", err.message);
    return res.render("news-feed", { results: [], query, news: [] });
  }

  const results = [];

  // Step 1: Fuzzy match with entity data
  let bestMatch = { entity: null, score: 0 };
  entities.forEach((entity) => {
    const keys = [entity.Name, entity.Ticker, entity.ISIN];
    keys.forEach((key) => {
      if (key) {
        const score = fuzz.token_set_ratio(query, key);
        if (score > bestMatch.score) {
          bestMatch = { entity, score };
        }
      }
    });
  });

  if (bestMatch.score < 85 || !bestMatch.entity) {
    return res.render("news-feed", { results: [], query, news: [] });
  }

  // Step 2: Match headlines by checking for name/ticker/isin inside the text
  const relevantNews = headlines
    .filter((headline) => {
      const text = headline.Headline.toLowerCase();

      return (
        text.includes(bestMatch.entity.Name.toLowerCase()) ||
        text.includes(bestMatch.entity.Ticker.toLowerCase()) ||
        text.includes(bestMatch.entity.ISIN.toLowerCase())
      );
    })
    .map((headline) => ({
      ...headline,
      matchedEntity: bestMatch.entity,
      score: bestMatch.score,
    }));

  res.render("news-feed", {
    results: [{ matchedEntity: bestMatch.entity, score: bestMatch.score }],
    query,
    news: relevantNews,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
