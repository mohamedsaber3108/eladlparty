import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, FileText, Lightbulb, MapPinned, UsersRound } from "lucide-react";
import { ContentBrowser } from "./content-browser";
import { MediaGallery } from "./media-gallery";
import type { PortalItem } from "@/lib/portal";

const pages: Record<string, { eyebrow: string; title: string; text: string; actions: [string,string][]; icon: "team"|"map"|"idea"|"book"|"file"|"calendar" }> = {
 "about/leadership":{eyebrow:"القيادة",title:"أدوار واضحة قبل الأسماء",text:"تُنشر الأسماء والسير المختصرة ووسائل التواصل فقط بعد الاعتماد الرسمي. توضح هذه الصفحة أدوار القيادة ومسارات المساءلة داخل الأمانة.",actions:[["الهيكل التنظيمي","/about/structure"],["تطوع بخبرتك","/volunteer"]],icon:"team"},
 "about/team":{eyebrow:"فريق العمل",title:"سجل فريق قابل للتحديث",text:"يعرض هذا القسم أعضاء الفرق المركزية والمحافظات المعتمدين واختصاص كل مسار عند إدخالهم من لوحة الإدارة.",actions:[["شبكة المحافظات","/about/governorates"],["أرسل طلب مشاركة","/join"]],icon:"team"},
 "about/governorates":{eyebrow:"المحافظات",title:"منصة مركزية مع حضور محلي",text:"تربط الأمانة المتابعة المركزية باحتياجات المحافظات، وتُعلن التغطية والمنسقين والبرامج بعد اعتمادها.",actions:[["أبلغ عن تحدٍ محلي","/submit/problem"],["المرصد","/observatory"]],icon:"map"},
 "startup-support":{eyebrow:"الشركات الناشئة",title:"من الفكرة إلى مسار دعم مناسب",text:"دليل للبرامج والإرشاد والشراكات والحاضنات، ويعرض فرصًا معلنة فقط لا وعودًا بتمويل قبل اعتماد الشريك.",actions:[["استكشف الفرص","/opportunities"],["أرسل فكرة","/submit/idea"]],icon:"idea"},
 "sme-support":{eyebrow:"المشروعات الصغيرة والمتوسطة",title:"موارد للتطبيق والتوسع",text:"مسارات معرفة وتدريب وشراكات تساعد أصحاب المشروعات في التنظيم والنمو والوصول إلى الخدمات المتاحة.",actions:[["الموارد","/resources"],["الشراكات","/partnerships"]],icon:"book"},
 "success-stories":{eyebrow:"قصص الأثر",title:"نتائج موثقة لا دعاية",text:"تُنشر قصص النجاح بعد موافقة أصحابها وتوثيق المسار والنتيجة، لتكون مرجعًا عمليًا للتعلّم.",actions:[["البرامج","/programs"],["شارك تجربتك","/contact"]],icon:"file"},
 "events/upcoming":{eyebrow:"الفعاليات القادمة",title:"اعرف الموعد ثم عبّر عن اهتمامك",text:"تظهر هنا الفعاليات المعتمدة بموعدها ومكانها وشروط المشاركة، وتُدار من لوحة المحتوى.",actions:[["كل الفعاليات","/events"],["الدعوات والإعلانات","/calls"]],icon:"calendar"},
 "events/past":{eyebrow:"أرشيف الفعاليات",title:"ماذا جرى وماذا خرجنا به؟",text:"أرشيف للندوات والورش والجلسات يتضمن الملخص والمواد والنتائج عند توافرها.",actions:[["المركز الإعلامي","/news"],["التقارير","/insights/reports"]],icon:"calendar"},
 "observatory/problems":{eyebrow:"المرصد",title:"سجل التحديات",text:"استقبل تحديًا محددًا مع سياقه وأدلته ثم تابعه بعد المراجعة. لا ينشر أي بلاغ تلقائيًا.",actions:[["أبلغ عن مشكلة","/submit/problem"],["الحلول المقترحة","/observatory/solutions"]],icon:"idea"},
 "observatory/solutions":{eyebrow:"المرصد",title:"من التشخيص إلى مقترح عملي",text:"تعرض هذه الصفحة الحلول والمقترحات المرتبطة بتحديات منشورة ومراجعة مع الخطوة التالية عند الاعتماد.",actions:[["التحديات","/observatory/problems"],["أوراق السياسات","/observatory/policies"]],icon:"file"},
 "observatory/policies":{eyebrow:"السياسات",title:"مسودات قابلة للنقاش",text:"مساحة لأوراق السياسات والتوصيات المبنية على المعرفة والحوار مع تمييز واضح بين المسودة والنسخة المعتمدة.",actions:[["الأبحاث","/insights/research"],["قدّم مقترحًا","/submit/proposal"]],icon:"file"},
 "insights/reports":{eyebrow:"المعرفة",title:"تقارير يمكن الرجوع إليها",text:"أرشيف للتقارير الدورية والوثائق التنفيذية المنشورة من الأمانة أو الشركاء المعتمدين.",actions:[["الأبحاث","/insights/research"],["المنشورات","/insights/publications"]],icon:"book"},
 "insights/research":{eyebrow:"المعرفة",title:"بحث يخدم القرار",text:"دراسات حول ريادة الأعمال والعمل والتنمية المحلية، تُصنف بالمحور والتاريخ والمصدر.",actions:[["التقارير","/insights/reports"],["المرصد","/observatory"]],icon:"book"},
 "insights/publications":{eyebrow:"المعرفة",title:"إصدارات الأمانة",text:"منشورات وأدلة ومواد تدريبية قابلة للرجوع إليها عند نشرها واعتمادها.",actions:[["الموارد","/resources"],["الوثائق","/documents"]],icon:"book"}
};
const icons={team:UsersRound,map:MapPinned,idea:Lightbulb,book:BookOpen,file:FileText,calendar:CalendarDays};
export function SectionWorkspace({route,items,contentType}:{route:string;items:PortalItem[];contentType:string}){
 if(route==="media/photos")return <section className="listing-page"><MediaGallery kind="image"/></section>;
 if(route==="media/videos")return <section className="listing-page"><MediaGallery kind="video"/></section>;
 const page=pages[route];if(!page)return <section className="listing-page"><ContentBrowser items={items} label="المحتوى المنشور" contentType={contentType}/></section>;
 const Icon=icons[page.icon];return <><section className="workspace-intro"><div className="workspace-icon"><Icon/></div><div><p>{page.eyebrow}</p><h2>{page.title}</h2><span>{page.text}</span></div><div className="workspace-actions">{page.actions.map(([label,href])=><Link key={href} href={href}>{label}<ArrowLeft size={15}/></Link>)}</div></section><section className="listing-page"><ContentBrowser items={items} label={page.title} contentType={contentType}/></section></>;
}
