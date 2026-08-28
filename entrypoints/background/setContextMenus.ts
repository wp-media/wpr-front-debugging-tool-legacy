import { Channels, ChannelTargets, ExtensionContextMenuIds } from '@/Globals';
import { sendMessage } from 'webext-bridge/background';
import type { Menus } from 'wxt/browser';

/**
 * Creates all context menu items after removing any existing ones.
 * Uses removeAll() first to prevent "Cannot create item with duplicate id" errors
 * that occur when the extension is updated/reloaded and previous items still persist.
 */
function createContextMenuItems(URLPatterns: Array<string>): void {
  const menuItems: Array<Menus.CreateCreatePropertiesType> = [
    {
      id: ExtensionContextMenuIds.wprSideBySide,
      title: 'Open Side By Side',
      contexts: ['all'],
      documentUrlPatterns: URLPatterns
    },
    {
      id: ExtensionContextMenuIds.psiSideBySide,
      title: 'Open Side By Side Performance',
      contexts: ['all'],
      documentUrlPatterns: URLPatterns
    },
    {
      id: ExtensionContextMenuIds.exclusionBuilderPage,
      title: 'Exclusion Builder',
      contexts: ['action'],
      documentUrlPatterns: URLPatterns
    },
    {
      id: ExtensionContextMenuIds.updateKnownConflictsDB,
      title: 'Update Known Conflicts Database',
      contexts: ['action']
    }
  ];

  // Remove all existing context menu items before re-creating them.
  // This prevents "Cannot create item with duplicate id" errors that happen
  // when items persist from a previous install/update cycle.
  browser.contextMenus
    .removeAll()
    .then(() => {
      for (const item of menuItems) {
        browser.contextMenus.create(item, () => {
          // Reading runtime.lastError inside the callback clears/acknowledges the error.
          // Without this, Chrome logs "Unchecked runtime.lastError".
          if (browser.runtime.lastError) {
            console.warn(
              `[WPR FDT legacy] Failed to create context menu "${item.id}":`,
              browser.runtime.lastError.message
            );
          }
        });
      }
    })
    .catch((error) => {
      console.warn('[WPR FDT legacy] Failed to remove existing context menus:', error);
    });
}

export function setContextMenus(URLPatterns: Array<string>) {
  // Create menus when the extension is first installed or updated.
  // onInstalled fires on: initial install, extension update, and Chrome update.
  browser.runtime.onInstalled.addListener(function () {
    createContextMenuItems(URLPatterns);
  });

  // Also recreate menus when the browser starts (new profile session).
  // This is a safety net: context menus normally persist, but in rare edge cases
  // (e.g., corrupted browser state) they can be lost.
  browser.runtime.onStartup.addListener(function () {
    createContextMenuItems(URLPatterns);
  });

  browser.contextMenus.onClicked.addListener(async function (clickData) {
    let [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    if (clickData.menuItemId === ExtensionContextMenuIds.psiSideBySide) {
      sendMessage(
        Channels.openSideBySidePerformance,
        {},
        ChannelTargets.contentScript + `@${tab.id}`
      ).catch((e) => e);
    } else if (clickData.menuItemId === ExtensionContextMenuIds.wprSideBySide) {
      sendMessage(Channels.openSideBySide, {}, ChannelTargets.contentScript + `@${tab.id}`).catch(
        (e) => e
      );
    } else if (clickData.menuItemId === ExtensionContextMenuIds.exclusionBuilderPage) {
      if (tab.incognito) return;
      const url = browser.runtime.getURL('/exclusion-builder.html');
      browser.tabs.create({ url });
    }
  });
}
