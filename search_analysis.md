# Analysis of Search Functionality

This document outlines the current state of the search feature, identifies key issues, and provides recommendations for implementation.

## Newer Search Functionality

This React component creates a **searchable artwork table** with the following features:

**Core Functionality:**
- Fetches artwork data from `/api/artworks` when user clicks "Search"
- Filters the API results based on user's search query
- Only displays the table after a search is performed

**User Interface:**
- Search input field with a search button
- Responsive table showing: Artist, Primary Medium, Secondary Medium, Price Range, and ID
- Loading spinner and error handling
- "No results" message when filters don't match anything

**Search Behavior:**
- Case-insensitive filtering across all table columns (artist, mediums, price, ID)
- Empty search shows all results
- Real-time input updating with search-on-demand

**State Management:**
- `artworks`: Stores filtered results
- `loading`: Controls loading state during API call
- `error`: Handles API errors
- `searched`: Tracks if search has been performed
- `searchQuery`: Current search input value

Essentially, it's a "search-first" version of a data table that loads and filters API data on user demand rather than automatically on page load.

## Current Search Workflow

The backend infrastructure for a search API is in place. The following diagram illustrates how the data flows from the frontend to the database and back.

```mermaid
sequenceDiagram
    participant User
    participant Browser (Frontend)
    participant Next.js Server (Backend)
    participant Database

    User->>Browser (Frontend): Enters search term in UI
    Browser (Frontend)->>Next.js Server (Backend): Sends GET request to /api/search?searchDB=[term]
    Next.js Server (Backend)->>Database: Executes Prisma query on `mytable`
    Database-->>Next.js Server (Backend): Returns matching artwork records
    Next.js Server (Backend)-->>Browser (Frontend): Responds with search results in JSON format
    Browser (Frontend)->>User: Renders and displays the search results