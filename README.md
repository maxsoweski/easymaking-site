# easymaking-site

Static site hosted at **easymaking.io** via Cloudflare Pages.

## Structure

```
/
├── index.html              ← easymaking.io landing
└── honest-assistant/       ← easymaking.io/honest-assistant/
    ├── index.html          ← assembled course
    ├── styles.css
    └── main.js
```

## Courses

- **[The Honest Assistant](./honest-assistant/)** — interactive 6-module course on building an AI assistant system that is both productive and honest. Source + build files live in `~/projects/courses/honest-assistant/`.

## Deploy

Auto-deploys to Cloudflare Pages on push to `main`. No build step — all files are pre-assembled and served as-is.
