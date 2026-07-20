/**
 * Family content filtering for Seerr.
 *
 * Central location for all family-safe filtering.
 * The filter itself knows nothing about where settings come from.
 */

import TheMovieDb from '@server/api/themoviedb';
import { getSettings, type FamilyFilterSettings } from '@server/lib/settings';
import { CertificationService } from './certificationService';

/**
 * Interface for retrieving family filter settings.
 *
 * Today this simply returns defaults.
 * Tomorrow it can load from the database without changing the
 * filtering logic.
 */
export interface FamilyFilterProvider {
  getSettings(): FamilyFilterSettings;
}

export interface TmdbResult {
  id: number;
  media_type?: string;
  adult?: boolean;
  title?: string;
  name?: string;
  genre_ids?: number[];
  release_dates?: any;
  content_ratings?: any;
}

/**
 * Current provider.
 *
 * Eventually this will become a database-backed provider.
 */
export class DefaultFamilyFilterProvider implements FamilyFilterProvider {
  public getSettings(): FamilyFilterSettings {
    return getSettings().familyFilter;
  }
}

const defaultFamilyFilterProvider = new DefaultFamilyFilterProvider();

/**
 * Main entry point.
 */
export async function filterResults<T extends TmdbResult>(
  results: T[],
  provider: FamilyFilterProvider = defaultFamilyFilterProvider
): Promise<T[]> {
  const settings = provider.getSettings();

  if (!settings.enabled) {
    return results;
  }

  const filtered: T[] = [];

  for (const item of results) {
    if (!filterAdult(item, settings)) {
      continue;
    }

    if (!(await filterMovieRatings(item, settings))) {
      continue;
    }

    if (!(await filterTvRatings(item, settings))) {
      continue;
    }

    filtered.push(item);
  }

  console.log(
    `[FamilyFilter] Filtered ${results.length} -> ${filtered.length}`
  );

  return filtered;
}

/**
 * Filter TMDb's adult flag.
 */
function filterAdult(
  item: TmdbResult,
  settings: FamilyFilterSettings
): boolean {
  return settings.allowAdult || !item.adult;
}

/**
 * Placeholder for movie certification filtering.
 */
async function filterMovieRatings(
  item: TmdbResult,
  settings: FamilyFilterSettings
): Promise<boolean> {
  if (item.media_type !== 'movie') {
    return true;
  }

  const tmdb = new TheMovieDb();

  const details = await tmdb.getMovie({
    movieId: item.id,
  });

  const rating = CertificationService.getMovieCertification(details);

  if (!rating) {
    return !settings.blockUnratedMovies;
  }

  // Only allow G, PG, PG-13
  //const allowed = ['G', 'PG', 'PG-13'].includes(rating.certification);
  const allowed = settings.allowedMovieRatings.includes(rating.certification);

  console.log(
    `[FamilyFilter] ${item.title} -> ${rating.certification} -> ${allowed}`
  );

  return allowed;
}

/**
 * Placeholder for TV certification filtering.
 */
async function filterTvRatings(
  item: TmdbResult,
  settings: FamilyFilterSettings
): Promise<boolean> {
  if (item.media_type !== 'tv') {
    return true;
  }

  const tmdb = new TheMovieDb();

  const details = await tmdb.getTvShow({
    tvId: item.id,
  });

  const rating = CertificationService.getTvCertification(details);

  if (!rating) {
    return !settings.blockUnratedTv;
  }

  const allowed = settings.allowedTvRatings.includes(rating.rating);

  console.log(`[FamilyFilter] ${item.name} -> ${rating.rating} -> ${allowed}`);

  return allowed;
}
