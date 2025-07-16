import { ApiClient } from '../api/api_client';

/**
 * Hook to access the API client
 * This replaces the useIpc hook for the web version
 */
export function useApi() {
  return ApiClient.getInstance();
}

export default useApi; 