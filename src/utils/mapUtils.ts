import * as turf from '@turf/turf';

export interface Coordinates {
    lat: number;
    lng: number;
}

/**
 * Calculates distance between two coordinates in Kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
    const from = turf.point([coord1.lng, coord1.lat]);
    const to = turf.point([coord2.lng, coord2.lat]);
    return turf.distance(from, to, { units: 'kilometers' });
};

/**
 * Heuristic to determine if a transition is "International"
 * For a real app, this would use reverse geocoding or a GeoJSON lookup.
 * Here we use a distance threshold (1000km) as a proxy for "Significant Travel"
 * that warrants a 3D Globe view.
 */
export const isSignificantTravel = (coord1: Coordinates, coord2: Coordinates): boolean => {
    const dist = calculateDistance(coord1, coord2);
    return dist > 1000; 
};

/**
 * Checks if a map transition should be shown (> 70 KM)
 */
export const shouldShowMap = (coord1: Coordinates, coord2: Coordinates): boolean => {
    const dist = calculateDistance(coord1, coord2);
    return dist > 70;
};
