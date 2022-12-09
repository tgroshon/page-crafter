#!/usr/bin/env node

const path = require("path");

const fs = require("fs-extra"); // Filesystem help
const Handlebars = require("handlebars"); // Templates
const glob = require("glob"); // glob file selecting
const minimatch = require("minimatch"); // glob matching
const minimist = require("minimist"); // CLI args
const debounce = require("lodash.debounce");

const HELP_MSG = `The Page Crafter

Usage:
  pagecraft <dir> [options]

Options:
  -h,--help    This help message
  -o,--out     Specify 'out' directory; default 'dist'
  -c,--clean   Remove the 'out' directory before build
`;

async function findAllFiles(baseDir) {
  const [allHandlebarsFiles, partialFiles, allFiles] = await Promise.all([
    new Promise((resolve, reject) => {
      glob(
        path.join(baseDir, "**", "*.handlebars*"),
        { nodir: true },
        (err, files) => {
          if (err) return reject(err);
          resolve(files);
        }
      );
    }),
    new Promise((resolve, reject) => {
      glob(
        path.join(baseDir, "**", "_*handlebars"),
        { nodir: true },
        (err, files) => {
          if (err) return reject(err);
          resolve(files);
        }
      );
    }),
    new Promise((resolve, reject) => {
      glob(path.join(baseDir, "**", "*"), { nodir: true }, (err, files) => {
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

  return { partialFiles, staticFiles, allFiles, handlebarsTemplateFiles };
}
const normalizeInDir = (dirName) => {
  const dirPieces = dirName.split(path.sep);
  if (dirPieces[dirPieces.length - 1] === "") {
    dirPieces.pop();
  }

  return dirPieces.join(path.sep);
};

// Where the magic happens
async function main() {
  const cliArgs = minimist(process.argv);

  const IN_DIR = cliArgs._[2];
  const OUT_DIR = cliArgs.o || cliArgs.out || "dist";

  if (cliArgs.h || cliArgs.help) {
    console.log(HELP_MSG);
    process.exit(0);
  }

  if (!IN_DIR) {
    console.error('Must provide an "in" directory as 1st argument');
    process.exit(1);
  }

  if (cliArgs.c || cliArgs.clean) {
    fs.removeSync(OUT_DIR);
  }

  const normalizedInDir = normalizeInDir(IN_DIR);

  const stripInDir = (n) => {
    return n.slice(normalizedInDir.length + 1);
  };

  const { partialFiles, staticFiles, allFiles, handlebarsTemplateFiles } =
    await findAllFiles(normalizedInDir);

  /** Make all directories **/
  const dirs = Array.from(
    allFiles.reduce((s, filename) => {
      const relativeDirname = path.dirname(stripInDir(filename));
      s.add(relativeDirname);
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

  /** Add basic helper **/
  Handlebars.registerHelper("ifEq", function (v1, v2, options) {
    if (v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /** Register partials **/
  partialFiles.forEach((pFilePath) => {
    const dir = path.dirname(stripInDir(pFilePath));
    const ext = path.extname(pFilePath);
    const name = path.basename(pFilePath, ext);

    const partialName = `${dir}/${name}`;
    console.log("Registering partial:", partialName);

    Handlebars.registerPartial(partialName, fs.readFileSync(pFilePath, "utf8"));
  });

  /** Handlebars compile files **/
  handlebarsTemplateFiles.forEach((hbfPath) => {
    const template = Handlebars.compile(fs.readFileSync(hbfPath, "utf8"));
    const outPath = path
      .join(OUT_DIR, stripInDir(hbfPath))
      .replace(".handlebars", "");

    console.log("Compiling template:", hbfPath, "->", outPath);
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
