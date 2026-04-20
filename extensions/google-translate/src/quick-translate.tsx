import { List } from "@raycast/api";
import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { LanguageDropdown } from "./QuickTranslate/LanguageDropdown";
import { QuickTranslateListItem } from "./QuickTranslate/QuickTranslateListItem";
import { useDebouncedValue, usePreferences, useSourceLanguage, useTargetLanguages, useTextState } from "./hooks";
import { LanguageCode } from "./languages";
import { AUTO_DETECT } from "./simple-translate";

export default function QuickTranslate(): ReactElement {
  const [sourceLanguage] = useSourceLanguage();
  const [targetLanguages] = useTargetLanguages();
  const { proxy, outputMatchesInput } = usePreferences();
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [text, setText] = useTextState();
  const debouncedText = useDebouncedValue(text, 500).trim();

  const [detectedSourceLanguage, setDetectedSourceLanguage] = useState<LanguageCode | null>(null);

  const handleDetectedSourceLanguage = useCallback((language: LanguageCode) => {
    setDetectedSourceLanguage((prev) => (prev === language ? prev : language));
  }, []);

  useEffect(() => {
    if (sourceLanguage !== AUTO_DETECT || !debouncedText) {
      setDetectedSourceLanguage(null);
    }
  }, [sourceLanguage, debouncedText]);

  const effectiveSourceLanguage = sourceLanguage === AUTO_DETECT ? detectedSourceLanguage : sourceLanguage;

  const processedTargetLanguages = useMemo(() => {
    if (effectiveSourceLanguage && targetLanguages.includes(effectiveSourceLanguage)) {
      if (outputMatchesInput === "hide" && targetLanguages.length > 1) {
        return targetLanguages.filter((lang) => lang !== effectiveSourceLanguage);
      }

      if (outputMatchesInput === "moveToBottom") {
        return [...targetLanguages.filter((lang) => lang !== effectiveSourceLanguage), effectiveSourceLanguage];
      }
    }

    return targetLanguages;
  }, [targetLanguages, effectiveSourceLanguage, outputMatchesInput]);

  const [loadingStates, setLoadingStates] = useState(new Map(processedTargetLanguages.map((lang) => [lang, false])));

  useEffect(() => {
    setLoadingStates(new Map(processedTargetLanguages.map((lang) => [lang, false])));
  }, [processedTargetLanguages]);

  const isAnyLoading = Array.from(loadingStates.values()).some((isLoading) => isLoading);

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (processedTargetLanguages.length > 0 && outputMatchesInput === "moveToBottom") {
      setSelectedItemId(processedTargetLanguages[0]);
    } else {
      setSelectedItemId(undefined);
    }
  }, [processedTargetLanguages, outputMatchesInput]);

  useEffect(() => {
    setSelectedItemId(undefined);
  }, [debouncedText]);

  function setIsLoading(lang: LanguageCode, isLoading: boolean) {
    setLoadingStates((prev) => new Map(prev).set(lang, isLoading));
  }

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      searchText={text}
      onSearchTextChange={setText}
      isLoading={isAnyLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={<LanguageDropdown />}
      selectedItemId={selectedItemId}
    >
      {debouncedText
        ? processedTargetLanguages.map((targetLanguage) => (
            <QuickTranslateListItem
              key={targetLanguage}
              debouncedText={debouncedText}
              languageSet={{ langFrom: sourceLanguage, langTo: [targetLanguage], proxy }}
              isShowingDetail={isShowingDetail}
              setIsShowingDetail={setIsShowingDetail}
              setIsLoading={(isLoading) => setIsLoading(targetLanguage, isLoading)}
              onDetectedSourceLanguage={handleDetectedSourceLanguage}
            />
          ))
        : null}
    </List>
  );
}
