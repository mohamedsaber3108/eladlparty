"use client";

import {useEffect} from "react";

/**
 * Keeps document language and direction in one place.  Route components declare
 * their locale; individual UI components only use logical CSS properties.
 */
export function LocaleProvider({locale,children}:{locale:"ar"|"en";children:React.ReactNode}){
  useEffect(()=>{
    const root=document.documentElement;
    root.lang=locale;
    root.dir=locale==="ar"?"rtl":"ltr";
    document.body.dir=root.dir;
    return undefined;
  },[locale]);
  return <div lang={locale} dir={locale==="ar"?"rtl":"ltr"} className={`locale-root locale-${locale}`}>{children}</div>
}
