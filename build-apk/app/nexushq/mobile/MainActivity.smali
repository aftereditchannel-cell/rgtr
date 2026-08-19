.class public Lapp/nexushq/mobile/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"


# instance fields
.field private wv:Landroid/webkit/WebView;


# direct methods
.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method


# virtual methods
.method protected onCreate(Landroid/os/Bundle;)V
    .locals 4

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # نوار وضعیت هم‌رنگ پس‌زمینه‌ی تیره‌ی برنامه
    invoke-virtual {p0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;
    move-result-object v0
    const v1, -0xf7f6f4
    invoke-virtual {v0, v1}, Landroid/view/Window;->setStatusBarColor(I)V

    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lapp/nexushq/mobile/MainActivity;->wv:Landroid/webkit/WebView;

    # پس‌زمینه‌ی تیره تا لحظه‌ی بارگذاری، سفیدی دیده نشود
    const v1, -0xf7f6f4
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1

    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDatabaseEnabled(Z)V
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    const/16 v2, 0x64
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setTextZoom(I)V

    new-instance v1, Landroid/webkit/WebChromeClient;
    invoke-direct {v1}, Landroid/webkit/WebChromeClient;-><init>()V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    # همه‌ی درخواست‌های https://app.nexushq.mobile از داخل APK سرو می‌شوند (کاملاً آفلاین)
    new-instance v1, Lapp/nexushq/mobile/AssetClient;
    invoke-direct {v1}, Lapp/nexushq/mobile/AssetClient;-><init>()V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    # پل بومی JS: مخزن کلید + تنظیم عنوان (حافظه‌ی خصوصی برنامه)
    new-instance v1, Lapp/nexushq/mobile/KeyBridge;
    invoke-direct {v1, p0}, Lapp/nexushq/mobile/KeyBridge;-><init>(Landroid/app/Activity;)V
    const-string v2, "NexusKeyStore"
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V
    const-string v2, "NexusNative"
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-virtual {p0, v0}, Landroid/app/Activity;->setContentView(Landroid/view/View;)V

    const-string v1, "https://app.nexushq.mobile/index.html"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    return-void
.end method

# نتیجه‌ی احراز قفل دستگاه (اثر انگشت/PIN) به صفحه‌ی وب برمی‌گردد
.method protected onActivityResult(IILandroid/content/Intent;)V
    .locals 4

    const/16 v0, 0x1b59

    if-ne p1, v0, :not_bio

    iget-object v0, p0, Lapp/nexushq/mobile/MainActivity;->wv:Landroid/webkit/WebView;

    new-instance v1, Ljava/lang/StringBuilder;

    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V

    const-string v2, "window.__nxBioResult&&window.__nxBioResult("

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v1

    const/4 v2, -0x1

    if-ne p2, v2, :failed

    const-string v2, "true"

    goto :append

    :failed
    const-string v2, "false"

    :append
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v1

    const-string v2, ")"

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    :not_bio
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V

    return-void
.end method

.method public onBackPressed()V
    .locals 1

    iget-object v0, p0, Lapp/nexushq/mobile/MainActivity;->wv:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v0

    if-eqz v0, :cond_back

    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V

    return-void

    :cond_back
    iget-object v0, p0, Lapp/nexushq/mobile/MainActivity;->wv:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V

    return-void
.end method
