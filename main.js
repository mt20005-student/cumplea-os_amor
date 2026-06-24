import { pagesData } from './data.js';
import { Book } from './Book.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inicialización global del libro romántico musical animado y decorado
  const romanticBook = new Book('book', pagesData);
});