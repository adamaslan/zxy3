# Gallery Artist Data Collection — Techniques

A step-by-step record of how artist data was collected from 8 galleries and compiled into `data/artists.csv`.

---

## Step 1: Browser Subagent — Mass Artist Extraction

**Used for:** Luhring Augustine, Magenta Plains, Tanya Bonakdar Gallery

A browser subagent was dispatched to autonomously navigate each gallery's `/artists` page:

1. The agent opened each gallery URL in a real browser session.
2. It located the artists listing (grid, list, or index view).
3. It scrolled and clicked through any pagination or view toggles.
4. It returned structured lists of artist names grouped by gallery.

**Why:** These galleries render their artist pages in JavaScript-heavy UIs that simple HTTP fetchers can't parse. A real browser session is required to see the rendered DOM.

---

## Step 2: `read_url_content` — Lightweight HTTP Fetch

**Used for:** Sanatorium, 56 Henry, Europa

When the browser subagent hit capacity limits (503 errors), the `read_url_content` tool was used as a fallback. This tool:

1. Sends a standard HTTP GET request to the target URL.
2. Converts the HTML response to clean Markdown.
3. Saves the result to a local file for inspection.

For galleries where the homepage didn't list artists, their `/artists` or `/artists/` subpath was tried directly (e.g., `https://56henry.nyc/artists/`, `https://europa.nyc/artists/`).

**Why:** Much faster than a browser session and sufficient for sites that serve artist lists in static or server-rendered HTML.

---

## Step 3: Inspecting Saved Content Files

After `read_url_content` saved each page, the content was read with `view_file`:

1. Opened the saved `.md` file at the path returned by the tool.
2. Scanned for artist name patterns — typically markdown links (`[Artist Name](url)`) or heading tags (`## Artist Name`).
3. Manually identified which names were represented artists vs. exhibition history entries.

**For 56 Henry specifically:** The `/artists/` page returned both current roster artists (linked to `/artists/name`) and exhibition-history names (linked to `/exhibitions/name`). Both sets were included since the gallery doesn't maintain a strict "represented vs. past" distinction on its public site.

---

## Step 4: `curl` + Python — Fallback for JS-heavy Sites

**Used for:** International Waters, Island (island83.gallery)

Both sites returned 503 errors to the HTTP fetcher and the browser subagent was unavailable. A two-step shell approach was used:

### 4a. `curl` raw HTML fetch
```bash
curl -sL "https://internationalwaters.international/" | sed 's/<[^>]*>//g' | awk '{$1=$1;print}'
```
- `curl -sL`: Silent fetch, follows redirects.
- `sed 's/<[^>]*>//g'`: Strips all HTML tags, leaving raw text.
- `awk '{$1=$1;print}'`: Collapses whitespace.

Artist names appeared inline in the stripped text alongside exhibition titles and dates, which were filtered out manually.

### 4b. Python regex on embedded JSON
Island's site uses Cargo (a CMS that embeds page data as JSON in `<script>` tags). A Python one-liner extracted the `"excerpt"` fields from this JSON blob, which contained the artist roster in raw HTML form:
```bash
curl -sL "https://island83.gallery/artists" | python3 -c "
import sys, re
html = sys.stdin.read()
names = re.findall(r'\"excerpt\":\"([^\"]+)\"', html)
for n in names: print(n[:200])
"
```
The `excerpt` field contained the embedded artist list, which was then parsed manually.

---

## Step 5: CSV Construction

All extracted names were written to `data/artists.csv` with three columns:

```
Gallery,Artist,Website
```

- **Gallery**: The gallery name exactly as used publicly.
- **Artist**: Full name as listed on the gallery site.
- **Website**: Left blank initially (artist website lookup was blocked by capacity limits).

The file was built incrementally:
1. Initial file created with Luhring Augustine, Magenta Plains, and Tanya Bonakdar data.
2. Sanatorium, 56 Henry, and Europa appended in a second pass.
3. International Waters and Island appended in a final pass.

---

## Step 6: Verification

A shell command confirmed the final count and breakdown:

```bash
tail -n +2 data/artists.csv | grep -v '^$' | cut -d',' -f1 | sort | uniq -c | sort -rn
```

**Result: 207 artists across 8 galleries.**

---

## Known Gaps & Limitations

| Issue | Cause |
|---|---|
| Artist websites column is empty | Browser subagent hit 503 capacity limits before the lookup pass |
| Island artist list may be incomplete | Site uses Cargo CMS with JS rendering; only the `excerpt` JSON blob was accessible via curl |
| International Waters names include collaborators | The site lists artists per exhibition, not as a formal roster; collaborators and collective members are included |
| Luhring Augustine includes "Works by" artists | The browser agent captured both represented and estate/guest artists from the gallery's full listing |
