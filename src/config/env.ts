const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[ENV WARNING] EXPO_PUBLIC_API_BASE_URL is not set. Please ensure your environment file (.env.development or .env.production) is present.',
  );
}

export const ENV = {
  API_BASE_URL: apiBaseUrl ? apiBaseUrl.replace(/\/+$/, '') : '',
};
