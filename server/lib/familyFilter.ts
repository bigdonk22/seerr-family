/**
 * Family content filtering for Seerr.
 *
 * Central location for all family-safe filtering.
 * The filter itself knows nothing about where settings come from.
 */

import { CertificationService } from './certificationService';

export interface FamilyFilterSettings {
  /**
   * Master enable/disable switch.
   */
  enabled: boolean;

  /**
   * Allow TMDb "adult" results.
   */
  allowAdult: boolean;

  /**
   * Allowed movie certifications.
   */
  allowedMovieRatings: string[];

  /**
   * Allowed TV parental ratings.
   */
  allowedTvRatings: string[];
}

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

/**
 * Default settings.
 */
const defaultSettings: FamilyFilterSettings = {
  enabled: true,

  allowAdult: false,

  allowedMovieRatings: ['G', 'PG', 'PG-13'],

  allowedTvRatings: ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG'],
};

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
    return defaultSettings;
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

  const rating = CertificationService.getMovieCertification(item as any);

  if (!rating) {
    console.log('[FamilyFilter] No movie rating');
    return true;
  }

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

  const rating = CertificationService.getTvCertification(item as any);

  if (!rating) {
    return true;
  }

  return settings.allowedTvRatings.includes(rating.rating);
}
