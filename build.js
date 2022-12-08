const path = require("path");

const fs = require("fs-extra"); // Filesystem help
const Handlebars = require("handlebars"); // Templates
const glob = require("glob"); // glob file selecting
const minimatch = require("minimatch"); // glob matching
const minimist = require("minimist"); // CLI args
const debounce = require("lodash.debounce");

const OUT_DIR = "dist";
const IN_DIR = "example";

// Templatable directories
const PARTIALS_DIR = path.join(IN_DIR, "partials");
const PAGES_DIR = path.join(IN_DIR, "pages");

// Static Directories
const CSS_DIR = "css";
const IMG_DIR = "img";
const FONTS_DIR = "fonts";
const JS_DIR = "js";

const STATIC_DIRS = [CSS_DIR, IMG_DIR, FONTS_DIR, JS_DIR];

Handlebars.registerHelper("ifEq", function (v1, v2, options) {
  if (v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

// Where the magic happens
async function main() {
  const [allHandlebarsFiles, partialFiles, allFiles] = await Promise.all([
    new Promise((resolve, reject) => {
      glob(
        path.join(IN_DIR, "**", "*.handlebars*"),
        { nodir: true },
        (err, files) => {
          if (err) return reject(err);
          resolve(files);
        }
      );
    }),
    new Promise((resolve, reject) => {
      glob(
        path.join(IN_DIR, "**", "_*handlebars"),
        { nodir: true },
        (err, files) => {
          if (err) return reject(err);
          resolve(files);
        }
      );
    }),
    new Promise((resolve, reject) => {
      glob(path.join(IN_DIR, "**", "*"), { nodir: true }, (err, files) => {
        if (err) return reject(err);
        resolve(files);
      });
    }),
  ]);

  const hbfSet = new Set(allHandlebarsFiles);
  const pSet = new Set(partialFiles);

  const handlebarsTemplateFiles = allHandlebarsFiles.filter(
    (f) => !pSet.has(f)
  );

  const staticFiles = allFiles.filter(
    (filename) => !(hbfSet.has(filename) || pSet.has(filename))
  );

  fs.removeSync(OUT_DIR);
  fs.mkdirSync(OUT_DIR);

  const stripInDir = (n) => n.slice(IN_DIR.length + 1);

  /** Make all directories **/
  const dirs = Array.from(
    allFiles.reduce((s, filename) => {
      const relativeDirname = path.dirname(stripInDir(filename));
      if (relativeDirname != ".") {
        s.add(relativeDirname);
      }
      return s;
    }, new Set())
  );

  dirs.forEach((dir) => {
    fs.mkdirpSync(path.join(OUT_DIR, dir));
  });

  /** Copy all static files **/
  staticFiles.forEach((inFile) => {
    const src = inFile;
    const dest = path.join(OUT_DIR, stripInDir(inFile));
    fs.copyFileSync(src, dest);
  });

  /** Register partials **/
  partialFiles.forEach((pFilePath) => {
    const dir = path.dirname(stripInDir(pFilePath));
    const ext = path.extname(pFilePath);
    const name = path
      .basename(pFilePath)
      .slice(1 /* removes leading underscore */);

    const partialName = `${dir}/${name.slice(0, -ext.length)}`;
    console.log("Registering partial:", partialName);

    Handlebars.registerPartial(partialName, fs.readFileSync(pFilePath, "utf8"));
  });

  /** Handlebars compile files **/
  handlebarsTemplateFiles.forEach((hbfPath) => {
    const template = Handlebars.compile(fs.readFileSync(hbfPath, "utf8"));
    const outPath = path
      .join(OUT_DIR, stripInDir(hbfPath))
      .replace(".handlebars", "");

    fs.writeFileSync(outPath, template({}));
  });

  /** WATCHING **/

  // function incrementalPageBuild(filename) {
  //   console.log("Re-compiling page", filename);
  //   compilePage(nameToObj(PAGES_DIR)(filename));
  // }

  // function incrementalPartialBuild(filename) {
  //   console.log("Updating partial", filename);
  //   registerPartial(nameToObj(PARTIALS_DIR)(filename));
  //   console.log("Re-compiling all pages");
  //   compileAllPages();
  // }

  // function copyCSSFile(filename) {
  //   console.log("Updating CSS", filename);
  //   fs.copy(path.join(CSS_DIR, filename), path.join(OUT_DIR, CSS_DIR, filename));
  // }

  // function copyJSFile(filename) {
  //   console.log("Updating JS", filename);
  //   fs.copy(path.join(JS_DIR, filename), path.join(OUT_DIR, JS_DIR, filename));
  // }

  // const cliArgs = minimist(process.argv);
  // if (!cliArgs.watch) return; // only continue to watchers if '--watch' flag used

  // console.log("Watching...");

  // const WAIT_TIME = 400; // milliseconds to wait
  // const debouncedPageBuild = debounce(incrementalPageBuild, WAIT_TIME);
  // const debouncedPartialBuild = debounce(incrementalPartialBuild, WAIT_TIME);
  // const debouncedCSSCopy = debounce(copyCSSFile, WAIT_TIME);
  // const debouncedJSCopy = debounce(copyJSFile, WAIT_TIME);

  // const pageWatcher = fs.watch(PAGES_DIR);
  // pageWatcher.on("change", (event, filename) => {
  //   if (event === "change") {
  //     debouncedPageBuild(filename);
  //   }
  // });

  // const partialWatcher = fs.watch(PARTIALS_DIR);
  // partialWatcher.on("change", (event, filename) => {
  //   if (event === "change") {
  //     debouncedPartialBuild(filename);
  //   }
  // });

  // const cssWatcher = fs.watch(CSS_DIR);
  // cssWatcher.on("change", (event, filename) => {
  //   if (event === "change") {
  //     debouncedCSSCopy(filename);
  //   }
  // });

  // const jsWatcher = fs.watch(JS_DIR);
  // jsWatcher.on("change", (event, filename) => {
  //   if (event === "change") {
  //     debouncedJSCopy(filename);
  //   }
  // });
}

// Execute the main function
main()
  .then(() => {
    console.log("Done.");
  })
  .catch((err) => {
    console.log("Error:", err);
  });
