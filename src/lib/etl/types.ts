export type OfficialSourceType = 'OFFICIAL_SINPAD' | 'OFFICIAL_SENAMHI' | 'OFFICIAL_SUTRAN';
export type IncidentSeverity = 'critical' | 'high' | 'moderate' | 'low';
export type IncidentCategory = 'HUAYCO' | 'INUNDACION' | 'CORTE_VIA' | 'DESBORDE' | 'LLUVIA_INTENSA';

export interface CanonicalOfficialEvent {
  source: OfficialSourceType;
  sourceEventId: string;
  codeSinpad?: string;
  category: IncidentCategory;
  title: string;
  description: string;
  severity: IncidentSeverity;
  wktGeometry: string; // e.g. 'POINT(-76.9854 -11.9342)' or 'POLYGON(...) ' or 'LINESTRING(...)'
  confirmedAt: string; // ISO 8601
  affectedKm?: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface ETLSyncResult {
  source: OfficialSourceType;
  extractedCount: number;
  insertedCount: number;
  updatedCount: number;
  errorsCount: number;
  timestamp: string;
}
