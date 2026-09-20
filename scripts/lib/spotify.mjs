import { parseCSV, countBy, topN, round } from "./csv.mjs";

/**
 * Archive A — 149,860 listening events, 2013-2024.
 *
 * Timestamps in the source are UTC (per the dataset's own data dictionary), so
 * every hour-of-day figure produced here is UTC. The UI exposes a timezone
 * offset control rather than us guessing the subject's location.
 */

const NIGHT_HOURS = new Set([22, 23, 0, 1, 2, 3, 4]);

/** A track played this many times in a single day counts as an obsession. */
const OBSESSION_THRESHOLD = 8;
/** Plays in one night session before it counts as a vigil. */
const VIGIL_THRESHOLD = 40;
/** Plays in one calendar day before it counts as a binge. */
const BINGE_THRESHOLD = 150;
/** Days of silence before a play counts as a return. */
const SILENCE_DAYS = 30;
/** An artist must reach this many lifetime plays for its first play to matter. */
const DISCOVERY_MIN_LIFETIME = 25;

/** @typedef {{ts:string, date:string, year:string, hour:number, ms:number, track:string, artist:string, album:string, platform:string, skipped:boolean, shuffle:boolean}} Play */

/** Parse the raw CSV into normalized play events. @returns {Play[]} */
export function readPlays(csvText) {
  return parseCSV(csvText)
    .filter((r) => r.ts && r.track_name && r.artist_name)
    .map((r) => ({
      // Normalise the separator to "T". The source uses a space, but derived
      // moments below are emitted with "T", and " " sorts before "T" — mixing
      // them makes a lexical sort disagree with chronological order for records
      // on the same date, which silently breaks the binary-searched connection
      // window downstream.
      ts: r.ts.replace(" ", "T"),
      date: r.ts.slice(0, 10),
      year: r.ts.slice(0, 4),
      hour: Number(r.ts.slice(11, 13)),
      ms: Number(r.ms_played) || 0,
      track: r.track_name,
      artist: r.artist_name,
      album: r.album_name,
      platform: r.platform,
      skipped: r.skipped === "TRUE",
      shuffle: r.shuffle === "TRUE",
    }))
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

/** Headline totals for the whole archive. */
export function summarize(plays) {
  const ms = plays.reduce((sum, p) => sum + p.ms, 0);
  const night = plays.filter((p) => NIGHT_HOURS.has(p.hour)).length;
  return {
    plays: plays.length,
    hours: round(ms / 3.6e6),
    days: round(ms / 8.64e7, 1),
    tracks: new Set(plays.map((p) => p.track + "|" + p.artist)).size,
    artists: new Set(plays.map((p) => p.artist)).size,
    albums: new Set(plays.map((p) => p.album)).size,
    skipRate: round((plays.filter((p) => p.skipped).length / plays.length) * 100, 1),
    nightShare: round((night / plays.length) * 100, 1),
    platforms: countBy(plays, (p) => p.platform),
    first: plays[0].ts,
    last: plays[plays.length - 1].ts,
  };
}

/** Plays per hour-of-day (UTC), index 0-23. */
export function hourHistogram(plays) {
  const hours = new Array(24).fill(0);
  for (const p of plays) hours[p.hour]++;
  return hours;
}

/** Per-year rollup used by the chapter detector and the year scrubber. */
export function byYear(plays) {
  const groups = {};
  for (const p of plays) (groups[p.year] ||= []).push(p);

  return Object.keys(groups)
    .sort()
    .map((year) => {
      const list = groups[year];
      const ms = list.reduce((s, p) => s + p.ms, 0);
      const artists = countBy(list, (p) => p.artist);
      return {
        year,
        plays: list.length,
        hours: round(ms / 3.6e6),
        artists: new Set(list.map((p) => p.artist)).size,
        topArtists: topN(artists, 5).map(([name, count]) => ({ name, count })),
        topTracks: topN(countBy(list, (p) => `${p.track} — ${p.artist}`), 5).map(
          ([name, count]) => ({ name, count }),
        ),
        nightShare: round(
          (list.filter((p) => NIGHT_HOURS.has(p.hour)).length / list.length) * 100,
          1,
        ),
        skipRate: round((list.filter((p) => p.skipped).length / list.length) * 100, 1),
        hours24: (() => {
          const h = new Array(24).fill(0);
          for (const p of list) h[p.hour]++;
          return h;
        })(),
      };
    });
}

/** Plays and minutes per calendar day — drives the density ribbon. */
export function byDay(plays) {
  const days = {};
  for (const p of plays) {
    const d = (days[p.date] ||= { date: p.date, plays: 0, ms: 0 });
    d.plays++;
    d.ms += p.ms;
  }
  return Object.values(days)
    .map((d) => ({ date: d.date, plays: d.plays, minutes: round(d.ms / 60000) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Turn 149,860 undifferentiated plays into a few thousand *moments* worth
 * showing. A raw play is not a receipt; a first encounter, an obsession, a
 * 4am vigil or a return after silence is.
 *
 * @returns {Array<object>} receipt records in the shared Receipt shape
 */
export function extractMoments(plays) {
  const moments = [];
  const lifetime = countBy(plays, (p) => p.artist);

  // ── Discovery: first ever play of an artist that later mattered ──────────
  const seen = new Set();
  for (const p of plays) {
    if (seen.has(p.artist)) continue;
    seen.add(p.artist);
    if (lifetime[p.artist] < DISCOVERY_MIN_LIFETIME) continue;
    moments.push({
      id: `disc-${moments.length}`,
      kind: "discovery",
      ts: p.ts,
      title: p.artist,
      subtitle: "first encounter",
      detail: `Opened with “${p.track}”. Played ${lifetime[p.artist].toLocaleString()} times since.`,
      weight: Math.min(1, lifetime[p.artist] / 3000),
      tags: ["music", "discovery", p.artist],
      source: "listening",
    });
  }

  // ── Obsession: one track on repeat inside a single day ───────────────────
  const perDayTrack = {};
  for (const p of plays) {
    const key = `${p.date}|${p.track}|${p.artist}`;
    (perDayTrack[key] ||= { p, n: 0 }).n++;
  }
  for (const { p, n } of Object.values(perDayTrack)) {
    if (n < OBSESSION_THRESHOLD) continue;
    moments.push({
      id: `obs-${moments.length}`,
      kind: "obsession",
      ts: p.ts,
      title: p.track,
      subtitle: p.artist,
      detail: `Played ${n} times in one day.`,
      weight: Math.min(1, n / 30),
      tags: ["music", "obsession", p.artist],
      source: "listening",
    });
  }

  // ── Vigil: a dense session that ran through the small hours ──────────────
  const perDayNight = {};
  for (const p of plays) {
    if (!NIGHT_HOURS.has(p.hour)) continue;
    (perDayNight[p.date] ||= []).push(p);
  }
  for (const [date, list] of Object.entries(perDayNight)) {
    if (list.length < VIGIL_THRESHOLD) continue;
    const ms = list.reduce((s, p) => s + p.ms, 0);
    const top = topN(countBy(list, (p) => p.artist), 1)[0];
    moments.push({
      id: `vig-${moments.length}`,
      kind: "vigil",
      ts: `${date}T02:00:00`,
      title: `${round(ms / 3.6e6, 1)} hours after dark`,
      subtitle: top ? `mostly ${top[0]}` : "unattributed",
      detail: `${list.length} plays between 22:00 and 05:00 UTC.`,
      weight: Math.min(1, list.length / 200),
      tags: ["music", "vigil", "night", top?.[0]].filter(Boolean),
      source: "listening",
    });
  }

  // ── Binge: an entire day given over to listening ─────────────────────────
  const perDay = {};
  for (const p of plays) (perDay[p.date] ||= []).push(p);
  for (const [date, list] of Object.entries(perDay)) {
    if (list.length < BINGE_THRESHOLD) continue;
    const top = topN(countBy(list, (p) => p.artist), 1)[0];
    moments.push({
      id: `bng-${moments.length}`,
      kind: "binge",
      ts: `${date}T12:00:00`,
      title: `${list.length} plays in one day`,
      subtitle: top ? top[0] : "unattributed",
      detail: `${round(list.reduce((s, p) => s + p.ms, 0) / 3.6e6, 1)} hours of music.`,
      weight: Math.min(1, list.length / 400),
      tags: ["music", "binge", top?.[0]].filter(Boolean),
      source: "listening",
    });
  }

  // ── Return: the archive goes quiet, then wakes up ────────────────────────
  for (let i = 1; i < plays.length; i++) {
    const gap =
      (Date.parse(plays[i].ts.replace(" ", "T") + "Z") -
        Date.parse(plays[i - 1].ts.replace(" ", "T") + "Z")) /
      8.64e7;
    if (gap < SILENCE_DAYS) continue;
    moments.push({
      id: `ret-${moments.length}`,
      kind: "return",
      ts: plays[i].ts,
      title: `After ${Math.round(gap)} days of silence`,
      subtitle: plays[i].artist,
      detail: `The archive resumes with “${plays[i].track}”.`,
      weight: Math.min(1, gap / 365),
      tags: ["music", "silence", "return"],
      source: "listening",
    });
  }

  return moments.sort((a, b) => a.ts.localeCompare(b.ts));
}
