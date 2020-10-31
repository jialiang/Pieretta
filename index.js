const ejs = require("ejs");
const fs = require("fs");

(async function() {
  fs.writeFile("dist/index.html", await ejs.renderFile("src/index.html"), err => {
    if (err) console.log(err);

    console.log("Successfully Written to File.");
  });

  fs.writeFile("dist/main.js", await ejs.renderFile("src/main.js"), err => {
    if (err) console.log(err);

    console.log("Successfully Written to File.");
  });
})();
