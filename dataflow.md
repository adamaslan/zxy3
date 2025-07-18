# `pastshows.js` Component Interactions

This document outlines the user interactions and data flow within the `pastshows.js` component.

## State Management

The component uses the `useState` hook to manage its state, which includes:
- `search`: A string that holds the user's input in the search field.
- `searchResults`: An array that stores the results from the API search.

## User Interactions

### 1. Search Input

- **Element**: An `<input>` field.
- **Action**: When a user types into the search field, the `handleChange` function is triggered.
- **Functionality**: `handleChange` updates the `search` property in the component's state with the current value of the input field. This is a controlled component.

### 2. Search Submission

- **Element**: A `<form>` element with a `submit` button.
- **Action**: When the user clicks the "Search" button or submits the form, the `handleSearch` function is executed.
- **Functionality**:
    1. It prevents the default form submission behavior.
    2. It makes an asynchronous `fetch` request to the `/api/search` endpoint.
    3. The `search` term from the state is passed as a query parameter (`searchDB`).
    4. Upon receiving a successful response, it parses the JSON and updates the `searchResults` state with the returned data.
    5. If there's an error during the fetch, it's logged to the console, and the `searchResults` are cleared.

## Data Fetching

### Server-Side Rendering (`getServerSideProps`)

- **Action**: Before the page is rendered on the server, `getServerSideProps` is called.
- **Functionality**:
    1. It calls the `getAllUsers` function from `components/Search2.js` to fetch initial data.
    2. The results are processed to ensure each item has an `id`.
    3. The processed data is passed as `props` to the `PastShows` component, although it doesn't seem to be directly used in the rendered JSX for the initial list of shows.

### Client-Side Fetching (`handleSearch`)

- **Action**: Triggered by the user submitting the search form.
- **Functionality**: Fetches data from `/api/search` based on the user's query and updates the UI dynamically to display the results.

## Rendering

- **Initial Render**: The page displays a static list of past shows from different years (2024, 2023, 2022).
- **Dynamic Content**: After a search is performed and results are available (`state.searchResults.length > 0`), a "Search Results" section is rendered, listing the `artist` and `medium` for each result.
- **Navigation**: The component includes a `Link` from `next/link` to navigate back to the home page.


# data flow

# Database Data Flow

This document outlines the flow of data from the database to the frontend components in this Next.js application.

## 1. Database Schema

- **Technology**: Prisma with a CockroachDB backend.
- **Schema File**: `prisma/schema.prisma`
- **Model**: The `mytable` model defines the structure of the artwork data, including fields like `artist`, `medium1`, `medium2`, `price_range`, and a unique `id`.

## 2. API Endpoints

The application uses API routes in the `pages/api` directory to expose database queries to the frontend.

### `GET /api/artworks`

- **File**: `pages/api/artworks.js`
- **Functionality**: 
    - Fetches all records from the `mytable` table.
    - Selects specific fields (`id`, `artist`, `medium1`, `medium2`, `price_range`).
    - Serializes the `BigInt` `id` to a string to make it compatible with JSON.
    - Returns an array of all artworks.

### `GET /api/search`

- **File**: `pages/api/search.js`
- **Functionality**:
    - Takes a `searchDB` query parameter.
    - If `searchDB` is empty, it returns all artworks.
    - If `searchDB` has a value, it performs a case-insensitive search across the `artist`, `medium1`, and `medium2` fields.
    - Returns an array of artworks that match the search criteria.

## 3. Data Consumption in Components

### `components/db-magic.js` (`ArtworkTable` component)

- **Data Flow**: Client-side fetching.
- **Interaction**:
    1. On component mount (`useEffect`), it sends a `fetch` request to the `/api/artworks` endpoint.
    2. The fetched artwork data is stored in the `artworks` state.
    3. The component renders this data in an HTML table.
    4. It also handles loading and error states during the fetch.

### `pages/posts/pastshows.js` (`PastShows` component)

This component uses two methods for fetching data:

#### a. Server-Side Rendering (`getServerSideProps`)

- **Data Flow**: Server-side fetching for initial page load.
- **Interaction**:
    1. Before the page is rendered, `getServerSideProps` calls `getAllUsers()` from `components/Search2.js`.
    2. `getAllUsers()` directly queries the database using Prisma to get all records from `mytable`.
    3. The results are passed as props to the `PastShows` component. (Note: The component does not appear to use these initial `results` props in its rendered output).

#### b. Client-Side Search (`handleSearch`)

- **Data Flow**: Client-side fetching based on user interaction.
- **Interaction**:
    1. When a user submits the search form, the `handleSearch` function is triggered.
    2. It sends a `fetch` request to the `/api/search` endpoint with the user's query.
    3. The results are stored in the `searchResults` state and dynamically rendered below the search form.

## Summary Diagram

Here is a diagram illustrating the complete data flow from the database to the end-user's browser.

```mermaid
graph TD
    subgraph Browser
        A[React Components: ArtworkTable, PastShows]
    end

    subgraph "Next.js Server / Backend"
        B[API Routes: /api/artworks, /api/search]
        C[getServerSideProps in pastshows.js]
        D[Prisma Client]
    end

    subgraph Database
        E[CockroachDB: mytable]
    end

    A -- "1. Client-side fetch /api/artworks (on mount)" --> B
    A -- "2. Client-side fetch /api/search (on user search)" --> B
    B -- "3. API uses Prisma to query DB" --> D
    C -- "4. Server-side function calls Prisma directly" --> D
    D -- "5. Prisma sends SQL to Database" --> E
