import type { MessageBride, PreloadedResources, WPRDetections } from '../Types';
import { jsonrepair } from 'jsonrepair';
import { DiagnoserIDs, Channels, ChannelTargets, CustomEvents } from '../Globals';
import CheckOptimizationFunctions, {
  CheckOptimizationFunction,
  checkPreloadedResourced
} from '@/lib/wprDetection.util';
import { WebRequest } from 'wxt/browser';
import { ContentScriptContext } from 'wxt/client';

export type FDTData = {
  allScriptsLoaded: boolean;
  pageHeaders: WebRequest.HttpHeaders | undefined;
  undefinedReferencesOnPage: Array<string>;
  wprDetections: WPRDetections;
  preloadedResources: PreloadedResources;
  diagnoserData: DiagnoserData | undefined;
};
export type DiagnoserData = {
  // TODO: Improve the type
  noRocketData: any;
  rocketData: any;
};

export function devToolsContentScript(
  cxt: ContentScriptContext,
  { onMessage, sendMessage }: MessageBride
) {
  let pageHeaders: WebRequest.HttpHeaders | undefined = undefined;
  let undefinedReferencesOnPage: string[] = [];
  let rocketAllScriptsLoaded: boolean = false;
  let wprDetections: WPRDetections | undefined = undefined;
  let preloadedResources: PreloadedResources | undefined = undefined;
  let wprDiagnoserData: DiagnoserData | undefined = undefined;
  let pageHTML: null | string = null;
  let dataProcessed = false;
  const consoleMessage = 'WPR Front Debugging tool legacy';
  setEvents();
  document.addEventListener('DOMContentLoaded', async () => {
    if (pageHTML) return;
    pageHTML = new XMLSerializer().serializeToString(document);
    pageHeaders = await getHeaders();
    sendMessage(Channels.reloadDevTools, null, ChannelTargets.devTools).catch((e) => {
      e;
    });
  });

  // Scoped functions definition
  // They are scoped to prevent them to be available in `window`
  async function getHeaders() {
    return (await sendMessage(
      Channels.getPageHeaders,
      null,
      ChannelTargets.background
    )) as unknown as WebRequest.HttpHeaders | undefined;
  }
  function processData() {
    if (!pageHTML) return;
    if (dataProcessed) return;
    const t0 = performance.now();
    const HTMLDocument = new DOMParser().parseFromString(pageHTML, 'text/html');
    const data = getAllData(pageHTML, HTMLDocument);
    wprDetections = data.wprDetections;
    wprDiagnoserData = data.diagnoserData;
    preloadedResources = data.preloadedResources;
    dataProcessed = true;
    if (!wprDetections) console.log(`${consoleMessage} couldn't get information from the page`);
    const t1 = performance.now();
    console.log(`${consoleMessage} ⬇️ (Took: ${(t1 - t0).toFixed(1)}ms)`);
    console.log(consoleMessage, wprDetections);
  }
  function getFDTData() {
    if (!dataProcessed) processData();
    if (!wprDetections || !preloadedResources) return undefined;
    const fdtData: FDTData = {
      allScriptsLoaded: rocketAllScriptsLoaded,
      pageHeaders,
      undefinedReferencesOnPage,
      wprDetections,
      preloadedResources,
      diagnoserData: wprDiagnoserData
    };
    return fdtData;
  }
  function getDiagnoserData() {
    if (!dataProcessed) processData();
    if (!wprDiagnoserData) return undefined;
    return wprDiagnoserData;
  }
  function getWPRDetections() {
    if (!dataProcessed) processData();
    return wprDetections;
  }
  function setEvents() {
    onMessage(Channels.processPageData, () => processData());
    onMessage(Channels.getFDTData, () => {
      return getFDTData();
    });
    onMessage(Channels.getDiagnoserData, () => {
      return getDiagnoserData();
    });
    onMessage(Channels.getWPRDetections, () => {
      return getWPRDetections();
    });
    const customEventName = CustomEvents.reportErrorToExtension;
    /**
     * This event is dispatched when an error occurs in the console
     */
    document.addEventListener(customEventName, (event: any) => {
      if (Array.isArray(event.detail?.words)) {
        const words = event.detail?.words as string[];
        undefinedReferencesOnPage = [...undefinedReferencesOnPage, ...words];
        if (cxt.isValid)
          sendMessage(
            Channels.undefinedReferencesUpdated,
            undefinedReferencesOnPage,
            ChannelTargets.devTools
          ).catch((e) => e);
      }
    });
    window.addEventListener(Channels.allScriptsLoaded, () => {
      rocketAllScriptsLoaded = true;
      sendMessage(Channels.allScriptsLoaded, rocketAllScriptsLoaded, ChannelTargets.devTools).catch(
        (e) => e
      );
    });
  }
  function getAllData(pageHTML: string, HTMLDocument: Document) {
    const { wprDetections, preloadedResources } = processWPRDetections(pageHTML, HTMLDocument);
    const diagnoserData = processDiagnoserData(HTMLDocument);
    return {
      wprDetections,
      preloadedResources,
      diagnoserData
    };
  }
  function processWPRDetections(
    pageHTML: string,
    HTMLDocument: Document
  ): { wprDetections: WPRDetections; preloadedResources: PreloadedResources } {
    const pageScripts = Array.from(HTMLDocument.querySelectorAll('script'));
    const pageLinkElements = Array.from(HTMLDocument.querySelectorAll('link'));
    const wprDetections: any = {};
    for (const [name, func] of Object.entries(CheckOptimizationFunctions) as [
      keyof WPRDetections,
      CheckOptimizationFunction
    ][]) {
      wprDetections[name] = func({ pageHTML, HTMLDocument, pageScripts, pageLinkElements });
    }
    const preloadedResources = checkPreloadedResourced(HTMLDocument);
    // In case wprDetections.wpr.present is false, this will set it to true if any of the optimizations are detected
    if (wprDetections.wpr) {
      const temp = wprDetections as WPRDetections;
      if (!temp.wpr.present) {
        for (const [key, value] of Object.entries(temp)) {
          if (key === 'defer_all_js' || key === 'wpr') continue;
          if (value.present) {
            temp.wpr.present = true;
            break;
          }
        }
      }
    }
    return { wprDetections: wprDetections as WPRDetections, preloadedResources };
  }

  function processDiagnoserData(HTMLDocument: Document) {
    const NoRocketDataElement = HTMLDocument.getElementById(DiagnoserIDs.noRocketDataID);
    const RocketDataElement = HTMLDocument.getElementById(DiagnoserIDs.rocketDataID);
    let noRocketData = null;
    let rocketData = null;
    if (NoRocketDataElement) {
      const text = NoRocketDataElement.textContent;
      if (typeof text === 'string') {
        try {
          const repaired = jsonrepair(text);
          noRocketData = JSON.parse(repaired);
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (RocketDataElement) {
      const text = RocketDataElement.textContent;
      if (typeof text === 'string') {
        try {
          const repaired = jsonrepair(text);
          rocketData = JSON.parse(repaired);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {
      noRocketData,
      rocketData
    };
  }
}
