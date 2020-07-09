#!/usr/bin/env node

const puppeteer = require("puppeteer");
const fs = require("fs");
const execa = require("execa");

const util = require("util");

const writeFile = util.promisify(fs.writeFile);

let argv = require("yargs")
  .usage("Usage: $0 -u <github username>")
  .alias("u", "username")
  .describe("u", "github username")
  .demandOption(["u"])
  .describe("d", "depth of recursion")
  .alias("d", "depth")
  .default("d", 3)
  .help("h")
  .alias("h", "help").argv;

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

const getScreenshot = async (username, depth) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://github.com/${username}`);
  await page.setViewport({
    width: 1080,
    height: 800,
  });

  // this might break pretty quickly
  await page.tap(
    "#js-pjax-container > div.container-xl.px-3.px-md-4.px-lg-5 > signup-prompt > div > div > button"
  );
  await page.screenshot({ path: `screenshot-${depth}.png` });
  await browser.close();
};

(async () => {
  if (argv.username) {
    let d = argv.depth;

    while (d > 0) {
      // Take screenshot
      await getScreenshot(argv.username, d);
      console.log("took screenshot");

      // edit README.md
      await writeFile(
        "README.md",
        `![Woah!](https://github.com/${argv.username}/${argv.username}/blob/master/screenshot-${d}.png)`
      );

      // add to git and push
      try {
        await execa(`git`, ["add", `screenshot-${d}.png`, "README.md"]);
        await execa(`git`, [
          "commit",
          "-m",
          `"adds new screenshot at depth ${d}"`,
        ]);
        await execa("git", ["push", "-u", "origin", "master"]);
      } catch (err) {
        // console.error(err);
        console.log("An issue adding files to git occured.");
      }

      console.log("Sleeping 10 seconds while github updates 😊");
      sleep(10000);

      d--;
    }
  }
})();
