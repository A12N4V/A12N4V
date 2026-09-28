// Collect the GitHub numbers for plate IV (PVLSVS) into tools/plates/pulse.json.
//   GITHUB_TOKEN=... node tools/plates/fetch-pulse.js [login]
//   node tools/plates/fetch-pulse.js --mock        # synthetic year, for local renders
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'pulse.json');
const args = process.argv.slice(2);
const login = args.find((a) => !a.startsWith('--')) || process.env.LOGIN || 'A12N4V';

const QUERY = `query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }
      }
    }
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } }
    }
  }
}`;

function summarize({ days, repos, followers }) {
  const counts = days.map((d) => d.c);
  let longest = 0, run = 0;
  for (const c of counts) { run = c > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  // today may not have a contribution yet; the streak is still alive if yesterday did
  let i = counts.length - 1, streak = 0;
  if (counts[i] === 0) i--;
  while (i >= 0 && counts[i] > 0) { streak++; i--; }
  const bytes = {};
  for (const r of repos) for (const e of r.languages) bytes[e.name] = (bytes[e.name] || 0) + e.size;
  const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  const langs = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, b]) => [n, Math.round((b / total) * 100)]);
  return {
    login,
    generated: new Date().toISOString().slice(0, 10),
    total: counts.reduce((a, b) => a + b, 0),
    days,
    streak,
    longest,
    repos: repos.length,
    stars: repos.reduce((a, r) => a + r.stars, 0),
    followers,
    langs,
  };
}

async function live() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'a12n4v-plates' },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(JSON.stringify(body.errors || body));
  const u = body.data.user;
  const days = u.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ d: d.date, c: d.contributionCount }));
  const repos = u.repositories.nodes.map((r) => ({
    stars: r.stargazerCount,
    languages: r.languages.edges.map((e) => ({ name: e.node.name, size: e.size })),
  }));
  return summarize({ days, repos, followers: u.followers.totalCount });
}

function mock() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const days = [], end = new Date(), start = new Date(end);
  start.setDate(end.getDate() - 370 - end.getDay());
  for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
    const burst = Math.sin(days.length / 23) > 0.2 ? 3 : 1;
    const c = rnd() < 0.35 ? 0 : Math.floor(rnd() * 6 * burst);
    days.push({ d: t.toISOString().slice(0, 10), c });
  }
  const L = [['TypeScript', 9e5], ['Python', 6e5], ['JavaScript', 2e5], ['Jupyter Notebook', 1.2e5], ['CSS', 6e4]];
  const repos = [{ stars: 14, languages: L.map(([name, size]) => ({ name, size })) }, ...Array.from({ length: 23 }, () => ({ stars: 1, languages: [] }))];
  return summarize({ days, repos, followers: 42 });
}

(async () => {
  const data = args.includes('--mock') ? mock() : await live();
  fs.writeFileSync(OUT, JSON.stringify(data));
  console.log(`pulse: ${data.total} contributions, streak ${data.streak}, longest ${data.longest}, ${data.repos} repos -> ${path.relative(process.cwd(), OUT)}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
