import HTML from './known-conflicts-content-script.html?raw';
import CSS from './styles.css?raw';
import warningIcon from './warningIcon.svg?raw';
import { knownConflictsStore } from '@/lib/storage';

export async function knownConflictsContentScript() {
  let urlMode: 'none' | 'wp' | 'hs' = 'none';
  let currentURL = new URL(window.location.href);
  let urlChanged = true;
  urlMode = getURLMode();
  if (urlMode === 'none') return;
  const knownConflictsDB: any[] = await knownConflictsStore.getValue();
  const kcButtonAvailableStyles = [
    'top: 0; left: 0;',
    'top: 0; left: 50%; transform: translate(-50%, -0%);',
    'top: 0; right: 0',
    'bottom: 0; right: 0',
    'bottom: 0; left: 50%; transform: translate(-50%, -0%);',
    'bottom: 0; left: 0;'
  ];
  const kcButtonPosition = 5;
  let shadowDomElement: null | HTMLDivElement = null;
  let kcContainer: null | HTMLDivElement = null;
  let kcButton: null | HTMLButtonElement = null;
  let kcButtonHide: null | HTMLButtonElement = null;
  let kcButtonContainer: null | HTMLButtonElement = null;
  let closeListButton: null | HTMLButtonElement = null;
  let listContainer: null | HTMLDivElement = null;
  let kcList: null | HTMLDivElement = null;

  shadowDomElement = document.createElement('div');
  shadowDomElement.setAttribute('id', 'wpr-fdt-known-conflicts');
  shadowDomElement.attachShadow({ mode: 'open' });
  shadowDomElement.shadowRoot!.innerHTML = HTML;
  const style = document.createElement('style');
  style.innerHTML = CSS;
  shadowDomElement.shadowRoot!.prepend(style);
  shadowDomElement!.setAttribute(
    'style',
    'z-index: 999999; position: fixed; margin: 0; padding: 0;' +
      kcButtonAvailableStyles[kcButtonPosition]
  );
  kcContainer = shadowDomElement.shadowRoot!.querySelector<HTMLDivElement>('.container')!;
  kcButton = kcContainer.querySelector<HTMLButtonElement>('#kc')!;
  kcButtonHide = kcContainer.querySelector<HTMLButtonElement>('#hide')!;
  kcButtonContainer = kcContainer.querySelector<HTMLButtonElement>('.button-container')!;
  closeListButton = kcContainer.querySelector<HTMLButtonElement>('#close')!;
  listContainer = kcContainer.querySelector<HTMLDivElement>('.list-container')!;
  kcList = kcContainer.querySelector<HTMLDivElement>('.known-conflicts-list')!;
  setKCButtonEvents();

  const detectedConflictsList = new Set<any>();
  const checkKnownConflictsDebouncedHS = debounce(() => {
    checkKnownConflictsHS();
  });
  window.addEventListener('load', () => {
    if (urlMode === 'wp') {
      checkKnownConflictsWP();
    } else if (urlMode === 'hs') {
      checkKnownConflictsDebouncedHS();
      const observer = new MutationObserver(checkKnownConflictsDebouncedHS);
      observer.observe(document.body, { subtree: true, childList: true });
    }
  });
  function debounce(callback: (...args: any[]) => void, delay = 500) {
    let timeOut: NodeJS.Timeout | null;
    return (...args: any[]) => {
      if (timeOut) {
        clearTimeout(timeOut);
        timeOut = null;
      }
      timeOut = setTimeout(() => {
        callback(...args);
        timeOut = null;
      }, delay);
    };
  }
  function getURLMode() {
    if (currentURL.href.startsWith('https://secure.helpscout.net/conversation/')) {
      return 'hs';
    } else if (currentURL.href.includes('/wp-admin/plugins.php')) {
      return 'wp';
    }
    return 'none';
  }
  function checkKnownConflictsHS() {
    let tempUrl = new URL(window.location.href);
    if (tempUrl.pathname !== currentURL.pathname) {
      currentURL = tempUrl;
      detectedConflictsList.clear();
      urlMode = getURLMode();
      shadowDomElement?.remove();
      urlChanged = true;
    }
    if (urlMode !== 'hs') return;
    const previousSize = detectedConflictsList.size;
    getKnownConflictsHS();
    if (detectedConflictsList.size === previousSize) return;
    printOnPage();
  }
  function getKnownConflictsHS() {
    const pageHTML = new XMLSerializer().serializeToString(document);
    const HTMLDocument = new DOMParser().parseFromString(pageHTML, 'text/html');
    const threadsContainer = HTMLDocument.body.querySelector('.threads-container');
    let allText = '';
    // In case old / Legacy inbox is being used
    if (threadsContainer) {
      const tables = Array.from(
        threadsContainer.querySelectorAll<HTMLTableElement>(`.messageBody table`)
      );
      allText = getKnownConflictsHSFromTables(tables);
    } else {
      // Code in case new inbox is in use
      const tables = Array.from(
        HTMLDocument.body.querySelectorAll<HTMLTableElement>('.ThreadListItem table')
      );
      allText = getKnownConflictsHSFromTables(tables);
    }
    if (!allText) return;
    getKnownConflicts(allText, true);
  }
  function getKnownConflictsHSFromTables(tables: Array<HTMLTableElement>) {
    if (tables.length === 0) return '';
    let allText = '';
    for (const table of tables) {
      allText += table.textContent ?? '';
    }
    return allText;
  }
  function checkKnownConflictsWP() {
    if (urlMode !== 'wp') return;
    getKnownConflictsWP();
    if (detectedConflictsList.size === 0) return;
    printOnPage();
  }
  function getKnownConflictsWP() {
    let allText = '';
    const pluginTitles = Array.from(
      document.querySelectorAll('th.plugin-title.column-primary, td.plugin-title.column-primary')
    );
    if (!pluginTitles.length) return;
    for (const title of pluginTitles) {
      allText += title.textContent ?? '';
    }
    if (!allText) return;
    getKnownConflicts(allText);
  }
  function getKnownConflicts(allText: string, hs?: boolean) {
    const lowercaseAllText = (allText?.trim() ?? '').toLocaleLowerCase();
    for (const conflict of knownConflictsDB) {
      const lowercaseName = (conflict.name?.trim() ?? '').toLocaleLowerCase();
      if (!lowercaseName || !conflict.url) continue;
      let match = null;
      if (hs) {
        match = lowercaseAllText.match(`(^|- )(${lowercaseName})($| -)`);
      } else {
        match = lowercaseAllText.includes(lowercaseName);
      }
      if (match) {
        detectedConflictsList.add(conflict);
      }
    }
  }
  function printOnPage() {
    printOnHS();
  }
  function printOnHS() {
    const badgeNumber = detectedConflictsList.size > 9 ? '9+' : detectedConflictsList.size;
    kcButton!.innerHTML = `<span>Known Conflicts found</span>${warningIcon}<span>: ${badgeNumber}</span>`;
    kcList!.innerHTML = '';
    for (const conflict of detectedConflictsList) {
      const listItem = document.createElement('div');
      listItem.classList.add('list-item');
      ((listItem.innerHTML = `<strong>${conflict.name}</strong>${conflict.summary ? ' - ' + conflict.summary : ''}`),
        conflict);
      if (conflict.url) {
        listItem.addEventListener('click', () => {
          window.open(conflict.url, '__blank');
        });
      }
      kcList?.appendChild(listItem);
    }
    document.body.appendChild(shadowDomElement!);
    if (urlChanged) {
      urlChanged = false;
      restartStyles();
    }
  }
  function setKCButtonEvents() {
    kcButtonHide!.addEventListener('click', () => {
      if (kcButton!.classList.contains('invisible')) {
        kcButton!.classList.remove('invisible');
        kcButtonHide!.textContent = '◂';
        // ◂  ▸
      } else {
        kcButton!.classList.add('invisible');
        kcButtonHide!.textContent = '▸';
      }
    });
    const transitionEventCallback = (event: Event) => {
      (event.target as HTMLElement)!.classList.add('hidden');
      (event.target as HTMLElement)!.removeEventListener('transitionend', transitionEventCallback);
      if (event.target === kcButtonContainer) {
        listContainer!.classList.remove('hidden');
        setTimeout(() => {
          listContainer?.classList.remove('invisible');
        }, 1);
      } else if (event.target === listContainer) {
        kcButtonContainer?.classList.remove('hidden');
        setTimeout(() => {
          kcButtonContainer?.classList.remove('invisible');
        }, 1);
      }
    };
    kcButton?.addEventListener('click', () => {
      kcButtonContainer!.addEventListener('transitionend', transitionEventCallback);
      kcButtonContainer!.classList.add('invisible');
    });
    closeListButton?.addEventListener('click', () => {
      listContainer!.addEventListener('transitionend', transitionEventCallback);
      listContainer!.classList.add('invisible');
    });
  }
  function restartStyles() {
    listContainer!.classList.add('hidden');
    listContainer!.classList.add('invisible');
    kcButtonContainer?.classList.remove('hidden');
    kcButtonContainer?.classList.remove('invisible');
    kcButton?.classList.add('invisible');
    kcButtonHide!.textContent = '◂';
    setTimeout(() => {
      kcButton?.classList.remove('invisible');
    }, 1);
  }
}
