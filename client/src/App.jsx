import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>ExecutiveHub</h1>
      <p>Server-side routes and React pages coming soon.</p>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
