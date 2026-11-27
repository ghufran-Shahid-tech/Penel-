export type ModuleId =
  | 'aim'
  | 'esp'
  | 'overlay'
  | 'movement'
  | 'damage'
  | 'firerate';

export type NavDestination =
  | 'modules'
  | 'connection'
  | 'anticheat'
  | 'source';

export type ApiModuleName =
  | 'AIM_TEST'
  | 'ESP_TEST'
  | 'OVERLAY_TEST'
  | 'MOVEMENT_TEST'
  | 'DAMAGE_TEST'
  | 'FIRE_RATE_TEST';

export type VerdictType = 'DETECTED' | 'FLAGGED' | 'NOMINAL' | 'UNDETECTED_GAP';

export interface DetectionVerdict {
  event_id: string;
  timestamp: string;
  session_id: string;
  module: ApiModuleName;
  verdict: VerdictType;
  rule_id: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latency_ms: number;
  metric_value: number;
  threshold_value: number;
  details: string;
  recommended_action: string | null;
  payload: Record<string, unknown>;
}

export interface GoldFireBuild {
  id: string;
  name: string;
  version: string;
  sdkProtocol: string;
  antiCheatProfile: string;
  endpoint: string;
}

export interface SessionState {
  connected: boolean;
  sessionId: string | null;
  sessionToken: string | null;
  buildId: string;
  buildName: string;
  connectedAt: string | null;
  mode: 'AUTHORIZED_API' | 'LOCAL_SANDBOX';
}

export interface ModuleConfigState {
  enabled: boolean;
  running: boolean;
  params: Record<string, number | boolean | string>;
  results: DetectionVerdict[];
  telemetrySeries: { tick: number; value: number; threshold: number; verdict: VerdictType }[];
}

export interface SourceFileEntry {
  path: string;
  name: string;
  category: string;
  language: string;
  lines: number;
  bytes: number;
  content: string;
}

export interface ModuleParamDescriptor {
  key: string;
  label: string;
  type: 'range' | 'boolean' | 'select';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
}

export interface ModuleDefinition {
  id: ModuleId;
  apiModule: ApiModuleName;
  title: string;
  shortTitle: string;
  subtitle: string;
  accent: 'blue' | 'purple';
  capabilities: string[];
  metricLabel: string;
  metricUnit: string;
  thresholdLabel: string;
  defaultParams: Record<string, number | boolean | string>;
  paramDescriptors: ModuleParamDescriptor[];
}
