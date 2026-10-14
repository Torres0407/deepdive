/**
 * API service for leaderboard score submission and retrieval
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchTopScores() {
  try {
    const res = await fetch(`${API_BASE}/scores`, { credentials: 'omit' });
    if (!res.ok) {
      throw new Error(`Failed to fetch scores: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('API error when fetching scores, fallback to local storage:', err);
    return getLocalScores();
  }
}

export async function submitScore(name, maxDepth) {
  const payload = {
    name: name.trim().slice(0, 20),
    maxDepth: Math.max(0, Math.min(6000, Number(maxDepth))),
  };

  try {
    const res = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Submission failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('API error when submitting score, saving to local storage:', err);
    return saveLocalScore(payload.name, payload.maxDepth);
  }
}

function getLocalScores() {
  try {
    const saved = localStorage.getItem('deepdive_scores');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // ignore
  }
  return [
    { id: 1, name: 'Victor Vescovo', maxDepth: 6000, createdAt: '2026-10-14' },
    { id: 2, name: 'Don Walsh', maxDepth: 5920, createdAt: '2026-10-14' },
    { id: 3, name: 'James Cameron', maxDepth: 5880, createdAt: '2026-10-14' },
    { id: 4, name: 'Jacques Cousteau', maxDepth: 4250, createdAt: '2026-10-14' },
    { id: 5, name: 'Sylvia Earle', maxDepth: 3820, createdAt: '2026-10-14' },
  ];
}

function saveLocalScore(name, maxDepth) {
  const list = getLocalScores();
  const newEntry = {
    id: Date.now(),
    name,
    maxDepth,
    createdAt: new Date().toISOString(),
  };
  list.push(newEntry);
  list.sort((a, b) => b.maxDepth - a.maxDepth);
  const top10 = list.slice(0, 10);
  try {
    localStorage.setItem('deepdive_scores', JSON.stringify(top10));
  } catch (e) {
    // ignore
  }
  return newEntry;
}
