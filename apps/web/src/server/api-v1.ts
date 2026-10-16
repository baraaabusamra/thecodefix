// apps/web/src/server/api-v1.ts
// 📍 خريطة: الموقع ← طبقة الـ API للموبايل (v1)
//
// Read-only, public content API consumed by the mobile app. Route handlers in
// src/app/api/v1/** stay thin: they call these functions, which read through
// the same @tcf/content readers the website uses (so web and mobile can never
// disagree) and shape the result with the shared @tcf/contracts schemas.

import { getAdjacentLessons, getLesson, getLessons, getTrack, getTracks } from "@tcf/content/tracks";
import lessonDates from "@tcf/content/lesson-dates";
import { DEFAULT_LOCALE } from "@tcf/content/i18n";
import {
  API_VERSION,
  type ApiError,
  type LessonDetail,
  type TrackDetail,
  type TrackSummary,
} from "@tcf/contracts/api-v1";
import { getClientIp, rateLimit } from "@tcf/core/rate-limit";

const lessonUrl = (track: string, slug: string) => `/learn/${track}/${slug}`;

export async function listTracks(): Promise<TrackSummary[]> {
  const tracks = await getTracks();
  return Promise.all(
    tracks.map(async (t) => ({
      slug: t.slug,
      title: t.title,
      description: t.description,
      icon: t.icon,
      color: t.color,
      order: t.order,
      lessonCount: (await getLessons(t.slug)).length,
      url: `/learn/${t.slug}`,
    }))
  );
}

export async function trackDetail(slug: string): Promise<TrackDetail | null> {
  const track = await getTrack(slug);
  if (!track) return null;
  const lessons = await getLessons(slug);
  return {
    slug: track.slug,
    title: track.title,
    description: track.description,
    icon: track.icon,
    color: track.color,
    order: track.order,
    lessonCount: lessons.length,
    url: `/learn/${track.slug}`,
    lessons: lessons.map((l) => ({ slug: l.slug, title: l.title, description: l.description, order: l.order, url: lessonUrl(slug, l.slug) })),
  };
}

export async function lessonDetail(track: string, slug: string): Promise<LessonDetail | null> {
  const lesson = await getLesson(track, slug);
  if (!lesson) return null;
  const { prev, next } = await getAdjacentLessons(track, slug);
  const dates = lessonDates as Record<string, string>;
  return {
    track,
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
    url: lessonUrl(track, lesson.slug),
    body: lesson.content,
    updated: dates[`${track}/${lesson.slug}`] ?? null,
    previous: prev ? { slug: prev.slug, title: prev.title } : null,
    next: next ? { slug: next.slug, title: next.title } : null,
  };
}

/** `{ data, meta }` with CDN caching — the content changes only on deploy or CMS publish. */
export function ok(data: unknown): Response {
  return Response.json(
    { data, meta: { apiVersion: API_VERSION, locale: DEFAULT_LOCALE, generatedAt: new Date().toISOString() } },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}

export function fail(status: 400 | 404 | 429 | 500, code: ApiError["error"]["code"], message: string): Response {
  const body: ApiError = { error: { code, message } };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Per-IP brake for the public API (per instance; see @tcf/core/rate-limit). */
export async function overLimit(): Promise<boolean> {
  const ip = await getClientIp();
  return !rateLimit(`api-v1:${ip}`, 120, 60_000);
}

export const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
