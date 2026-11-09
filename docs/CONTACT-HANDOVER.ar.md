# تقرير تسليم Backend نموذج Ava Marie

تاريخ الفحص: 7 نوفمبر 2026. النطاق: **Phase A** فقط. لم يُنفذ Deploy أو Merge أو
تعديل DNS أو إعدادات Cloudflare، ولم تُرسل رسائل بريد فعلية أثناء الاختبار.

## A — التشخيص الأولي

فُحص `main` في Ava Marie عند `24e736536f7cbc652b3af921effab7e352aa0aab`، والمرجع
portfolio عند `e72bec76978b89985b9621e64c34f8d4aac59e0e` دون تعديل ملفاته.
شمل الفحص ملفات HTML و`wrangler.jsonc` و`netlify.toml` و`.gitignore` و`scripts/build.py`،
وفي المرجع `worker/index.ts` و`BriefForm.astro` واختبارات Worker ودليل Backend activation.

كان النموذج في `index.html` يستخدم Netlify ويرسل `POST /` ثم يعرض
`SENT SUCCESSFULLY` لأي Promise مكتمل من fetch، حتى إذا كان HTTP 404 أو 500.
لم يكن هناك Worker فعلي لمعالجة النموذج. كان `assets.directory` يشير إلى جذر
المستودع، مما يجعل إضافة ملفات Backend/اختبار/إعدادات هناك غير آمنة للنشر.
`contact/index.html` وبقية الصفحات الست تُولّد من `index.html`؛ ليست مصادر مستقلة.

## B — التنفيذ

| الملفات | التغيير |
|---|---|
| `worker/index.js` — جديد | `POST /api/contact` و`GET /api/contact-config`، validation، Turnstile، Origin، honeypot، rate limiter، KV، Resend |
| `js/contact.js` — جديد | حالة إرسال، فحص HTTP وJSON، منع النقر المتكرر، الاحتفاظ بالمدخلات، reset بعد قبول حقيقي فقط، ARIA |
| `index.html` — معدل | ربط النموذج، حدود الحقول، labels، fallback إلى عنوان الأعمال الموجود، إزالة معالجة Netlify القديمة |
| `contact/`, `our-story/`, `manufacturing/`, `services/`, `portfolio/`, `partners/` | إعادة التوليد باستخدام `scripts/build.py` دون تعديل مستقل |
| `scripts/stage_assets.py` — جديد | Allowlist للملفات العامة إلى `dist/`؛ رفض hidden files وsymlinks والصيغ غير المراجعة |
| `wrangler.jsonc` — معدل | نقطة دخول Worker وASSETS وتوجيه API وAdmin والتحويلات قبل الأصول والبناء؛ دون اختلاق Resource IDs |
| `package.json`, `package-lock.json`, `playwright.config.js` — جديدة | أدوات اختبار وبناء محلية بإصدارات مثبتة؛ لا Runtime dependencies |
| `tests/worker.test.js`, `tests/test_site.py`, `tests/browser/contact.spec.js` — جديدة | اختبارات Backend والمتصفح والحفاظ على الموقع |
| `.github/workflows/contact-checks.yml` — جديد | فحوص Pull Request؛ لا Deploy فعلي |
| `.gitignore`, `.dev.vars.example` | حماية ملفات الأسرار والمخرجات؛ مفاتيح Turnstile الاختبارية العامة للتطوير فقط |
| `docs/CONTACT-ACTIVATION.md` | دليل التشغيل والتفعيل والاسترداد المرتب للمالك |

أُبقي `scripts/build.py` دون تغيير. في التحديث الإلزامي أُزيل `netlify.toml` وسكربت
Netlify Identity ومعالجه بالكامل؛ نُقل التوجيه المطلوب إلى Worker. راجع
[تقرير Cloudflare-only](CLOUDFLARE-ONLY.ar.md). لم يتغير ترتيب الحقول أو إلزاميتها:
Email وMessage مطلوبان؛ بقية الحقول اختيارية. الحد الكلي للطلب 16 KiB، والرسالة
5000 حرف وفق طول JavaScript، مع حدود منفصلة للحقول وتطبيع المسافات/الأسطر.
يُرفض JSON غير السليم والأنواع غير المدعومة والأساليب غير المسموحة.

تُفحص Turnstile عبر Siteverify على الخادم مع action وhostname وOrigin.
نقص الإعدادات يُنتج 503 ولا يعطل الحماية. المفتاح العام يُقرأ وقت التشغيل من
`/api/contact-config`؛ لا حاجة لتعديل HTML المُولّد. السر وResend key لا يصلان للمتصفح.

تُحفظ الحقول اللازمة في KV مستقل **قبل** Resend لمدة 90 يومًا. بعد تحديث القالب
في 9 نوفمبر 2026، البريد بنسختَي HTML وPlain text منظمتين؛ جميع مدخلات العميل
في HTML مُرمّزة لمنع HTML injection، وعنوان العميل هو Reply-To. لا يوجد مستلم مفترض أو API key
حقيقي داخل الكود. لا يظهر النجاح إلا بعد HTTP ناجح من Resend مع email ID صالح.
القبول لدى Resend لا يضمن الوصول إلى Inbox.

فشل البريد يُبقي الاستفسار للاسترداد ويعيد 502 مع نتيجة صريحة؛ فشل الحفظ يمنع
محاولة البريد. علامة `accepted:` منفصلة عن `enquiry:` ولا تُكتب بمجرد الحفظ.
لا توجد Queue أو إعادة إرسال تلقائية أو R2. استُخدم Resend Idempotency-Key للمحاولة
نفسها ضمن نافذة 24 ساعة، مع توثيق حدود منع التكرار. KV ليس Atomic lock.
Rate limiting يستخدم Cloudflare native binding وهو تقريبي لكل location؛ لا يُدّعى
أنه حد عالمي صارم. تفاصيل الاسترداد ومراجعة Resend قبل أي إعادة إرسال بالدليل.

## C — التحقق وحدوده

- `npm test`: **87 Backend/routing tests** و**6 مجموعات Website regression** ناجحة.
- `npm run test:browser`: **40 حالة متصفح**؛ تشمل مسارات
  النجاح والفشل والتكرار والمهلة وJavaScript المعطّل والتنقل والاستجابة على الهاتف.
- عشر مقارنات صور كاملة مع `main`: Home وContact وManufacturing وServices وPortfolio
  بعرض 1440 و390؛ تتطابق الصور في بيئة الاختبار المضبوطة.
- اختبار المحتوى يقارن head/SEO/canonical وJSON-LD وCSS والتنقل وfooter وحالات الصفحات
  بالأصل، ويتحقق من تطابق الملفات العامة السابقة بايتًا ببايت.
- البناء المتكرر ينتج الملفات نفسها. فحص staging يرفض الملفات المخفية وsymlinks.
- `wrangler deploy --dry-run`: بناء Worker وقراءة 79 ملفًا عامًا دون نشر.
- Workers emulator المحلي: `POST /api/contact` يصل إلى Worker حتى مع
  `Accept:text/html`؛ نقص إعدادات الإنتاج يعيد 503. ملفات التطوير تعيد 404.

خلال تطوير الاختبارات عولجت حالة رد HTTP فاشل يحمل نص نجاح، وصُححت selectors
والتنقل في test harness. يوجد امتداد أفقي سابق في Home عند عرض 390 في بيئة
الاختبار؛ بقي مطابقًا للأصل ولم يُعدّل خارج نطاق النموذج.

المقارنات البصرية تحجب مصادر الجهات الخارجية والفيديو/الخريطة وتوقف الحركة
بالطريقة نفسها في النسختين لضمان ثبات المقارنة. لا تثبت تشغيل خرائط Google أو
الفيديو أو الخطوط الخارجية على الإنتاج. أصولها وروابطها الأصلية محفوظة.
مفاتيح Turnstile وResend وموارد Cloudflare الحقيقية وDNS والوصول الفعلي للبريد
**غير متحققة**. اختبارات البريد وSiteverify تستخدم Mocks ولا ترسل بريدًا فعليًا.

## D — GitHub وجاهزية المراجعة

الفرع: `codex/avamarie-contact-backend`؛ الهدف `main`.
توجد hashes ووصلة Pull Request في رسالة التسليم النهائية ووصف Pull Request.
الكود قابل للمراجعة؛ التفعيل الإنتاجي مشروط بإعداد الموارد وتفويض Phase B.
يجب مراجعة أي Auto-deploy متصل بـmain قبل الدمج؛ لا يُنصح بدمج يطلق Deploy
تلقائيًا قبل تجهيز الإعدادات والحصول على موافقة المالك.

## E — تسلسل تفعيل المالك

التفاصيل والأوامر الدقيقة في [CONTACT-ACTIVATION.md](CONTACT-ACTIVATION.md).
بعد الموافقة الصريحة فقط:

1. تأكيد حساب Cloudflare وWorker `avamarie` وارتباط النطاق ومسار البناء إلى `dist/`،
   والمحافظة على `run_worker_first` وفحص Auto-deploy وخطة الرجوع.
2. إنشاء/تأكيد هوية إرسال Resend خاصة بـAva Marie، وإضافة سجلات DNS الفعلية
   الصادرة من Resend دون تخمين أو تعديل هوية portfolio.
3. إنشاء Turnstile widget مستقل وallowed hostnames الفعلية، وضبط الموقع العام
   `TURNSTILE_SITE_KEY` والسر `TURNSTILE_SECRET` من الـwidget نفسه.
4. التحقق من KV المخصص المضاف `CONTACT_ENQUIRIES` بالمعرّف
   `c0db1995db8743888ccc54d79f033802`. أُضيف Native Rate Limiting باسم
   `CONTACT_RATE_LIMITER` ومعرّف `1862459001` وحد 20 محاولة/60 ثانية. لم يظهر تعارض
   في الإعدادات المتاحة، لكن التفرد على مستوى حساب Cloudflare غير متحقق؛ يلزم فحصه
   قبل التفعيل وفق دليل التشغيل. هذا الربط ليس KV.
5. ضبط `CONTACT_TO_EMAIL` من المالك و`CONTACT_FROM_EMAIL` على هوية الإرسال المتحققة،
   وضبط `RESEND_API_KEY` المستقل كـSecret، و`ENVIRONMENT=production` و`CONTACT_ORIGINS`.
6. إعادة الفحوص وDry run، ثم Deploy المصرح به، وفحص API والملفات العامة وحجب ملفات التطوير.
7. إرسال رسالة اختبار واحدة مصرح بها من النموذج إلى بريد مراقب؛ توثيق reference
   وعلامة KV وقبول Resend ثم الوصول الفعلي وReply-To.
8. مراقبة الفشل يوميًا واتباع جدول HTTP وخطوات استرداد KV في الدليل؛ لا إعادة
   إرسال تلقائية، ولا حذف سجل لمجرد غياب علامة قبول، فقد يكون رد المزود قد ضاع.

القيم التي لا تزال تتطلب المالك: المستلم، عنوان ونطاق الإرسال المتحقق وسجلاته،
Resend key، مفتاحا Turnstile، تأكيد حساب KV وتفرد rate-limit namespace ID على مستوى
الحساب، تأكيد حساب/مسارات Cloudflare وأي صلاحيات نشر وسياسة احتفاظ وخصوصية ملائمة.

## F — تأكيد السلامة

- التصميم: CSS وترتيب الحقول وصفحات الأعمال محفوظة؛ المقارنات المضبوطة متطابقة.
- SEO وcanonical وstructured data: محفوظة ومقارنة آليًا.
- الصور والفيديو والملفات الثابتة السابقة: لم تتغير؛ فُحصت مطابقة المحتوى العام.
- Admin/ERP: الملفات محفوظة. اختُبر تشغيل مسارات Admin العميقة وتحديث الصفحة،
  وERP guard ورفض كلمة مرور خاطئة وDemo sign-in وlogout محليًا. هذه ليست
  مصادقة خادم آمنة؛ بيانات الإنتاج والحماية الخارجية **غير متحققة** ولم تُعدل.
- aberbach.co/portfolio: مرجع للقراءة فقط؛ working tree نظيف، ولم تُعدل موارده أو أسراره.
- الإنتاج وDNS وCloudflare وResend: لم تُجرَ تغييرات خارجية أو اختبارات بريد حقيقية.
