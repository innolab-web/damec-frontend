import type { Feature, FeatureCollection, Point, LineString, Polygon } from 'geojson';

export type DamecSeverity = 'critical' | 'high' | 'moderate' | 'low';

export type DamecSourceType = 'OFFICIAL_SINPAD' | 'OFFICIAL_SENAMHI' | 'OFFICIAL_SUTRAN' | 'CITIZEN_CLUSTER';

export type DamecIncidentCategory = 'HUAYCO' | 'INUNDACION' | 'CORTE_VIA' | 'DESBORDE' | 'LLUVIA_INTENSA';

export interface DamecIncidentProperties {
  id: string;
  codeSinpad?: string;
  category: DamecIncidentCategory;
  title: string;
  description: string;
  severity: DamecSeverity;
  source: DamecSourceType;
  ubigeo: string;
  region: string;
  province: string;
  district: string;
  confirmedAt: string; // ISO 8601
  updatedAt: string;   // ISO 8601
  confidenceScore: number; // 0.00 a 1.00
  affectedKm?: number;
  reportsCount?: number;
  isActive: boolean;
}

// Punto: Incidente puntual o cluster ciudadano
export type DamecPointFeature = Feature<Point, DamecIncidentProperties>;

// Línea: Vía afectada o tramo de carretera cortado
export type DamecLineFeature = Feature<LineString, DamecIncidentProperties>;

// Polígono: Cuenca en alerta o área de inundación
export type DamecPolygonFeature = Feature<Polygon, DamecIncidentProperties>;

export type DamecFeature = DamecPointFeature | DamecLineFeature | DamecPolygonFeature;

export type DamecGeoJSON = FeatureCollection<Point | LineString | Polygon, DamecIncidentProperties>;

export interface LayerFilterState {
  severities: Set<DamecSeverity>;
  sources: Set<DamecSourceType>;
  categories: Set<DamecIncidentCategory>;
  minConfidence: number;
}
