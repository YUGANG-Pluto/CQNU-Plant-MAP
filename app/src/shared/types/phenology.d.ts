export interface PhenologyRecord {
  id?: string;
  label?: string;
  observer?: string;
  surveyDate?: string;
  habitat?: string;
  abundance?: string;
  growthForm?: string;
  floweringState?: string;
  cultivatedStatus?: string;
  note?: string;
  images?: string[];
  family?: string;
  genus?: string;
  [key: string]: unknown;
}
