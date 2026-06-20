"use client";

import { useCallback, useEffect } from "react";

export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return useCallback(() => {
    if (!dirty) return true;
    return window.confirm("You have unsaved changes. Are you sure you want to leave without saving?");
  }, [dirty]);
}
