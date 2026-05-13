# Component Summary

This document provides a summary of the React components found in the `/components` directory.

## `Search2.js`

- **Purpose**: Provides a function to fetch data from the database.
- **Exports**: `getAllUsers`
- **Description**: This asynchronous function connects to a Prisma database and retrieves all records from the `mytable` table. It includes error handling.

## `SplashRandom.js`

- **Purpose**: A 3D animated splash screen.
- **Technology**: Uses `react-three-fiber` and `drei`.
- **Description**: This component renders a canvas with a red, metallic sphere that both rotates on its own axis and revolves around the center of the screen. The text "ZXY" is attached to the sphere.

## `SplashScreen.js`

- **Purpose**: Another 3D animated splash screen.
- **Technology**: Uses `react-three-fiber` and `drei`.
- **Description**: Similar to `SplashRandom.js`, this component displays a silver, metallic sphere that rotates and revolves. It also features the text "ZXY". The positioning and dimensions are slightly different from `SplashRandom.js`.

## `db-magic.js`

- **Purpose**: Displays a table of artworks.
- **Component Name**: `ArtworkTable`
- **Description**: This component fetches a list of artworks from the `/api/artworks` endpoint and displays them in a formatted table. It handles loading and error states. The table shows the artist, primary and secondary medium, price range, and ID for each artwork.

## `layout.js`

- **Purpose**: A basic layout wrapper for pages.
- **Description**: This component wraps its children in a `div` with a specific class for styling. It also integrates Google Tag Manager into the application.

## `splash.js`

- **Purpose**: Intended as a splash screen, but currently inactive.
- **Description**: This component contains commented-out code for a `react-three-fiber` splash screen featuring a rotating cube. In its current state, it renders nothing.