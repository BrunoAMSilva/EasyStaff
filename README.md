# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Song notation schema (editor linting)

This project includes a JSON Schema to validate the small song objects used by the piano app. The schema is at `schemas/song.schema.json` and validates the shape used in `src/pages/index.astro` (an example notation is included in the schema). The notation string accepts tokens such as:

- `do`, `re`, `mi` — single notes (1 beat)
- `do-`, `do--` — notes extended by trailing dashes (extra beats)
- `do-chord`, `do-chord-` — chords (optionally extended by dashes)
- `[do mi-]` — bracketed simultaneous notes (group uses the longest inner duration)
- `.` — rest (one beat)

If you use VS Code, the included `.vscode/settings.json` registers the schema for files that match `songs/*.json` and `*.song.json` in the workspace so you get linting and completion when authoring new song files.

Note: the parser in `src/utils/notation-parser.ts` drives the exact runtime behavior — there is a small parser caveat around chord tokens with trailing dashes (the parser checks for tokens that strictly end with `-chord`). The schema aims to be permissive for developers while preventing obvious format errors.

