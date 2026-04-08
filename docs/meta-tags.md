# Meta Tags Template

A reference guide for implementing meta tags for SEO, social media, and browser integration in Next.js projects.

---

## Overview

Meta tags provide metadata about a page. Search engines, social platforms, and browsers use them to understand and display content. In Next.js, manage them via the `Head` component from `next/head`.

---

## Basic Structure

```jsx
import Head from "next/head";

export default function Page() {
  return (
    <Head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>[Page Title] - [Site Name]</title>
      <meta name="description" content="[Page description, 150-160 chars]" />
      <meta property="og:image" content="[https://your-cdn.com/image.jpg]" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
}
```

---

## Tag Reference

### Standard Tags

| Tag | Purpose | Notes |
|-----|---------|-------|
| `<title>` | Browser tab, search results, social shares | Keep under 60 chars |
| `description` | Search result snippet | 150–160 chars, unique per page |
| `viewport` | Mobile rendering | `width=device-width, initial-scale=1` |
| `charset` | Character encoding | Use `utf-8` |
| `theme-color` | Mobile browser chrome color | Hex value matching brand |

```jsx
<meta charSet="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>[Page Topic] - [Site Name]</title>
<meta name="description" content="[Unique description for this page.]" />
<meta name="theme-color" content="#[hex-color]" />
```

---

### Open Graph Tags (Social Sharing)

Controls how the page appears when shared on Facebook, LinkedIn, Slack, etc.

| Tag | Purpose |
|-----|---------|
| `og:type` | Content type (`website`, `article`) |
| `og:url` | Canonical URL of the page |
| `og:title` | Title for social previews |
| `og:description` | Description for social previews |
| `og:image` | Preview image (ideally 1200×630px) |
| `og:image:width` | Image width in pixels |
| `og:image:height` | Image height in pixels |

```jsx
<meta property="og:type" content="website" />
<meta property="og:url" content="[https://yourdomain.com/page]" />
<meta property="og:title" content="[Page Title]" />
<meta property="og:description" content="[Social preview description]" />
<meta property="og:image" content="[https://your-cdn.com/og-image.jpg]" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

---

### Twitter / X Card Tags

| Tag | Purpose |
|-----|---------|
| `twitter:card` | Card type (`summary`, `summary_large_image`) |
| `twitter:site` | Your Twitter handle |
| `twitter:title` | Title for Twitter previews |
| `twitter:description` | Description for Twitter previews |
| `twitter:image` | Preview image |

```jsx
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@[handle]" />
<meta name="twitter:title" content="[Page Title]" />
<meta name="twitter:description" content="[Twitter preview description]" />
<meta name="twitter:image" content="[https://your-cdn.com/og-image.jpg]" />
```

---

### Icons

| Tag | Purpose |
|-----|---------|
| `rel="icon"` | Browser tab / bookmarks |
| `rel="apple-touch-icon"` | iOS home screen icon (180×180px) |

```jsx
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

### Canonical URL

Prevents duplicate content issues in search engines.

```jsx
<link rel="canonical" href="[https://yourdomain.com/page]" />
```

---

## Full Template

```jsx
import Head from "next/head";

export default function Page() {
  const siteUrl = "https://yourdomain.com";
  const pageUrl = `${siteUrl}/page-path`;
  const imageUrl = `${siteUrl}/og-image.jpg`;

  return (
    <Head>
      {/* Core */}
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>[Page Title] - [Site Name]</title>
      <meta name="description" content="[Unique description for this page, 150-160 chars.]" />
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content="[Page Title]" />
      <meta property="og:description" content="[Social preview description]" />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@[handle]" />
      <meta name="twitter:title" content="[Page Title]" />
      <meta name="twitter:description" content="[Twitter preview description]" />
      <meta name="twitter:image" content={imageUrl} />

      {/* Icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* Mobile */}
      <meta name="theme-color" content="#[hex-color]" />
    </Head>
  );
}
```

---

## Best Practices

- **Unique per page**: Titles and descriptions should never be duplicated across pages
- **OG images**: 1200×630px, under 1MB, hosted on a CDN
- **Descriptions**: Action-oriented language ("Discover", "Explore") performs better in CTR
- **Canonical URLs**: Always set to prevent duplicate content penalties
- **Test before shipping**: Use the tools below after adding or updating tags

---

## Testing Tools

| Tool | URL |
|------|-----|
| Facebook Sharing Debugger | https://developers.facebook.com/tools/debug/ |
| Twitter Card Validator | https://cards-dev.twitter.com/validator |
| Google Rich Results Test | https://search.google.com/test/rich-results |
| LinkedIn Post Inspector | https://www.linkedin.com/post-inspector/ |
| Schema.org Validator | https://validator.schema.org/ |
