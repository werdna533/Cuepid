/**
 * TypeScript declaration file for font imports
 * Allows importing .otf, .ttf, .woff, and .woff2 font files as modules
 */

declare module "*.otf" {
  const content: string;
  export default content;
}

declare module "*.ttf" {
  const content: string;
  export default content;
}

declare module "*.woff" {
  const content: string;
  export default content;
}

declare module "*.woff2" {
  const content: string;
  export default content;
}
