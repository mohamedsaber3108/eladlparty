import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"أمانة ريادة الأعمال المركزية | حزب العدل",description:"منصة أمانة ريادة الأعمال المركزية بحزب العدل: برامج، مرصد تحديات، فعاليات ومشاركة مجتمعية.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
const localeBootstrap=`(function(){var e=document.documentElement;var l=location.pathname==='/en'||location.pathname.indexOf('/en/')===0?'en':'ar';var d=l==='ar'?'rtl':'ltr';e.lang=l;e.dir=d;document.body&&document.body.setAttribute('dir',d)})()`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:localeBootstrap}}/></head><body>{children}</body></html>}
