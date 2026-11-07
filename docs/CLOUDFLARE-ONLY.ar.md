# إزالة Netlify واعتماد Cloudflare فقط — PR #14

تاريخ التدقيق: 7 نوفمبر 2026. هذا تحديث للفرع القائم
`codex/avamarie-contact-backend` في PR #14، وليس PR جديدًا. النطاق تغييرات الكود
والاختبار والتوثيق فقط؛ لا دمج أو نشر إنتاجي أو تعديل DNS أو إعدادات حسابات خارجية.

## نتيجة التدقيق وإزالة الاعتماد

شمل البحث جميع الملفات المتتبعة والمخفية في المستودع: صفحات HTML ومخرجات البناء،
JavaScript العام وERP وتطبيق Admin المجمّع، إعدادات Wrangler والبناء والتوجيه،
package manifests وlockfile، GitHub workflows، والاختبارات والتوثيق.
استُبعدت Git objects وnode_modules ومخرجات الاختبارات من البحث النشط؛ هذه ليست
مصادر أو ملفات إنتاج منشورة. فُحص `dist/` نفسه فحصًا مستقلًا بعد إعادة بنائه.

حُذف `netlify.toml` بالكامل. أُزيل سكربت Netlify Identity الخارجي ومعالج
`window.netlifyIdentity` من `index.html`، ثم وُلّدت الصفحات الست باستخدام
`scripts/build.py`. لم تُجرَ تعديلات مستقلة على HTML المُولّد. معالجة النموذج
القديمة كانت قد استُبدلت في المرحلة السابقة؛ لم تُترك Forms أو Identity أو
Functions أو SDK أو adapter أو build plugin من المنصة القديمة.

لم يُعثر على اعتماد Netlify في `package.json` أو lockfile أو أدوات البناء أو
workflow المستودع. الفحوص الحالية لا تتطلب حسابًا لدى المنصة المحذوفة. مراجعها
المتبقية محصورة في تاريخ الترحيل وإجراءات فصل التكامل الخارجي واختبارات تشترط
غيابها، ولا تنفّذ أي اتصال بها. لا يحتوي أي HTML أو JS أو CSS أو manifest منشور
في `dist/` على مرجع فعّال إليها.

أُزيل الاختبار الذي كان يشترط الاحتفاظ بإعدادات الاستضافة القديمة. البديل يفحص
خلو الكود والأصول من الاعتماد المحذوف، ووجود توجيه Cloudflare الصحيح، ومطابقة
الصفحات المُولّدة للمصدر حرفيًا. مقارنة head مع `main` تسمح فقط بحذف السكربت
المتقاعد؛ metadata وSEO وCSS والتنقل والمحتوى لا تتغير.

## المصادقة ووظائف ERP/Admin

| المسار/الملف | ما ثبت من الكود | ما حُفظ واختُبر |
|---|---|---|
| سكربت Identity العام | مستمع init/login يعيد التوجيه إلى `/admin/`؛ لا زر أو مسار دخول يستخدمه، ولا تحقق جلسة/صلاحيات يحمي Admin أو ERP | حُذف السكربت والمستمع فقط؛ لا بديل يتجاوز المصادقة |
| `login.html` | صفحة Demo قديمة تتحقق من كلمة مرور داخل JavaScript وتكتب `erp_auth` و`erp_user` في sessionStorage | لم تتغير بايتًا؛ اختُبر رفض كلمة مرور خاطئة ودخول Demo الموجود |
| `js/erp-script.js` و`erp.html` | guard وlogout وRBAC محلي؛ عرض بيانات/واجهات مستقلة وتحميل `views/*.html` | الملفات والأصول محفوظة بايتًا؛ اختُبر guard وتحميل dashboard وlogout محليًا |
| `admin/index.html` و`admin/assets/*` | React SPA مستقل بـbasename `/admin`؛ لا استدعاء Identity أو مزود مصادقة، ولا API مصادقة ضمن bundle المفحوص | الأصول محفوظة بايتًا؛ اختُبر تحميل orders/models مباشرة وإعادة تحميل الصفحة |

**قيد وظيفي/أمني قائم:** sessionStorage وكلمة المرور داخل المتصفح وRBAC المحلي
ليست مصادقة خادم ولا حماية مناسبة لبيانات إنتاج خاصة. لم يضف هذا PR أي bypass
أو جلسة وهمية أو تخفيفًا لحارس قائم. لا يثبت إزالة Identity أن Admin أصبح محميًا
على الخادم؛ لم يكن السكربت العام يحقق تلك الحماية أصلًا. أي حماية خارجية مثل
Cloudflare Access أو خدمة بيانات خاصة غير متحققة من هذا المستودع. يجب على المالك
تقييم الحماية الفعلية قبل إدخال بيانات خاصة أو إعلان ERP نظامًا إنتاجيًا آمنًا.
تغيير نموذج المصادقة أو إعداد Access يحتاج نطاق عمل وموافقة منفصلين.

## التوجيه على Cloudflare

تستخدم جميع المسارات Worker `avamarie` مع binding `ASSETS` من `dist/` فقط.
تحتفظ `assets.not_found_handling` بالقيمة `404-page`؛ لا يوجد global SPA fallback.
تضمن `run_worker_first` مرور `/api/*` و`/admin` و`/admin/*` و`/index` و`/index/`
عبر Worker قبل اعتراضها بتوجيه الأصول.

| الطلب | النتيجة |
|---|---|
| `/index` أو `/index/` | 301 إلى `/` مع الاحتفاظ بـquery string، دون إظهار نسخة Home القديمة |
| `/admin` | السلوك القياسي للأصول يحوّل إلى `/admin/` |
| `/admin/` والملفات الفعلية تحت `/admin/assets/` | تقديم الأصول الأصلية دون تعديل |
| `/admin/models` و`/admin/models/:id` و`/admin/orders` و`/admin/planning` و`/admin/cutting` و`/admin/sewing` و`/admin/finishing` و`/admin/packing` و`/admin/materials` و`/admin/settings` | عند غياب أصل مطابق لطلب GET/HEAD يُقدّم shell `/admin/` داخليًا دون تغيير URL؛ يعمل refresh والربط المباشر |
| مسار Admin غير معروف أو bundle مفقود أو مسار عام غير موجود | HTTP 404 حقيقي، وليس shell ناجحًا |
| POST إلى مسار Admin ثابت | سلوك الأصول/405؛ لا تحويل إلى shell |
| `POST /api/contact` و`GET /api/contact-config` | API مستقل؛ لا يمر عبر Admin fallback أو تحويلات index |

هذا fallback مقتصر على المسارات الموجودة فعلًا في router المجمّع؛ تحديث ذلك
router مستقبلًا يستلزم إضافة المسار المناسب إلى matcher في Worker. استخدام
`/admin/` عند جلب shell يتجنب تحويل `/admin/index.html` التلقائي الذي قد يُسقط
مسار العميل في Cloudflare HTML handling. التحويلات تنفذ في Worker مباشرة؛ لا
اعتماد على قواعد مزود استضافة آخر أو `200` catch-all يخفي ملفات مفقودة.

## الاختبارات وحدودها

- `npm test`: 87 Backend/routing tests و6 مجموعات Website regression، تشمل
  build reproducibility، مطابقة الصفحات المُولّدة، SEO/head/CSS/navigation، حفظ
  الملفات العامة السابقة، وفحص الأصول والاعتماد المحذوف.
- `npm run test:browser`: 40 حالة تشمل الوظائف السابقة للنموذج وTurnstile وResend
  باستخدام Mocks، والهاتف، وJavaScript المعطّل، وAPI routing في Workers emulator.
- 10 مقارنات screenshots كاملة مع `main` بعرض 1440 و390 لصفحات Home وContact
  وManufacturing وServices وPortfolio. الحركة والجهات الخارجية والفيديو/الخريطة
  مضبوطة بالطريقة نفسها في النسختين. هذه لا تثبت تشغيل الخدمات الخارجية الحية.
- اختبارات جديدة في المتصفح الفعلي وWrangler المحلي لـ301/query strings وHEAD
  وAdmin deep links/refresh وERP Demo guard/login/logout و404 للملفات المفقودة.
- `wrangler deploy --dry-run`: بناء Worker و79 أصلًا عامًا دون نشر.
- تبقى سياسة عدم ادعاء نجاح البريد كما هي: KV وحده لا يعني الإرسال، وقبول Resend
  ليس ضمان وصول Inbox. لم تُرسل رسائل حقيقية ولم تُختبر بيانات ERP إنتاجية.

يوجد امتداد أفقي سابق في Home عند عرض 390 في بيئة الاختبار، مطابق للأصل؛ لم
يُعدّل خارج نطاق هذا العمل. سياسة الاحتفاظ 90 يومًا وموارد التفعيل اللازمة
للنموذج لم تتغير؛ راجع [دليل التفعيل](CONTACT-ACTIVATION.md).

## تكاملات خارجية تحتاج إزالة يدوية — لم تُعدّل

**المثبت:** GitHub ينشر status باسم
`netlify/sensational-dango-8e6719/deploy-preview`، مع معاينة
`https://deploy-preview-14--sensational-dango-8e6719.netlify.app`.
هذا تكامل حساب خارجي موجود قبل التنظيف؛ حذف ملف الإعداد لا يفصله. قد يؤدي push
المصرح لتحديث PR إلى تشغيل معاينة تلقائية فيه حتى يفصله المالك.

**حد الوصول:** محاولة قراءة GitHub repository webhooks عبر API أعادت
`403 Resource not accessible by integration`. لذلك لم يُدّع تدقيق قائمة webhooks
أو GitHub Apps الخارجية بالكامل، ولم تُحذف أو تُعطل أي منها.

**DNS العام المرصود:** NS هما `gerardo.ns.cloudflare.com` و
`mia.ns.cloudflare.com`؛ سجلات A العامة الظاهرة هي `172.67.183.148` و
`104.21.51.181`، ولا أعاد استعلام CNAME العام لـ`www.avamarie.co` إجابة CNAME.
هذه ملاحظة قراءة فقط، وليست قيمًا ينبغي نسخها أو تعديلها. Cloudflare proxy/flattening
قد يخفي target داخليًا؛ لا يكفي DNS العام لإثبات غياب توجيه قديم في لوحة الحساب.

بعد موافقة مستقلة، ينفذ المالك بالترتيب:

1. يفحص إعدادات المشروع الخارجي `sensational-dango-8e6719` ويؤكد ربطه بـAva Marie
   فقط. يفصل مستودع Ava Marie ويوقف builds/deploy previews/build hooks الخاصة به،
   أو يحذف المشروع فقط بعد التأكد من عدم استخدامه لموقع آخر وعدم الحاجة لبياناته.
2. يراجع GitHub Repository Settings: Webhooks وInstalled GitHub Apps وActions
   secrets/variables وdeployment environments. يزيل ارتباط المشروع القديم
   والمفاتيح الخاصة به فقط. إذا كانت GitHub App مشتركة، يزيل صلاحيتها عن هذا
   المستودع وحده؛ لا يؤثر على portfolio/aberbach.co أو مستودعات أخرى.
3. يراجع branch protection/rulesets ويزيل اشتراط status القديم `netlify/...`
   بعد فصله، مع الاحتفاظ بفحص `Contact backend checks / verify` وفحوص Cloudflare
   المطلوبة. workflow الموجود في المستودع يفحص فقط ولا ينشر إنتاجيًا.
4. يراجع لوحة DNS الفعلية وسجلات A/AAAA/CNAME لكل من apex وwww وأي domain aliases
   وسجلات تحقق تخص الاستضافة المحذوفة. يزيل/يستبدل ما يثبت ارتباطه القديم فقط
   بعد تأكيد Worker/custom-domain routing على Cloudflare. لا يخمّن أهداف DNS
   ولا يحذف MX/SPF/DKIM/DMARC أو سجلات Resend أو أي خدمة أعمال غير مرتبطة.
5. يراجع Identity/Git Gateway والخدمات/المتغيرات/المفاتيح القديمة في حساب المشروع؛
   يوقفها أو يلغي مفاتيحها بعد التحقق من ملكيتها واستخدامها، دون تغيير ERP Demo
   أو افتراض وجود بديل مصادقة إنتاجي. يحفظ بيانات أو سجلات مطلوبة قبل حذف خدمة.
6. بعد التغيير الخارجي المصرح، يتحقق أن pushes لا تشغّل المزود المتقاعد، وأن DNS
   والنطاق يقدمان Cloudflare، ثم ينفذ تفعيل النموذج واختبار التسليم وفق الموافقة.

يبقى PR مفتوحًا للمراجعة. تحديث الكود وحده لا يزيل تكامل حساب خارجي، ولا يمنح
إذنًا لنشر إنتاجي أو تغيير إعدادات المصادقة أو DNS.
