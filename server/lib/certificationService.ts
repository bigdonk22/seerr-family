export interface MovieCertification {
  certification: string;
  country: string;
}

export interface TvCertification {
  rating: string;
  country: string;
}

export class CertificationService {
  public static getMovieCertification(movie: {
    release_dates?: {
      results?: {
        iso_3166_1: string;
        release_dates: {
          certification: string;
        }[];
      }[];
    };
  }): MovieCertification | null {
    const us = movie.release_dates?.results?.find((r) => r.iso_3166_1 === 'US');

    if (!us) {
      return null;
    }

    const release = us.release_dates.find((r) => r.certification.length > 0);

    if (!release) {
      return null;
    }

    return {
      certification: release.certification,
      country: 'US',
    };
  }

  public static getTvCertification(show: {
    content_ratings?: {
      results?: {
        iso_3166_1: string;
        rating: string;
      }[];
    };
  }): TvCertification | null {
    const us = show.content_ratings?.results?.find(
      (r) => r.iso_3166_1 === 'US'
    );

    if (!us) {
      return null;
    }

    return {
      rating: us.rating,
      country: 'US',
    };
  }
}

export const certificationService = new CertificationService();
