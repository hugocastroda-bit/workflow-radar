import { createClient } from '@base44/sdk';
import { appParams, hasBase44Config } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const createUnavailableClient = () => {
  const handler = {
    get: () => new Proxy(async () => {
      throw new Error('Base44 no está configurado. Crea .env.local con VITE_BASE44_APP_ID y VITE_BASE44_APP_BASE_URL.');
    }, handler),
    apply: async () => {
      throw new Error('Base44 no está configurado. Crea .env.local con VITE_BASE44_APP_ID y VITE_BASE44_APP_BASE_URL.');
    }
  };

  return new Proxy({}, handler);
};

//Create a client with authentication required
export const base44 = hasBase44Config ? createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
}) : createUnavailableClient();
