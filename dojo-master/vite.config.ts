import { defineConfig } from 'vite';

// Relative Basis, damit der Build aus jedem Unterverzeichnis statisch ausgeliefert werden kann.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});
