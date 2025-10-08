// inspiration.js — LovingSmiles Quote of the Day

// Local storage keys
const QUOTE_KEY = 'lovingSmiles_daily_quote_v1';
const CUSTOM_QUOTES_KEY = 'lovingSmiles_custom_quotes_v1';
const QUOTE_DATE_KEY = 'lovingSmiles_quote_date_v1';

// 🧠 Load quotes (from JSON + user-added)
async function loadQuotes() {
  try {
    const response = await fetch('inspiration.json');
    const baseQuotes = await response.json();
    const customQuotes = JSON.parse(localStorage.getItem(CUSTOM_QUOTES_KEY) || '[]');
    return [...baseQuotes, ...customQuotes];
  } catch (err) {
    console.error('Error loading quotes:', err);
    return [{ text: 'Be kind, always.', author: 'LovingSmiles' }];
  }
}

// 🎯 Get the daily quote (refreshes every 24 hours)
async function getQuoteOfTheDay() {
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = localStorage.getItem(QUOTE_DATE_KEY);
  const savedQuote = localStorage.getItem(QUOTE_KEY);

  // If it’s the same day, reuse the existing quote
  if (lastDate === today && savedQuote) {
    return JSON.parse(savedQuote);
  }

  const quotes = await loadQuotes();
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  localStorage.setItem(QUOTE_KEY, JSON.stringify(randomQuote));
  localStorage.setItem(QUOTE_DATE_KEY, today);
  return randomQuote;
}

// 🖋️ Render the quote on the page
async function renderQuote() {
  const q = await getQuoteOfTheDay();
  const box = document.getElementById('quoteBox');
  if (!box) return;

  box.innerHTML = `
    <div class="quote-text">“${q.text}”</div>
    <div class="quote-author">— ${q.author}</div>
  `;
}

// 💬 Allow users to add their own quote
function setupAddQuoteForm() {
  const form = document.getElementById('addQuoteForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const text = document.getElementById('quoteText').value.trim();
    const author = document.getElementById('quoteAuthor').value.trim() || 'Anonymous';

    if (!text) {
      alert('Please enter a quote before submitting.');
      return;
    }

    const customQuotes = JSON.parse(localStorage.getItem(CUSTOM_QUOTES_KEY) || '[]');
    customQuotes.push({ text, author });
    localStorage.setItem(CUSTOM_QUOTES_KEY, JSON.stringify(customQuotes));

    alert('✅ Thank you! Your quote has been added to inspire others.');
    form.reset();
  });
}

// 🚀 Initialize
window.addEventListener('DOMContentLoaded', () => {
  renderQuote();
  setupAddQuoteForm();
});