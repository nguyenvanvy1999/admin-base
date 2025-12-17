import type { ILogger } from 'src/config/logger';

export interface GeoIPData {
  status: string;
  message?: string;
  query?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
}

export type GeoIPService = {
  getLocationByIP: (ip: string) => Promise<GeoIPData | null>;
};

export const createGeoIPService = (deps: {
  apiUrl: string;
  logger: ILogger;
}): GeoIPService => {
  const getLocationByIP = async (ip: string): Promise<GeoIPData | null> => {
    try {
      const response = await fetch(`${deps.apiUrl}/${ip}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        deps.logger.warning(
          `GeoIP API request failed for IP ${ip}: ${response.status}`,
        );
        return null;
      }

      const data = (await response.json()) as GeoIPData;

      if (data.status !== 'success') {
        const message = data.message || 'unknown error';
        deps.logger.warning(
          `GeoIP API returned failure for IP ${ip}: ${message}`,
        );
        return null;
      }
      return data;
    } catch (error) {
      deps.logger.error(`Error fetching GeoIP data for IP ${ip}`, {
        error,
      });
      return null;
    }
  };

  return {
    getLocationByIP,
  };
};
