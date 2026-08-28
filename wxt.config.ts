import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'WPR Front Debugging tool legacy',
    minimum_chrome_version: '120',
    permissions: ['contextMenus', 'webRequest', 'storage', 'alarms', 'tabs']
  }
});
