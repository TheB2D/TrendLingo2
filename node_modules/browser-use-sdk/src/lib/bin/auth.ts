import * as dotenv from '@dotenvx/dotenvx';

import { BrowserUse } from '../../';

const API_KEY_ENV_VAR_KEY = 'BROWSER_USE_API_KEY';

/**
 * Creates a new BrowserUse client with the API key from the environment variable.
 */
export function createBrowserUseClient() {
  let apiKey: string | null = null;

  if (process.env[API_KEY_ENV_VAR_KEY]) {
    apiKey = process.env[API_KEY_ENV_VAR_KEY];
  }

  if (apiKey == null) {
    const env = dotenv.config({ path: '.env' });

    const envApiKey = env.parsed?.[API_KEY_ENV_VAR_KEY];

    if (envApiKey) {
      apiKey = envApiKey;
    }
  }

  if (apiKey == null) {
    console.error(`Missing ${API_KEY_ENV_VAR_KEY} environment variable!`);
    process.exit(1);
  }

  return new BrowserUse({ apiKey });
}

const SECRET_ENV_VAR_KEY = 'SECRET_KEY';

/**
 * Loads the Browser Use webhook secret from the environment variable.
 */
export function getBrowserUseWebhookSecret() {
  let secret: string | null = null;

  if (process.env[SECRET_ENV_VAR_KEY]) {
    secret = process.env[SECRET_ENV_VAR_KEY];
  }

  if (secret == null) {
    const env = dotenv.config({ path: '.env' });

    const envSecret = env.parsed?.[SECRET_ENV_VAR_KEY];

    if (envSecret) {
      secret = envSecret;
    }
  }

  if (secret == null) {
    console.error(`Missing ${SECRET_ENV_VAR_KEY} environment variable!`);
    process.exit(1);
  }

  return secret;
}
