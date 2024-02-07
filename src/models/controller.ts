export interface ControllerResponse {
  responseData?: unknown | null,
  responseMessages?: string[] | null,
  responseCode?: number,
  responseError?: string | null,
}