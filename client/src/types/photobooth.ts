export type PhotoboothStep =
  | 'IDLE'
  | 'COUNTDOWN'
  | 'CAPTURING'
  | 'SELECT'
  | 'PREVIEW'
  | 'PRINTING';

export interface PhotoSlot {
  id: number;
  url: string;
  timestamp?: string;
}
