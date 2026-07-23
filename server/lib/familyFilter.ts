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
    // Adult filter
    if (!filterAdult(item, settings)) {
      continue;
    }

    const mediaType = item.media_type;

    if (mediaType === 'movie') {
      const allowed = await filterMovieRatings(item, settings);

      console.log(
        `[Movie Filter] ${'title' in item ? item.title : item.id} -> ${allowed}`
      );

      if (!allowed) {
        continue;
      }
    }

    if (mediaType === 'tv') {
      const allowed = await filterTvRatings(item, settings);

      console.log(
        `[TV Filter] ${'name' in item ? item.name : item.id} -> ${allowed}`
      );

      if (!allowed) {
        continue;
      }
    }

    filtered.push(item);
  }

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
  let certification: string | undefined;

  // Already have movie details
  if ('release_dates' in item) {
    const rating = CertificationService.getMovieCertification(item);
    certification = rating?.certification;
  } else {
    const tmdb = new TheMovieDb();

    const details = await tmdb.getMovie({
      movieId: item.id,
    });

    const rating = CertificationService.getMovieCertification(details);
    certification = rating?.certification;
  }

  if (!certification) {
    return !settings.blockUnratedMovies;
  }

  const allowed = settings.allowedMovieRatings.includes(certification);

  return allowed;
}

/**
 * Placeholder for TV certification filtering.
 */
async function filterTvRatings(
  item: TmdbResult,
  settings: FamilyFilterSettings
): Promise<boolean> {
  let certification: string | undefined;

  if ('content_ratings' in item) {
    const rating = CertificationService.getTvCertification(item);
    certification = rating?.rating;
  } else {
    const tmdb = new TheMovieDb();

    const details = await tmdb.getTvShow({
      tvId: item.id,
    });

    const rating = CertificationService.getTvCertification(details);
    certification = rating?.rating;
  }

  if (!certification) {
    return !settings.blockUnratedTv;
  }

  const allowed = settings.allowedTvRatings.includes(certification);

  console.log(`[TV Rating] ${item.name} ${certification} allowed=${allowed}`);

  return allowed;
}
