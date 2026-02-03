
export enum AppState {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  TRANSFORMING = 'TRANSFORMING',
  RESULT = 'RESULT'
}

export interface HairstyleOption {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  description: string;
}

export interface HairColor {
  id: string;
  name: string;
  hex: string;
  prompt: string;
}

export interface FaceAnalysis {
  faceShape: string;
  jawline: string;
  hairDensity: string;
  recommendations: string[];
}

export interface TransformationResult {
  originalImage: string;
  transformedImage: string;
  style: HairstyleOption;
  color: HairColor;
}
