import { OpenAPI } from '../api';
import { auth } from './firebase';

/**
 * Configure the generated API client to include Firebase auth token
 * in all requests. Call this once on app startup.
 */
export function configureApiAuth() {
  OpenAPI.TOKEN = async () => {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return '';
  };
}
