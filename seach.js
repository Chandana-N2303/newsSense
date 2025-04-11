app.post("/search", (req, res) => {
    const { query } = req.body;
    const threshold = 70;
  
    if (!query) {
      return res.render("news-feed", { query, matches: [] });
    }
  
    const userQuery = query.toString().toLowerCase().trim();
    const matches = [];
  
    schemes.forEach((s) => {
      const keys = [s.schemeName, s.schemeCode];
      for (const key of keys) {
        if (key) {
          const cleanedKey = key.toString().toLowerCase().trim();
          const score = fuzz.token_set_ratio(userQuery, cleanedKey);
  
          console.log(`Comparing "${userQuery}" with "${cleanedKey}" => Score: ${score}`);
  
          if (score >= threshold) {
            const details = extractDetails(s.search_text || "");
            matches.push({
              schemeCode: s.schemeCode,
              schemeName: s.schemeName,
              score,
              ...details,
            });
            break;
          }
        }
      }
    });
  
    console.log(`🟡 Matches found: ${matches.length}`);
    res.render("news-feed", { query, matches });
  });
  