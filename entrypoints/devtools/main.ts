import { Channels, ChannelTargets, LAZYLOAD_EXCLUSIONS_LIST } from '@/Globals';
import { sendMessage } from 'webext-bridge/devtools';
const TabID = chrome.devtools.inspectedWindow.tabId;
// Tells the content script to process page data to be used in DevTools panels.
sendMessage(Channels.processPageData, {}, ChannelTargets.contentScript).catch((e) =>
  console.error(e)
);

const LAZYLOAD_EXCLUSIONS = `[${LAZYLOAD_EXCLUSIONS_LIST.reduce((acc, current) => {
  return acc + `'${current}',`;
}, '')}]`;

const EXPRESION_TO_EVALUATE = `
(() => {
  const LAZYLOAD_EXCLUSIONS = ${LAZYLOAD_EXCLUSIONS};
  if ($0?.nodeType === 1 && $0?.tagName === 'IMG') {
    const objectToShow = {};
    objectToShow.lazyloadDetected =
      $0.hasAttribute('data-lazy-src') || $0.hasAttribute('data-lazy-srcset');
    if (objectToShow.lazyloadDetected) {
      objectToShow.imageLoaded = $0.getAttribute('data-ll-status') === 'loaded';
    } else {
      objectToShow.excludedReasonsFound = LAZYLOAD_EXCLUSIONS.filter((llExclusion) => {
        return $0.outerHTML.includes(llExclusion);
      });
    }
    objectToShow.src = $0.getAttribute('src');
    return objectToShow;
  }
  return { please: 'Select an IMG element' };
})();
`;
/**
 * Creates the "WPR Lazyload" subpanel in the devtools "Elements" panel
 */
const createSubPanels = async () => {
  chrome.devtools.panels.elements.createSidebarPane('WPR Lazyload', (extensionSidebarPane) => {
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      chrome.devtools.inspectedWindow.eval(EXPRESION_TO_EVALUATE, ($0) => {
        extensionSidebarPane.setObject($0 as object, 'Object: ');
      });
    });
    chrome.devtools.inspectedWindow.eval(EXPRESION_TO_EVALUATE, ($0) => {
      extensionSidebarPane.setObject($0 as object, 'Object: ');
    });
  });
};
/**
 * Creates the WPR FDT panel in the devtools
 */
const createFDTPanel = () => {
  chrome.devtools.panels.create('WPR FDT legacy', 'icon/32.png', 'fdt.html', (panel) => {
    panel.onSearch.addListener((action, queryString) => {
      sendMessage(
        Channels.devToolsSearch,
        {
          action,
          queryString
        },
        `${ChannelTargets.devTools}@${TabID}`
      ).catch((e) => console.error(e));
    });
    createSubPanels();
  });
};
createFDTPanel();
