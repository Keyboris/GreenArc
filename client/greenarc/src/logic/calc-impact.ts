import { area } from '@turf/turf';
import type {
  DrawnPolygon,
  GeoPolygonFeature,
} from '../types/app-types';

const TREES_PER_M2 = 1 / 50;
const COOLING_PER_TREE = 0.003;

export const derivePolygonImpact = (
  polygonFeature: GeoPolygonFeature,
): Pick<DrawnPolygon, 'areaM2' | 'treeCount' | 'cooling'> => {
  const areaM2 = area(polygonFeature);
  const treeCount = Math.floor(areaM2 * TREES_PER_M2);
  const cooling = treeCount * COOLING_PER_TREE;

  return {
    areaM2,
    treeCount,
    cooling,
  };
};
