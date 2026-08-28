# WPR Front Debugging tool legacy

A browsers extension tool to debug WP Rocket WordPress plugin.

## Development Setup

### Prerequisites

Install [Node.js](https://nodejs.org/en) which includes [Node Package Manager (NPM)](https://docs.npmjs.com/getting-started)

### Libraries and Technologies used (Knowledge required)

- [Typescript](https://www.typescriptlang.org/)
- [WXT](https://wxt.dev/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)

### Setting Up the Project

- Clone the repository
- Run `npm install`

### Development

- Run `npm run dev` to start the development server (Watch mode and hot reload). Make sure to load the folder `.output/chrome-mv3` in your browser ([Follow these steps](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)).
- Run `npm run build` to create a production and optimized build
- Run `npm run zip` to do the same as `npm run build` but automatically creating the zip file to upload to Chrome Web Store

## Contributions

This project uses [Husky](https://typicode.github.io/husky/) and [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/). If the commit doesn't follow these rules, they will be rejected automatically by husky. So, _please_ check conventional commits documentations to know how to use it.

This already uses git hooks with husky to format code, make sure to not force different formating, use the rules in prettier (Check them in: `.prettierrc`)

This project uses [Semantic Versioning](https://semver.org/). Please make sure to follow the rules when the version needs to be updated (Every new upload to the Chrome Web Store requires the version to be updated).

## Author

Sandy Figueroa: [Github](https://github.com/sandyfzu)

## Documentation (TODO)

- Project Structure: TODO (Mainly [WXT](https://wxt.dev/) structure)
