Page Crafter
=======================

A tool for simply templating content pages using handlebars templating syntax
with partials support.

## Usage

    pagecraft <dir> [options]

All files with a `.handlebars` extension will be run through the handlebars
templating engine.

Any handlebars files with a leading `_` underscore in the name will be
registered as partials and not available in the final output.

All other files will be copied as-is to the output directory.


## Options

| option         |  Description |
----------------------------------------
|  -h,--help         | help message |
|  -o,--out          | Specify 'out' directory; default 'dist' |
|  -p,--params       | Specify a YAML parameter file to be used as template context |
|  -c,--clean        | Remove the 'out' directory before build |
|  -v,--version      | Print version information |


## Example

Given the following input directory structure:

```
website/
├── css/
│   ├── bootstrap.min.css
│   └── bootstrap-theme.min.css
├── js/
│   └── bootstrap.min.js
├── shared-partials/
│   ├── _navbar.html.handlebars
│   └── _footer.html.handlebars
├── index.html.handlebars
└── about-us.html.handlebars
```

A YAML parameter file named `web-params.yml` at the same level as `website/` with the following contents:

```yaml
---
sales_phone: 555-555-5555
sales_email: sales@example.org
```

And running the following command:

    pagecraft website/ -o dist/ -p web-params.yml

The following will occur:

1. All files in `css/` and `js/` will be copied as-is to a new `dist/` folder
1. Partials named `shared-partials/_navbar.html` and
   `shared-partials/_footer.html` will be registered and available to be used in
   the `index.html.handlebars` and `about-us.html.handlebars` files as `{{>
   shared-partials/_navbar.html }}`. Notice that they are namespaced by their
   relative folder.
1. The `sales_phone` and `sales_email` contents of `web-params.yml` will be
   available as context for each template.
1. An `index.html` and `about-us.html` will be created in the `dist/` folder
   after running through the handlebars templater with all available partials
   and context parameters.

The output will be:

```
dist/
├── css/
│   ├── bootstrap.min.css
│   └── bootstrap-theme.min.css
├── js/
│   └── bootstrap.min.js
├── shared-partials/
├── index.html
└── about-us.html
```
