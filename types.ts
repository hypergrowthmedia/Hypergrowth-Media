
export interface CurrencyRate {
  base: string;
  target: string;
  rate: number;
  lastUpdated: string;
}

export interface TranslationMessage {
  id: string;
  timestamp: Date;
  sender: 'user' | 'model';
  text: string;
  type: 'original' | 'translation';
}

export enum AppTab {
  CURRENCY = 'currency',
  TRANSLATOR = 'translator',
  EXPLORER = 'explorer',
  INFO = 'info'
}
