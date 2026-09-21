/* Words the real-accounts pages need that the design does not have: it signs people in with a
   mobile code and Nafath, neither of which is connected yet, so the public site uses email and
   a password for now. Wording here is a first draft for the owner to review. */

export const PLATFORM_COPY = {
  ar: {
    notice: 'إطلاق مبكر: انشر مشروعك من الموقع ويتواصل معك فريق ترميم مباشرة. عروض المقاولين والدفع عبر الموقع قيد الإعداد.',
    signInTitle: 'سجّل دخولك', signUpTitle: 'أنشئ حسابك',
    signInLede: 'ادخل ببريدك الإلكتروني وكلمة المرور لمتابعة مشاريعك.',
    signUpLede: 'حساب واحد لنشر مشاريعك ومتابعتها. يستغرق دقيقة.',
    pendingPost: 'مشروعك جاهز. أنشئ حسابك أو سجّل دخولك لننشره باسمك.',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordHint: '8 أحرف على الأقل',
    name: 'الاسم الكامل', mobile: 'رقم الجوال', mobilePh: '05XXXXXXXX', city: 'المدينة',
    agree: 'أوافق على', terms: 'الشروط والأحكام', and: 'و', privacy: 'سياسة الخصوصية',
    signIn: 'تسجيل الدخول', signUp: 'إنشاء الحساب', working: 'لحظة…',
    contractorNote: 'مقاول؟ التسجيل للمقاولين يتم عبر', contractorLink: 'طلب الانضمام',
    forgot: 'نسيت كلمة المرور؟', forgotLink: 'راسلنا ونساعدك',
    confirmSent: 'أرسلنا رسالة تأكيد إلى بريدك. افتح الرابط الذي فيها ثم سجّل دخولك.',
    err: {
      email: 'اكتب بريدًا إلكترونيًا صحيحًا.', password: 'كلمة المرور 8 أحرف على الأقل.',
      name: 'اكتب اسمك الكامل.', mobile: 'اكتب رقم جوال صحيحًا، مثل 0551234567.', agree: 'يلزم قبول الشروط وسياسة الخصوصية.',
      wrong: 'البريد أو كلمة المرور غير صحيحة.', exists: 'يوجد حساب بهذا البريد. سجّل دخولك بدلًا من ذلك.',
      unconfirmed: 'أكّد بريدك من الرسالة التي أرسلناها، ثم سجّل دخولك.', rate: 'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.',
      network: 'تعذّر الاتصال. تحقق من الإنترنت وحاول مجددًا.', generic: 'حدث خطأ غير متوقع. حاول مجددًا.',
      notHomeowner: 'نشر المشاريع متاح لحسابات أصحاب المنازل فقط.', tooMany: 'لديك 10 مشاريع مفتوحة. أغلق أحدها قبل نشر مشروع جديد.',
      title: 'اكتب عنوانًا للمشروع (3 أحرف على الأقل).', desc: 'صف المشروع بجملة على الأقل.', budget: 'اكتب ميزانية صحيحة: الحد الأدنى لا يتجاوز الأعلى، والأعلى لا يتجاوز 1,000,000 ريال.',
    },
    posted: 'نُشر مشروعك. يراجعه فريق ترميم ويتواصل معك على جوالك خلال يوم عمل.',
    postedNoBids: 'استلمنا مشروعك. يراجعه فريق ترميم ويتواصل معك على جوالك خلال يوم عمل. ستظهر عروض المقاولين الموثّقين هنا فور وصولها.',
    publish: 'نشر المشروع', filesIntro: 'الصور تساعد كثيرًا. رفع الصور من الموقع قيد الإعداد، وسيطلبها منك فريقنا عند التواصل.',
    contactSent: 'وصلتنا رسالتك. نرد عليك خلال يوم عمل.', contactFailed: 'تعذّر إرسال الرسالة. حاول مجددًا.',
    joinSent: 'وصلنا طلبك. يتواصل معك فريق ترميم لاستكمال التوثيق.', joinSend: 'إرسال الطلب', inbox: 'الوارد',
  },
  en: {
    notice: 'Early access: post your project here and the Tarmem team contacts you directly. Contractor bids and payments on the site are on the way.',
    signInTitle: 'Sign in', signUpTitle: 'Create your account',
    signInLede: 'Use your email and password to follow your projects.',
    signUpLede: 'One account to post and follow your projects. It takes a minute.',
    pendingPost: 'Your project is ready. Create an account or sign in and we will post it under your name.',
    email: 'Email', password: 'Password', passwordHint: 'At least 8 characters',
    name: 'Full name', mobile: 'Mobile number', mobilePh: '05XXXXXXXX', city: 'City',
    agree: 'I agree to the', terms: 'Terms', and: 'and', privacy: 'Privacy Policy',
    signIn: 'Sign in', signUp: 'Create account', working: 'One moment…',
    contractorNote: 'A contractor? Contractors join through the', contractorLink: 'application form',
    forgot: 'Forgot your password?', forgotLink: 'Message us and we will help',
    confirmSent: 'We sent a confirmation email. Open the link in it, then sign in.',
    err: {
      email: 'Enter a valid email address.', password: 'The password needs at least 8 characters.',
      name: 'Enter your full name.', mobile: 'Enter a valid mobile number, like 0551234567.', agree: 'Please accept the Terms and the Privacy Policy.',
      wrong: 'The email or password is not right.', exists: 'An account with this email already exists. Sign in instead.',
      unconfirmed: 'Confirm your email from the message we sent, then sign in.', rate: 'Too many attempts. Wait a minute and try again.',
      network: 'Could not connect. Check your internet and try again.', generic: 'Something went wrong. Please try again.',
      notHomeowner: 'Only homeowner accounts can post projects.', tooMany: 'You have 10 open projects. Close one before posting another.',
      title: 'Give the project a title (at least 3 characters).', desc: 'Describe the project in at least a sentence.', budget: 'Enter a valid budget: the minimum cannot exceed the maximum, and the maximum cannot exceed SAR 1,000,000.',
    },
    posted: 'Your project is posted. Tarmem\'s team reviews it and contacts you on your mobile within one working day.',
    postedNoBids: 'We have your project. Tarmem\'s team reviews it and contacts you on your mobile within one working day. Bids from verified contractors will appear here as they arrive.',
    publish: 'Post project', filesIntro: 'Photos help a lot. Uploading from the site is on its way; our team will ask for them when they contact you.',
    contactSent: 'We have your message. We reply within one working day.', contactFailed: 'The message could not be sent. Please try again.',
    joinSent: 'We have your application. Tarmem\'s team will contact you to complete verification.', joinSend: 'Send application', inbox: 'Inbox',
  },
} as const;

export type PlatformLang = keyof typeof PLATFORM_COPY;
export type PlatformError = keyof typeof PLATFORM_COPY['en']['err'];
