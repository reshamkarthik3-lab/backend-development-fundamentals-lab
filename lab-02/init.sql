-- Lab 2: SQLite database and CRUD routes.
-- Creates the book table and inserts the 10 starting rows.
-- Run with the SQLite CLI:  sqlite3 books.db < init.sql
-- Or without the CLI:       npm run seed -- --reset

CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price INTEGER NOT NULL,
  pages INTEGER NOT NULL
);

INSERT INTO book (title, author, price, pages) VALUES
  ('Atomic Habits', 'James Clear', 499, 320),
  ('The Alchemist', 'Paulo Coelho', 299, 208),
  ('Wings of Fire', 'A.P.J. Abdul Kalam', 350, 180),
  ('Deep Work', 'Cal Newport', 450, 304),
  ('Rich Dad Poor Dad', 'Robert Kiyosaki', 399, 336),
  ('Ikigai', 'Hector Garcia', 320, 208),
  ('Think and Grow Rich', 'Napoleon Hill', 250, 238),
  ('The Power of Habit', 'Charles Duhigg', 420, 371),
  ('Zero to One', 'Peter Thiel', 400, 224),
  ('Clean Code', 'Robert C. Martin', 850, 464);
