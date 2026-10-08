import Link from "next/link";
import {ArrowLeft,ArrowUpLeft,BarChart3,BookOpen,CalendarDays,CheckCircle2,ChevronLeft,Handshake,Lightbulb,MapPinned,MessageSquare,Network,Plus,Search,ShieldCheck,Sparkles,UsersRound} from "lucide-react";
import {SiteShell} from "@/components/site-shell";
import {ContentCard} from "@/components/page-frame";
import {content} from "@/lib/portal";

const routes=[
  ["ابحث عن فرصة",Search,"/opportunities","برامج ودعوات وموارد داعمة"],
  ["أرسل تحديًا",Plus,"/submit/problem","حوّل الخبرة الميدانية إلى ملف متابعة"],
  ["سجّل فعالية",CalendarDays,"/events","اعرف المواعيد وعبّر عن اهتمامك"],
  ["اقرأ تقريرًا",BookOpen,"/insights/reports","معرفة قابلة للرجوع والبحث"]
] as const;
const audiences=[
  ["رائد/ة أعمال",Lightbulb,"برامج وموارد وفرص وشبكة خبرات تساعدك على اتخاذ الخطوة التالية."],
  ["شريك أو مؤسسة",Handshake,"مساحة عملية لاقتراح تعاون أو تصميم مسار مشترك أو مشاركة معرفة."],
  ["باحث/ة وصانع قرار",BarChart3,"مرصد منظم للتحديات والأدلة والمقترحات القابلة للنقاش والمتابعة."]
] as const;

export default function Home(){
  const news=content.filter(x=>x.type==="news");
  const activity=content.filter(x=>["events","initiatives","programs"].includes(x.type));
  return <SiteShell>
    <section className="home-hero">
      <div className="hero-content">
        <p className="overline white">منصة عمل ومشاركة</p>
        <h1>ريادة الأعمال<br/><span>من الفكرة إلى الأثر.</span></h1>
        <p>بوابة أمانة ريادة الأعمال المركزية بحزب العدل؛ تربط المعرفة والبرامج والفرص واحتياجات رواد الأعمال بمسارات عمل وشراكات قابلة للمتابعة.</p>
        <div className="hero-actions"><Link href="/observatory">ادخل إلى المرصد <ArrowLeft size={18}/></Link><Link href="/join" className="ghost">شارك معنا</Link></div>
        <div className="hero-trust"><CheckCircle2 size={16}/><span>برامج وشراكات ومحتوى يُراجع قبل النشر.</span></div>
      </div>
      <div className="hero-dashboard" aria-label="رحلة العمل داخل المنصة">
        <div className="dash-head"><span>خريطة العمل</span><i>محدّثة</i></div>
        <div className="dash-lines"><b>استماع</b><span/><b>تحليل</b><span/><b>تدخل</b><span/><b>متابعة</b></div>
        <div className="dash-stats"><div><strong>06–10</strong><small>برامج مستهدفة</small></div><div><strong>10</strong><small>محافظات على الأقل</small></div><div><strong>05</strong><small>شراكات مؤسسية</small></div></div>
      </div>
    </section>

    <section className="quick-access" aria-labelledby="quick-title"><div><p>ابدأ من حيث تحتاج</p><h2 id="quick-title">خدمات البوابة</h2></div><div className="quick-grid">{routes.map(([title,Icon,href,description])=><Link href={href} key={title}><Icon/><span><b>{title}</b><small>{description}</small></span><ArrowUpLeft size={16}/></Link>)}</div></section>

    <section className="home-section audience-section"><header className="section-head"><div><p className="overline">مصممة حول المستخدم</p><h2>أنت لا تبدأ من الصفر.</h2></div><p className="section-note">اختر المسار الأقرب لاحتياجك، ثم انتقل إلى محتوى أو نموذج أو فرصة فعلية.</p></header><div className="audience-grid">{audiences.map(([title,Icon,description],i)=><article key={title}><span>0{i+1}</span><Icon/><h3>{title}</h3><p>{description}</p><Link href={i===0?"/opportunities":i===1?"/partnerships":"/observatory"}>استكشف المسار <ArrowLeft size={16}/></Link></article>)}</div></section>

    <section className="home-section split observatory-intro"><div><p className="overline">مرصد ريادة الأعمال</p><h2>مشكلة موثقة.<br/>حل قابل للمتابعة.</h2><p>لا يكتفي المرصد بعرض الشكاوى: يستقبل الملاحظات، يصنّفها، يربطها بالأدلة والجهات المحتملة، ثم ينشر مقترحاً وخطوة تالية عند اكتمال المراجعة.</p><Link className="text-link" href="/observatory/problems">استكشف التحديات <ArrowLeft size={16}/></Link></div><div className="observatory-panel"><div><MapPinned/><span>المحافظات</span><b>رصد محلي وشبكة تنفيذ</b></div><div><BarChart3/><span>البيانات</span><b>قضايا مصنفة قابلة للبحث</b></div><div><ShieldCheck/><span>المتابعة</span><b>حالة واضحة لكل مسار</b></div><div><Network/><span>الشراكات</span><b>ربط الاحتياج بالجهة المناسبة</b></div></div></section>

    <section className="platform-flow" aria-labelledby="flow-title"><div className="flow-title"><p className="overline white">كيف تعمل المنصة</p><h2 id="flow-title">من الملاحظة إلى المسار العملي.</h2><p>رحلة واحدة تربط المشاركة بالمحتوى وبعمل الأمانة، من دون وعود غير موثقة.</p></div><ol><li><span>01</span><b>أرسل أو استكشف</b><small>فكرة، تحدٍ، فرصة أو سؤال.</small></li><li><span>02</span><b>مراجعة وتصنيف</b><small>يُراجع المحتوى ويُربط بالمسار المناسب.</small></li><li><span>03</span><b>نشر ومشاركة</b><small>نتائج، فعاليات، ومصادر متاحة للجمهور.</small></li><li><span>04</span><b>متابعة الأثر</b><small>تحديث الحالة والشركاء والخطوة التالية.</small></li></ol></section>

    <section className="home-section"><header className="section-head"><div><p className="overline">آخر الأخبار</p><h2>داخل الأمانة والحزب</h2></div><Link href="/news">كل الأخبار <ArrowLeft size={16}/></Link></header><div className="content-grid">{news.map(x=><ContentCard item={x} key={x.slug}/>)}</div></section>

    <section className="activity-strip"><div><p>البرامج والفعاليات</p><h2>مساحات تعلّم، حوار، وتنفيذ.</h2></div><div>{activity.map(x=><Link href={`/${x.type}/${x.slug}`} key={x.slug}><small>{x.category}</small><b>{x.title}</b><ArrowLeft size={17}/></Link>)}</div></section>

    <section className="home-section ecosystem-section"><div className="ecosystem-copy"><p className="overline">منظومة لا صفحة تعريفية</p><h2>معرفة، فرصة، حوار، ومتابعة في مكان واحد.</h2><p>استكشف المكتبة، شارك بخبرتك، واعرف أين يمكن أن يبدأ تعاون أو تدخل عملي.</p><div className="ecosystem-links"><Link href="/insights"><BookOpen/>المعرفة والسياسات</Link><Link href="/partnerships"><UsersRound/>الشراكات</Link><Link href="/calls"><Sparkles/>الدعوات والإعلانات</Link></div></div><aside className="participation-card"><MessageSquare/><h3>لديك فكرة أو مشكلة؟</h3><p>سجّلها الآن لتصل إلى المسار المناسب داخل الأمانة، وسيظهر لك تأكيد استلام واضح.</p><Link href="/submit/idea">ابدأ المشاركة <ArrowLeft size={16}/></Link></aside></section>

    <section className="home-cta"><div><p className="overline">خطوتك التالية</p><h2>المشاركة تبدأ بمعلومة أو فكرة أو شراكة.</h2><p>استخدم البوابة بما يناسب دورك، ثم تابع المحتوى والفعاليات المفتوحة.</p></div><div><Link href="/join">انضم إلى المسار <ChevronLeft size={18}/></Link><Link href="/faq" className="outline">الأسئلة الشائعة</Link></div></section>
  </SiteShell>
}
