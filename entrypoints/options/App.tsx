import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SaveIcon } from 'lucide-react';
import { ImprovementOption, OptionsStore, StoredOptions } from '@/lib/storage';

type OptionSections = 'improvements';

interface Option<T> {
  id: T;
  label: string;
  description: string;
  enabled: boolean;
}

interface Section<T, U> {
  id: T;
  title: string;
  description: string;
  options: Option<U>[];
}

const sections: Section<OptionSections, ImprovementOption>[] = [
  {
    id: 'improvements',
    title: 'Improvements',
    description: 'Injects little scripts or styles to improve tools we use daily',
    options: [
      {
        id: 'wp-dashboard-dbugger-entry',
        label: "Add an entry to access the D-bugger to WP Rocket's menu",
        description:
          'Adds a convenient entry in the WP Rocket menu for quick access to the D-bugger tool',
        enabled: false
      }
    ]
  }
  // {
  //   id: 'miscellaneous',
  //   title: 'Miscellaneous',
  //   description: 'Other options you can activate or deactivate',
  //   options: [
  //     {
  //       id: 'context-menus',
  //       label: 'Context Menus',
  //       description: 'Enables custom context menus for enhanced functionality',
  //       enabled: false
  //     }
  //   ]
  // }
];

export default function WPRFrontDebuggingOptionsLegacy() {
  const [sectionStates, setSectionStates] = useState(sections);
  const [isSaving, setIsSaving] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState('Save');
  const [isError, setIsError] = useState(false);
  useEffect(() => {
    OptionsStore.getValue()
      .then((data) => {
        const populatedSections = [...sections];
        populatedSections[0].options = sections[0].options.map((option) => {
          option.enabled = Boolean(data?.improvements?.[option.id]);
          return option;
        });
        setSectionStates(populatedSections);
      })
      .catch((e) => {
        setIsError(true);
      });
  }, []);
  const handleToggle = (sectionId: string, optionId: string) => {
    setSectionStates((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              options: section.options.map((option) =>
                option.id === optionId ? { ...option, enabled: !option.enabled } : option
              )
            }
          : section
      )
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveButtonText('Saving...');
    const toSave = sectionStates[0].options.reduce<StoredOptions>((acc, current) => {
      acc.improvements[current.id] = current.enabled;
      return acc;
    }, OptionsStore.fallback);
    OptionsStore.setValue(toSave);
    setTimeout(() => {
      setSaveButtonText('Done!');
      setTimeout(() => {
        setSaveButtonText('Save');
        setIsSaving(false);
      }, 1000);
    }, 1000);
  };
  if (isError) {
    return (
      <div className="absolute h-full w-full flex text-4xl justify-center items-center text-gray-200">
        Some kind of error ocurred..
      </div>
    );
  }
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 leading-normal">
            WPR Front Debugging tool legacy - Options Page
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 flex justify-center"
          >
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 ${
                isSaving ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isSaving ? (
                  <motion.div
                    key="saving"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"
                  />
                ) : (
                  <motion.div
                    key="save"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <SaveIcon className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
              <span>{saveButtonText}</span>
            </Button>
          </motion.div>

          {sectionStates.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1 + 0.3
              }}
              className="mb-8"
            >
              <Card className="bg-gray-800 border-gray-700 overflow-hidden shadow-lg hover:shadow-blue-500/10 transition-shadow duration-300">
                <CardHeader className="bg-gray-750 border-b border-gray-700 pb-4">
                  <CardTitle className="text-2xl font-semibold text-blue-400">
                    {section.title}
                  </CardTitle>
                  <CardDescription className="text-gray-300 mt-1">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-4">
                    {section.options.map((option) => (
                      <Tooltip key={option.id}>
                        <TooltipTrigger asChild>
                          <li className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-750 transition-colors duration-200">
                            <label
                              htmlFor={option.id}
                              className="text-sm font-medium leading-none text-gray-200 cursor-pointer flex-grow mr-4"
                            >
                              {option.label}
                            </label>
                            <Switch
                              id={option.id}
                              checked={option.enabled}
                              onCheckedChange={() => handleToggle(section.id, option.id)}
                              className="data-[state=checked]:bg-blue-500"
                            />
                          </li>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-gray-700 text-gray-100 p-2 text-sm max-w-xs"
                        >
                          {option.description}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
