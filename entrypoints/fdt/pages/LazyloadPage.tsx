import { useState } from 'react';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import FilterButtonsBar from '@/entrypoints/fdt/components/FilterButtonsBar';
import ResourcesSummary from '@/entrypoints/fdt/components/ResourcesSummary';
import ResourceItem from '@/entrypoints/fdt/components/ResourceItem';
import NothingToShow from '@/components/app/devtools/NothingToShow';
import { FDTData } from '@/content-scripts/devtoolsContentScript';
import { FDTExcludedResource } from '@/Globals';
import type { DevToolsSearch } from '@/Types';

interface LazyloadResource {
  id: number;
  lazyloaded: boolean;
  src: string;
  excludedReasons: string[];
}

let runAnimations = true;
export default function LazyloadResourcesPage(props: {
  fdtData: FDTData;
  devtoolsSearch: DevToolsSearch;
}) {
  const { lazyload } = props.fdtData.wprDetections;
  const { devtoolsSearch } = props;
  const lazyloadPresent = lazyload.present;
  const lazyloadResources: LazyloadResource[] = useMemo(() => {
    return lazyload.images.map((img, index) => {
      return {
        id: index,
        lazyloaded: img.lazyloadDetected,
        src: img.src,
        excludedReasons: img.excludedReasonsFound
      };
    });
  }, [lazyload.images]);
  const [lazyloadResourcesState, setLazyloadResourcesState] = useState(lazyloadResources);
  const [searchState, setSearchState] = useState<null | LazyloadResource[]>(null);
  const filtered = useRef<Map<string, LazyloadResource[]>>(new Map());
  const lazyloadedCount = lazyloadResources.filter((r) => r.lazyloaded).length;
  const summaryData = [
    { name: 'Lazyloaded', count: lazyloadedCount },
    { name: 'Non-lazyloaded', count: lazyloadResources.length - lazyloadedCount }
  ];
  const filteredCache = (key: string, compute: () => LazyloadResource[]) => {
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
        setLazyloadResourcesState(lazyloadResources);
      }
    },
    {
      text: 'Lazyloaded',
      action: () => {
        setSearchState(null);
        setLazyloadResourcesState(
          filteredCache('Lazyloaded', () => lazyloadResources.filter((r) => r.lazyloaded))
        );
      }
    },
    {
      text: 'Non-lazyloaded',
      action: () => {
        setSearchState(null);
        setLazyloadResourcesState(
          filteredCache('Non-lazyloaded', () => lazyloadResources.filter((r) => !r.lazyloaded))
        );
      }
    }
  ];
  useEffect(() => {
    runAnimations = false;
  }, []);
  // Perform the search when user types in the search box (Ctrl + F)
  useEffect(() => {
    if (lazyloadResources.length === 0) return;
    if (devtoolsSearch?.action === 'performSearch' && devtoolsSearch?.queryString) {
      const query = devtoolsSearch.queryString.toLowerCase();
      const filtered = lazyloadResources.filter((r) => r.src.toLowerCase().includes(query));
      setSearchState(filtered);
      return;
    }
    setSearchState(null);
  }, [devtoolsSearch]);
  return lazyload.images.length === 0 ? (
    <NothingToShow
      title="No images to show here"
      description="The extension couldn't find any image in the page.."
    />
  ) : (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-gray-100">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <FilterButtonsBar buttons={filterButtons} runAnimations={runAnimations} />
            <ResourcesSummary
              runAnimations={runAnimations}
              feature={{ name: 'Lazyload', present: lazyloadPresent }}
              summaryData={summaryData}
              total={lazyloadResources.length}
            />
          </div>
          <motion.ul
            className="mx-auto grid gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: runAnimations ? 0.5 : 0 }}
          >
            {searchState?.length === 0 || lazyloadResourcesState.length === 0 ? (
              <NothingToShow
                title="No images to show here"
                description="No images. Try using a different filter button or searching something different.."
              />
            ) : (
              (searchState || lazyloadResourcesState).map((resource, index) => (
                <motion.li
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: runAnimations ? 0.5 : 0,
                    delay: runAnimations ? index * 0.02 : 0
                  }}
                  className="max-w-3xl mx-auto w-full"
                >
                  <ResourceItem
                    resource={{
                      type: ['Image', resource.lazyloaded ? 'green' : 'red'],
                      content: resource.src,
                      labels: resource.lazyloaded
                        ? new Map([['Lazyloaded', resource.lazyloaded]])
                        : new Map([
                            ['Not lazyloaded', resource.lazyloaded],
                            [
                              resource.excludedReasons.length === 0
                                ? `No reasons found`
                                : resource.excludedReasons.includes(FDTExcludedResource)
                                  ? 'Excluded by FDT legacy'
                                  : `Excluded reasons found: "${resource.excludedReasons!.join('", "')}"`,
                              false
                            ]
                          ])
                    }}
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
