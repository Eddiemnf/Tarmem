/* Copy for the public early-access site.

   Written for this implementation, not part of the approved design copy in
   tarmem-data.ts. It keeps the design's vocabulary (صاحب المنزل, مقاول موثّق,
   رسوم خدمة) and makes no promise the business has not made: no reply times,
   no guarantees, nothing about payments on the site. */

export interface LaunchCopy {
  /** The one-line notice on the home page after a wrong address, and its close button. */
  notFound: string;
  notFoundClose: string;
  notice: string;
  sendWhatsApp: string;
  filesIntro: string;
  contactSent: string;
  request: { heading: string; title: string; trade: string; city: string; address: string; budget: string; timing: string; desc: string; files: string; filesNote: string };
  contact: { heading: string; name: string; email: string; phone: string; topic: string; msg: string };
  join: {
    kicker: string; title: string; sub: string; points: string[];
    company: string; person: string; city: string; trades: string; tradesHint: string; cr: string; crHint: string; note: string; notePh: string;
    /** The rest of the trade list, one tap away, and the database's limit of twelve. */
    moreTrades: string; fewerTrades: string; tradesMax: string;
    send: string; error: string; heading: string;
    /** The terms checkbox (as on the homeowner's sign-up), and what joining costs. */
    agree: string; terms: string; and: string; privacy: string; agreeError: string;
    costTitle: string; cost: string; costLink: string;
  };
  /** The skip link at the top of every page. */
  skip: string;
  /** Search results: the home page's title, and each public page's description. */
  meta: { homeTitle: string; descriptions: Record<string, string> };
  sent: {
    kicker: string; titleProject: string; titleJoin: string; titleContact: string; lead: string;
    steps: string[]; stepsFiles: string; again: string; email: string; home: string; emailSubject: string;
  };
}

export const LAUNCH_COPY: Record<'ar' | 'en', LaunchCopy> = {
  ar: {
    notice: 'إطلاق مبكر: تصل طلباتكم مباشرة إلى فريق ترميم عبر واتساب. حسابات المنصة والدفع عبر الموقع غير مفعّلة بعد.',
    sendWhatsApp: 'أرسل الطلب عبر واتساب',
    filesIntro: 'صور المكان وأي مخططات أو ملفات تصميم تساعد المقاولين على تقديم عروض أدق. أرسلها في محادثة واتساب نفسها بعد إرسال طلبك، فالموقع لا يستقبل الملفات بعد.',
    contactSent: 'فتحنا لك واتساب ورسالتك مكتوبة. اضغط «إرسال» هناك لتصل إلى فريق ترميم.',
    request: {
      heading: 'طلب مشروع جديد — ترميم', title: 'العنوان', trade: 'التخصص', city: 'المدينة', address: 'الحي / العنوان',
      budget: 'الميزانية', timing: 'موعد البدء', desc: 'الوصف', files: 'المرفقات',
      filesNote: 'سأرسلها في هذه المحادثة',
    },
    notFound: 'العنوان الذي فتحته غير موجود، فهذه هي الصفحة الرئيسية.', notFoundClose: 'إغلاق',
    contact: { heading: 'رسالة من موقع ترميم', name: 'الاسم', email: 'البريد', phone: 'الجوال', topic: 'الموضوع', msg: 'الرسالة' },
    join: {
      kicker: 'للمقاولين', title: 'انضم إلى ترميم كمقاول',
      sub: 'نراجع كل مقاول قبل أن نرشّحه لأي صاحب منزل. أرسل بيانات منشأتك وسيتواصل معك فريق ترميم لاستكمال التحقق.',
      points: ['نرشّحك لمشاريع تناسب مدينتك وتخصصك', 'نتحقق من الهوية والسجل التجاري والتراخيص قبل أي ترشيح', 'يتواصل معك فريق ترميم عبر واتساب لاستكمال الطلب'],
      company: 'اسم المنشأة', person: 'اسم المسؤول', city: 'المدينة', trades: 'التخصصات', tradesHint: 'اختر كل ما ينطبق، حتى 12 تخصصًا',
      moreTrades: 'تخصصات أخرى', fewerTrades: 'إخفاء التخصصات الأخرى', tradesMax: 'اختر حتى 12 تخصصًا. ألغِ تخصصًا لتضيف غيره.',
      cr: 'رقم السجل التجاري', crHint: 'اختياري الآن، ومطلوب عند التحقق', note: 'نبذة عن أعمالكم', notePh: 'سنوات الخبرة، حجم الفريق، أبرز المشاريع…',
      send: 'أرسل الطلب عبر واتساب', error: 'أدخل اسم المنشأة واسم المسؤول واختر تخصصًا واحدًا على الأقل.',
      heading: 'طلب انضمام مقاول — ترميم',
      agree: 'أوافق على', terms: 'شروط الاستخدام', and: 'و', privacy: 'سياسة الخصوصية', agreeError: 'يلزم قبول شروط الاستخدام وسياسة الخصوصية.',
      costTitle: 'التكلفة',
      cost: 'الانضمام وتقديم العروض مجانًا. وعلى المشاريع التي تفوز بها، تُخصم رسوم خدمة 9% من قيمة العمل المتفق عليها، مع ضريبة القيمة المضافة على الرسوم، من كل دفعة تُصرف لك.',
      costLink: 'تفاصيل الأسعار',
    },
    skip: 'تخطَّ إلى المحتوى',
    meta: {
      homeTitle: 'ترميم | ترميم المنازل مع مقاولين موثّقين في السعودية',
      descriptions: {
        home: 'انشر مشروع ترميم منزلك مجانًا، واستقبل عروضًا من مقاولين موثّقين في السعودية، وقارن واختر وادفع على مراحل مع سجل موثّق للمشروع.',
        how: 'كيف تعمل ترميم: انشر مشروعك، وقارن عروض المقاولين الموثّقين، واتفق على المراحل، وتابع التنفيذ حتى الاستلام.',
        pricing: 'أسعار ترميم: النشر والعروض مجانًا، ورسوم خدمة 1% لصاحب المنزل و9% للمقاول على قيمة العمل المتفق عليها، مع حاسبة بالأرقام.',
        about: 'عن ترميم: منصة سعودية تربط أصحاب المنازل بمقاولين موثّقين، وتجعل الترميم واضحًا من أوله إلى آخره.',
        help: 'مركز المساعدة في ترميم: أدلة عن الحساب والدفعات والمراحل والتأخير والاسترداد والنزاعات.',
        faq: 'الأسئلة الشائعة عن ترميم: المقاول الموثّق، والدفع على مراحل، والرسوم، والخلافات، والهوية.',
        contact: 'تواصل مع فريق ترميم بالبريد أو واتساب أو نموذج التواصل، من الأحد إلى الخميس.',
        rules: 'الاسترداد وحل الخلافات في ترميم: متى يعود المال، وقواعد التأخير، ومسار الخلاف من الطرفين إلى الجهة المختصة.',
        terms: 'شروط استخدام ترميم: الحسابات والرسوم والدفعات المرحلية والتأخير والنزاعات والمسؤولية.',
        privacy: 'سياسة الخصوصية في ترميم: ما نجمعه ولماذا، ومن يراه، ومدة حفظه، وحقوقك.',
        post: 'انشر مشروع ترميم منزلك مجانًا في دقيقتين، واستقبل عروضًا من مقاولين موثّقين.',
        join: 'انضم إلى ترميم كمقاول: الانضمام مجاني، ونراجع كل مقاول قبل ترشيحه لأصحاب المنازل.',
      },
    },
    sent: {
      kicker: 'خطوة أخيرة', titleProject: 'طلبك جاهز في واتساب', titleJoin: 'طلب انضمامك جاهز في واتساب', titleContact: 'رسالتك جاهزة في واتساب',
      lead: 'كتبنا التفاصيل نيابةً عنك. لن يصل شيء إلى فريق ترميم قبل أن تضغط «إرسال» في واتساب.',
      steps: ['اضغط «إرسال» في محادثة واتساب التي فُتحت.', 'يردّ عليك فريق ترميم في المحادثة نفسها.'],
      stepsFiles: 'أرفق صور المكان في المحادثة نفسها.',
      again: 'افتح واتساب مرة أخرى', email: 'أرسله بالبريد الإلكتروني بدلًا من ذلك', home: 'العودة إلى الرئيسية',
      emailSubject: 'طلب من موقع ترميم',
    },
  },
  en: {
    notice: 'Early access: requests go straight to the Tarmem team on WhatsApp. Platform accounts and payments on the site are not active yet.',
    sendWhatsApp: 'Send the request on WhatsApp',
    filesIntro: 'Photos of the space, and any drawings or design files, help contractors quote accurately. Send them in the same WhatsApp chat after your request — the site does not take files yet.',
    contactSent: 'WhatsApp is open with your message written out. Press Send there and it reaches the Tarmem team.',
    request: {
      heading: 'New project request — Tarmem', title: 'Title', trade: 'Trade', city: 'City', address: 'District / address',
      budget: 'Budget', timing: 'Start', desc: 'Description', files: 'Attachments',
      filesNote: 'I will send them in this chat',
    },
    notFound: 'That address does not exist, so this is the home page.', notFoundClose: 'Close',
    contact: { heading: 'Message from the Tarmem website', name: 'Name', email: 'Email', phone: 'Mobile', topic: 'Topic', msg: 'Message' },
    join: {
      kicker: 'For contractors', title: 'Join Tarmem as a contractor',
      sub: 'We review every contractor before recommending them to a homeowner. Send your business details and the Tarmem team will contact you to complete verification.',
      points: ['We put you forward for projects that match your city and trade', 'Identity, commercial registration and licences are checked before any recommendation', 'The Tarmem team follows up with you on WhatsApp to complete the application'],
      company: 'Business name', person: 'Contact person', city: 'City', trades: 'Trades', tradesHint: 'Choose all that apply, up to 12',
      moreTrades: 'More trades', fewerTrades: 'Hide the other trades', tradesMax: 'Choose up to 12 trades. Remove one to add another.',
      cr: 'Commercial registration number', crHint: 'Optional now, required for verification', note: 'About your work', notePh: 'Years of experience, team size, notable projects…',
      send: 'Send the application on WhatsApp', error: 'Enter the business name and contact person, and choose at least one trade.',
      heading: 'Contractor application — Tarmem',
      agree: 'I agree to the', terms: 'Terms of use', and: 'and the', privacy: 'Privacy policy', agreeError: 'Please accept the Terms of use and the Privacy policy.',
      costTitle: 'What it costs',
      cost: 'Joining and bidding are free. On work you win, a 9% commission on the agreed work value, plus VAT on the commission, is deducted from each payment released to you.',
      costLink: 'See pricing',
    },
    skip: 'Skip to content',
    meta: {
      homeTitle: 'Tarmem | Home renovation with verified contractors in Saudi Arabia',
      descriptions: {
        home: 'Post your home renovation project for free, get bids from verified contractors in Saudi Arabia, compare them and pay stage by stage with a documented project record.',
        how: 'How Tarmem works: post your project, compare bids from verified contractors, agree the stages and follow the work to handover.',
        pricing: 'Tarmem pricing: posting and bids are free; a 1% homeowner fee and a 9% contractor commission on the agreed work value, with a calculator.',
        about: 'About Tarmem: a Saudi platform that connects homeowners with verified contractors and makes renovation clear from start to finish.',
        help: 'Tarmem help centre: guides on accounts, payments, stages, late delivery, refunds and disputes.',
        faq: 'Tarmem FAQ: verified contractors, paying by stage, fees, disagreements and ID.',
        contact: 'Contact the Tarmem team by email, WhatsApp or the contact form, Sunday to Thursday.',
        rules: 'Refunds and disputes on Tarmem: when money comes back, the late-delivery rules, and the dispute route from the parties to the competent authority.',
        terms: 'Tarmem terms of use: accounts, fees, stage payments, late delivery, disputes and liability.',
        privacy: 'Tarmem privacy policy: what we collect and why, who sees it, how long we keep it, and your rights.',
        post: 'Post your home renovation project for free in two minutes and get bids from verified contractors.',
        join: 'Join Tarmem as a contractor: joining is free, and every contractor is reviewed before being put forward to homeowners.',
      },
    },
    sent: {
      kicker: 'One last step', titleProject: 'Your request is ready in WhatsApp', titleJoin: 'Your application is ready in WhatsApp', titleContact: 'Your message is ready in WhatsApp',
      lead: 'We wrote the details out for you. Nothing reaches the Tarmem team until you press Send in WhatsApp.',
      steps: ['Press Send in the WhatsApp chat that opened.', 'The Tarmem team replies in that same chat.'],
      stepsFiles: 'Attach your photos of the space in the same chat.',
      again: 'Open WhatsApp again', email: 'Send it by email instead', home: 'Back to the home page',
      emailSubject: 'Request from the Tarmem website',
    },
  },
};
