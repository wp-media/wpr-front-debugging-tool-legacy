import { useState } from 'react';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import FilterButtonsBar from '@/entrypoints/fdt/components/FilterButtonsBar';
import ResourcesSummary from '@/entrypoints/fdt/components/ResourcesSummary';
import ResourceItem from '@/entrypoints/fdt/components/ResourceItem';
import { capitalizeString } from '@/lib/utils';
import NothingToShow from '@/components/app/devtools/NothingToShow';
import type { FDTData } from '@/content-scripts/devtoolsContentScript';
import type { DevToolsSearch } from '@/Types';

interface ScriptResource {
  id: number;
  type: 'inline' | 'external';
  delayed: boolean;
  deferred: boolean;
  deferredByWPR: boolean;
  fdtExcluded: string | null;
  content: string;
}

let runAnimations = true;
export default function JavaScriptResourcesPage(props: {
  fdtData: FDTData;
  devtoolsSearch: DevToolsSearch;
}) {
  const { fdtData, devtoolsSearch } = props;
  const delayJSData = fdtData.wprDetections.delay_js;
  const delayJSPresent = delayJSData.present;
  const scriptResources = useMemo(() => {
    return delayJSData.scripts.map((script, index): ScriptResource => {
      return {
        id: index,
        type: script.inline ? 'inline' : 'external',
        content: script.inline ? script.content! : script.src!,
        delayed: script.delayed,
        deferred: script.deferred,
        deferredByWPR: script.deferredByWPR,
        fdtExcluded: script.fdtExcluded
      };
    });
  }, [fdtData]);
  const [scriptResourcesState, setscriptResourcesState] = useState(scriptResources);
  const [searchState, setSearchState] = useState<null | ScriptResource[]>(null);
  const filtered = useRef<Map<string, ScriptResource[]>>(new Map());
  const delayedCount = scriptResources.filter((r) => r.delayed).length;
  const deferredCount = scriptResources.filter((r) => r.deferred).length;
  const inlineCount = scriptResources.filter((r) => r.type === 'inline').length;
  const externalCount = scriptResources.filter((r) => r.type === 'external').length;
  const summaryData = [
    { name: 'Delayed', count: delayedCount },
    { name: 'Non-delayed', count: scriptResources.length - delayedCount },
    { name: 'Deferred', count: deferredCount },
    { name: 'Non-deferred', count: scriptResources.length - deferredCount },
    { name: 'Inline', count: inlineCount },
    { name: 'External', count: externalCount }
  ];
  const filteredCache = (key: string, compute: () => ScriptResource[]) => {
    if (filtered.current.has(key)) return filtered.current.get(key)!;
    const computed = compute();
    filtered.current.set(key, computed);
    return computed;
  };
  const filterButtons = [
    {
      text: 'Show All',
      action: () => {
        setSearchState(null);
        setscriptResourcesState(scriptResources);
      }
    },
    {
      text: 'Delayed',
      action: () => {
        setSearchState(null);
        setscriptResourcesState(
          filteredCache('Delayed', () => scriptResources.filter((r) => r.delayed))
        );
      }
    },
    {
      text: 'Non-delayed',
      action: () => {
        setSearchState(null);
        setscriptResourcesState(
          filteredCache('Non-delated', () => scriptResources.filter((r) => !r.delayed))
        );
      }
    },
    {
      text: 'Deferred',
      action: () => {
        setSearchState(null);
        setscriptResourcesState(
          filteredCache('Deferred', () => scriptResources.filter((r) => !!r.deferred))
        );
      }
    },
    {
      text: 'Non-Deferred',
      action: () => {
        setSearchState(null);
        setscriptResourcesState(
          filteredCache('Non-Deferred', () => scriptResources.filter((r) => !r.deferred))
        );
      }
    },
    {
      text: 'Inline',
      action: () => {
        setSearchState(null);
        setscriptResourcesState(
          filteredCache('Inline', () => scriptResources.filter((r) => r.type === 'inline'))
        );
      }
    },
    {
      text: 'External',
      action: () => {
        setSearchState(null);
        setscriptResourcesState(
          filteredCache('External', () => scriptResources.filter((r) => r.type === 'external'))
        );
      }
    }
  ];
  useEffect(() => {
    runAnimations = false;
  }, []);
  // Perform the search when user types in the search box (Ctrl + F)
  useEffect(() => {
    if (scriptResources.length === 0) return;
    if (devtoolsSearch?.action === 'performSearch' && devtoolsSearch?.queryString) {
      const query = devtoolsSearch.queryString.toLowerCase();
      const filtered = scriptResources.filter((r) => r.content.toLowerCase().includes(query));
      setSearchState(filtered);
      return;
    }
    setSearchState(null);
  }, [devtoolsSearch]);
  return delayJSData.scripts.length === 0 ? (
    <NothingToShow
      title="No scripts to show here"
      description="The extension couldn't find any script in the page.."
    />
  ) : (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-gray-100">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <FilterButtonsBar buttons={filterButtons} runAnimations={runAnimations} />
            <ResourcesSummary
              runAnimations={runAnimations}
              feature={{ name: 'Delay JS', present: delayJSPresent }}
              summaryData={summaryData}
              total={scriptResources.length}
            />
          </div>
          <motion.ul
            className="mx-auto grid gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: runAnimations ? 0.5 : 0 }}
          >
            {searchState?.length === 0 || scriptResourcesState.length === 0 ? (
              <NothingToShow
                title="No scripts to show here"
                description="No scripts. Try using a different filter button or searching something different.."
              />
            ) : (
              (searchState || scriptResourcesState).map((resource, index) => (
                <motion.li
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: runAnimations ? 0.5 : 0,
                    delay: runAnimations ? index * 0.02 : 0
                  }}
                  className="min-w-80 max-w-3xl mx-auto w-full"
                >
                  <ResourceItem
                    resource={{
                      type: [
                        capitalizeString(resource.type),
                        resource.type === 'external' ? 'green' : 'yellow'
                      ],
                      content: resource.content,
                      labels:
                        resource.type === 'external'
                          ? new Map([
                              [formatLabel(resource, 'delay_js'), resource.delayed],
                              [formatLabel(resource, 'defer_all_js'), resource.deferred]
                            ])
                          : new Map([[formatLabel(resource, 'delay_js'), resource.delayed]])
                    }}
                    language={resource.type === 'inline' ? 'javascript' : undefined}
                  />
                </motion.li>
              ))
            )}
          </motion.ul>
        </main>
      </div>
    </TooltipProvider>
  );
}
function formatLabel(resource: ScriptResource, feature: 'delay_js' | 'defer_all_js'): string {
  if (feature === 'delay_js') {
    if (resource.delayed) return 'Delayed';
    if (resource.fdtExcluded && resource.fdtExcluded.includes('delay_js')) {
      return 'Not delayed (Excluded by FDT legacy)';
    }
    return 'Not delayed';
  }
  if (feature === 'defer_all_js') {
    if (resource.deferredByWPR) return 'Deferred (By WP Rocket)';
    else if (resource.deferred) return 'Deferred';
    if (resource.fdtExcluded && resource.fdtExcluded.includes('defer_all_js')) {
      return 'Not deferred (Excluded by FDT legacy)';
    }
    return 'Not deferred';
  }
  return '';
}
