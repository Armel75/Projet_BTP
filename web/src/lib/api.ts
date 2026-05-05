// Pont centralisé pour tous les appels API (gestion token, refresh, base dynamique)
const originalFetch = window.fetch;
export const API_BASE = import.meta.env.VITE_API_URL;

let refreshPromise: Promise<string | null> | null = null;

/**
 * Déclenche la déconnexion via un CustomEvent.
 * AuthContext écoute cet événement et utilise React Router navigate() —
 * pas de rechargement de page, pas de problème de basename Vite.
 */
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
};

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit & { noAutoLogout?: boolean }) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  // Log de debug de la requête
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[apiFetch] Request:', {
      url,
      method: init?.method || 'GET',
      headers: init?.headers,
      body: init?.body,
    });
  }

  // On ne gère le token que pour les appels à l'API interne
  const noAutoLogout = init?.noAutoLogout ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { noAutoLogout: _omit, ...fetchInit } = init ?? {};
  const safeInit = fetchInit as RequestInit;

  if (url.startsWith(`${API_BASE}/`) && !url.startsWith(`${API_BASE}/auth/`)) {
    const token = localStorage.getItem('token');

    const headers = new Headers(safeInit?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const options: RequestInit = {
      ...safeInit,
      headers,
      credentials: 'include',
    };

    let response = await originalFetch(input, options);

    // Log de debug de la réponse si erreur
    if (typeof window !== 'undefined' && response.status >= 400) {
      // eslint-disable-next-line no-console
      console.error('[apiFetch] Response error:', response.status, response.statusText, response);
    }

    // Gestion du token expiré (401)
    if (response.status === 401) {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshResponse = await originalFetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });

            if (!refreshResponse.ok) {
              return null;
            }

            const data = await refreshResponse.json();
            localStorage.setItem('token', data.accessToken);
            return data.accessToken;
          } catch {
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;

      // Si refresh échoue → logout (sauf si l'appelant a demandé noAutoLogout)
      if (!newToken) {
        if (!noAutoLogout) handleLogout();
        return response;
      }

      // Retry avec nouveau token
      const retryResponse = await originalFetch(input, {
        ...options,
        headers: new Headers({
          ...Object.fromEntries(headers.entries()),
          Authorization: `Bearer ${newToken}`,
        }),
        credentials: 'include',
      });

      if (typeof window !== 'undefined' && retryResponse.status >= 400) {
        // eslint-disable-next-line no-console
        console.error('[apiFetch] Response error (retry):', retryResponse.status, retryResponse.statusText, retryResponse);
      }

      if (retryResponse.status === 401) {
        if (!noAutoLogout) handleLogout();
      }

      return retryResponse;
    }

    // 403 → gestion côté UI
    if (response.status === 403) {
      return response;
    }

    // Sécurisation du parsing JSON
    const safeResponse = response;
    if (typeof window !== 'undefined' && response.status >= 400) {
      // On utilise response.clone() pour le log : le ReadableStream ne peut être lu qu'une fois.
      // L'original `response` reste intact pour être consommé par l'appelant.
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.clone().json();
          // eslint-disable-next-line no-console
          console.error('[apiFetch] Error JSON:', data);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[apiFetch] JSON parse error:', e);
        }
      } else {
        // eslint-disable-next-line no-console
        console.error('[apiFetch] No JSON body in error response');
      }
    }
    return safeResponse;
  }

  const response = await originalFetch(input, init);
  // Sécurisation du parsing JSON
  if (typeof window !== 'undefined' && response.status >= 400) {
    // eslint-disable-next-line no-console
    console.error('[apiFetch] Response error:', response.status, response.statusText, response);
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        // eslint-disable-next-line no-console
        console.error('[apiFetch] Error JSON:', data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[apiFetch] JSON parse error:', e);
      }
    } else {
      // eslint-disable-next-line no-console
      console.error('[apiFetch] No JSON body in error response');
    }
  }
  return response;
};
