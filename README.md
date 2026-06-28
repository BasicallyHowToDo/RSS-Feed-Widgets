# RSS Feed Widget

A lightweight, zero-dependency RSS feed widget built with vanilla JavaScript. Turn any RSS feed into a beautiful, responsive card grid with filtering, dark mode, and skeleton loading.

**[Live Demo →](https://YOUR_USERNAME.github.io/rss-feed-widget)**

## Features

- **Zero dependencies** — No frameworks, no npm install, no build step
- **Under 4KB** gzipped (JS + CSS combined)
- **Responsive** — Looks great on mobile, tablet, and desktop
- **Dark mode** — Auto-detects system preference or set manually
- **Category filters** — Auto-generated from your feed's categories
- **Skeleton loading** — Smooth loading state while fetching
- **Auto-colored badges** — Consistent colors generated from category names
- **CORS handling** — Built-in proxy support for cross-origin feeds
- **Configurable** — Max items, description length, theme, and more

## Quick Start

```html
<link rel="stylesheet" href="rss-widget.css">
<script src="rss-widget.js"></script>

<div id="rss-widget"></div>

<script>
  RSSWidget.init({
    feed: 'https://how-to-do.net/feed.xml',
    container: '#rss-widget'
  });
</script>
```

That's it. Two files, three lines.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `feed` | string | `'https://how-to-do.net/feed.xml'` | RSS feed URL |
| `container` | string | `'#rss-widget'` | CSS selector for the container element |
| `maxItems` | number | `12` | Maximum number of cards to display |
| `showFilter` | boolean | `true` | Show category filter buttons |
| `showDate` | boolean | `true` | Show publication date on cards |
| `descriptionLength` | number | `120` | Truncate descriptions to this length |
| `theme` | string | `'auto'` | `'auto'`, `'light'`, or `'dark'` |
| `corsProxy` | string | `null` | Proxy URL prefix for CORS (e.g. `'https://api.allorigins.win/raw?url='`) |
| `skeletonCount` | number | `6` | Number of skeleton cards during loading |
| `onLoad` | function | `null` | Callback when feed loads successfully |
| `onError` | function | `null` | Callback when feed fails to load |

## Theming

The widget uses CSS custom properties for all colors. Override them to match your design:

```css
:root {
  --rss-accent: #4f46e5;
  --rss-radius: 14px;
  --rss-surface: #ffffff;
  --rss-border: #e8e8e8;
  --rss-text: #1a1a2e;
}
```

Dark mode activates automatically when the user's system preference is dark, or set `theme: 'dark'` to force it.

## CORS

If the RSS feed you are loading has `Access-Control-Allow-Origin: *` set (like the default how-to-do.net feed), it works directly with no proxy needed.

For feeds without CORS headers, pass a proxy:

```javascript
RSSWidget.init({
  feed: 'https://example.com/feed.xml',
  corsProxy: 'https://api.allorigins.win/raw?url='
});
```

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Uses `DOMParser`, `fetch`, and CSS Grid which are supported in all browsers released after 2018.

## License

MIT

---

Default demo feed provided by [how-to-do.net](https://how-to-do.net) — practical, step-by-step guides for everyday tasks.
