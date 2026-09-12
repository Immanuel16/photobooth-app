export interface CaptureResponse {
  success: boolean;
  imageUrl: string;
}

export interface PrintRequest {
  imageDataUrl: string;
  paperSize?: string;
}

export interface PrintResponse {
  success: boolean;
  message: string;
}
