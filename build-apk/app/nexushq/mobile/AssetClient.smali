.class public Lapp/nexushq/mobile/AssetClient;
.super Landroid/webkit/WebViewClient;
.source "AssetClient.java"


# direct methods
.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    return-void
.end method

.method private static mime(Ljava/lang/String;)Ljava/lang/String;
    .locals 2

    const-string v0, ".html"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :not_html
    const-string v0, "text/html"
    return-object v0

    :not_html
    const-string v0, ".js"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :not_js
    const-string v0, "application/javascript"
    return-object v0

    :not_js
    const-string v0, ".css"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :not_css
    const-string v0, "text/css"
    return-object v0

    :not_css
    const-string v0, ".json"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :not_json
    const-string v0, "application/json"
    return-object v0

    :not_json
    const-string v0, ".svg"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :not_svg
    const-string v0, "image/svg+xml"
    return-object v0

    :not_svg
    const-string v0, ".png"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :not_png
    const-string v0, "image/png"
    return-object v0

    :not_png
    const-string v0, ".woff2"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :not_woff2
    const-string v0, "font/woff2"
    return-object v0

    :not_woff2
    const-string v0, ".woff"
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :not_woff
    const-string v0, "font/woff"
    return-object v0

    :not_woff
    const-string v0, "application/octet-stream"
    return-object v0
.end method


# virtual methods
.method public shouldInterceptRequest(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Landroid/webkit/WebResourceResponse;
    .locals 9

    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0

    # ---------- دروازه‌ی بومی: api.nexushq.mobile/proxy?url=… ----------
    invoke-virtual {v0}, Landroid/net/Uri;->getHost()Ljava/lang/String;
    move-result-object v1
    const-string v2, "api.nexushq.mobile"
    invoke-virtual {v2, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v1
    if-eqz v1, :not_gateway

    :try_start_gw
    const-string v1, "url"
    invoke-virtual {v0, v1}, Landroid/net/Uri;->getQueryParameter(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1

    if-eqz v1, :gw_fail

    new-instance v2, Ljava/net/URL;
    invoke-direct {v2, v1}, Ljava/net/URL;-><init>(Ljava/lang/String;)V
    invoke-virtual {v2}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;
    move-result-object v2
    check-cast v2, Ljava/net/HttpURLConnection;

    # متد
    const-string v3, "method"
    invoke-virtual {v0, v3}, Landroid/net/Uri;->getQueryParameter(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    if-eqz v3, :gw_no_method
    invoke-virtual {v2, v3}, Ljava/net/HttpURLConnection;->setRequestMethod(Ljava/lang/String;)V
    :gw_no_method

    const/16 v3, 0x4e20
    invoke-virtual {v2, v3}, Ljava/net/HttpURLConnection;->setConnectTimeout(I)V
    invoke-virtual {v2, v3}, Ljava/net/HttpURLConnection;->setReadTimeout(I)V

    # هدرها: h=K: V~~K: V
    const-string v3, "h"
    invoke-virtual {v0, v3}, Landroid/net/Uri;->getQueryParameter(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    if-eqz v3, :gw_no_headers
    const-string v4, "~~"
    invoke-virtual {v3, v4}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;
    move-result-object v3
    array-length v4, v3
    const/4 v5, 0x0
    :gw_hdr_loop
    if-ge v5, v4, :gw_no_headers
    aget-object v6, v3, v5
    const-string v7, ": "
    invoke-virtual {v6, v7}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I
    move-result v7
    if-lez v7, :gw_hdr_next
    # نام هدر = substring(0, idx)
    invoke-static {v6, v7}, Lapp/nexushq/mobile/AssetClient;->hdrName(Ljava/lang/String;I)Ljava/lang/String;
    move-result-object v8
    # مقدار = substring(idx + 2)
    add-int/lit8 v7, v7, 0x2
    invoke-virtual {v6, v7}, Ljava/lang/String;->substring(I)Ljava/lang/String;
    move-result-object v6
    invoke-virtual {v2, v8, v6}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V
    :gw_hdr_next
    add-int/lit8 v5, v5, 0x1
    goto :gw_hdr_loop
    :gw_no_headers

    # بدنه (در صورت وجود)
    const-string v3, "body"
    invoke-virtual {v0, v3}, Landroid/net/Uri;->getQueryParameter(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    if-eqz v3, :gw_no_body
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->setDoOutput(Z)V
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->getOutputStream()Ljava/io/OutputStream;
    move-result-object v4
    const-string v5, "UTF-8"
    invoke-virtual {v3, v5}, Ljava/lang/String;->getBytes(Ljava/lang/String;)[B
    move-result-object v5
    invoke-virtual {v4, v5}, Ljava/io/OutputStream;->write([B)V
    invoke-virtual {v4}, Ljava/io/OutputStream;->close()V
    :gw_no_body

    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->connect()V

    # خواندن پاسخ
    new-instance v3, Ljava/io/ByteArrayOutputStream;
    invoke-direct {v3}, Ljava/io/ByteArrayOutputStream;-><init>()V
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->getResponseCode()I
    move-result v4
    const/16 v5, 0x190
    if-lt v4, v5, :gw_ok_stream
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->getErrorStream()Ljava/io/InputStream;
    move-result-object v5
    if-eqz v5, :gw_ok_stream
    invoke-static {v5, v3}, Lapp/nexushq/mobile/AssetClient;->copyAll(Ljava/io/InputStream;Ljava/io/ByteArrayOutputStream;)V
    goto :gw_build_resp
    :gw_ok_stream
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->getInputStream()Ljava/io/InputStream;
    move-result-object v5
    invoke-static {v5, v3}, Lapp/nexushq/mobile/AssetClient;->copyAll(Ljava/io/InputStream;Ljava/io/ByteArrayOutputStream;)V

    :gw_build_resp
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->getContentType()Ljava/lang/String;
    move-result-object v5
    if-eqz v5, :gw_def_ctype
    goto :gw_have_ctype
    :gw_def_ctype
    const-string v5, "application/octet-stream"
    :gw_have_ctype

    new-instance v6, Ljava/util/HashMap;
    invoke-direct {v6}, Ljava/util/HashMap;-><init>()V
    const-string v7, "Access-Control-Allow-Origin"
    const-string v4, "*"
    invoke-virtual {v6, v7, v4}, Ljava/util/HashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    invoke-virtual {v3}, Ljava/io/ByteArrayOutputStream;->toByteArray()[B
    move-result-object v7
    new-instance v3, Ljava/io/ByteArrayInputStream;
    invoke-direct {v3, v7}, Ljava/io/ByteArrayInputStream;-><init>([B)V
    const-string v7, "utf-8"
    new-instance v4, Landroid/webkit/WebResourceResponse;
    invoke-direct {v4, v5, v7, v3, v6}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;Ljava/io/InputStream;Ljava/util/Map;)V
    return-object v4

    :gw_fail
    :try_end_gw
    .catch Ljava/lang/Exception; {:try_start_gw .. :try_end_gw} :gw_catch

    const/4 v4, 0x0
    return-object v4

    :gw_catch
    move-exception v4
    const/4 v5, 0x0
    return-object v5

    :not_gateway
    # ---------- مسیر عادی: سرو از assets ----------
    invoke-virtual {v0}, Landroid/net/Uri;->getPath()Ljava/lang/String;
    move-result-object v0

    if-eqz v0, :def_path
    invoke-virtual {v0}, Ljava/lang/String;->length()I
    move-result v1
    if-nez v1, :nonempty
    :def_path
    const-string v0, "/index.html"
    :nonempty

    const-string v1, "/"
    invoke-virtual {v0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v1
    if-eqz v1, :nostrip
    const/4 v1, 0x1
    invoke-virtual {v0, v1}, Ljava/lang/String;->substring(I)Ljava/lang/String;
    move-result-object v0
    :nostrip

    new-instance v1, Ljava/lang/StringBuilder;
    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V
    const-string v2, "public/"
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    move-result-object v1
    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    move-result-object v1
    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1

    :try_start_0
    invoke-virtual {p1}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;
    move-result-object v3
    invoke-virtual {v3}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;
    move-result-object v3
    invoke-virtual {v3, v1}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;
    move-result-object v3
    invoke-static {v1}, Lapp/nexushq/mobile/AssetClient;->mime(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v4
    new-instance v0, Landroid/webkit/WebResourceResponse;
    const-string v2, "utf-8"
    invoke-direct {v0, v4, v2, v3}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;Ljava/io/InputStream;)V
    return-object v0
    :try_end_0
    .catch Ljava/io/IOException; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :try_start_1
    const-string v1, "public/index.html"
    invoke-virtual {p1}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;
    move-result-object v3
    invoke-virtual {v3}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;
    move-result-object v3
    invoke-virtual {v3, v1}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;
    move-result-object v3
    new-instance v0, Landroid/webkit/WebResourceResponse;
    const-string v4, "text/html"
    const-string v2, "utf-8"
    invoke-direct {v0, v4, v2, v3}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;Ljava/io/InputStream;)V
    return-object v0
    :try_end_1
    .catch Ljava/io/IOException; {:try_start_1 .. :try_end_1} :catch_1

    :catch_1
    const/4 v0, 0x0
    return-object v0
.end method

.method static hdrName(Ljava/lang/String;I)Ljava/lang/String;
    .locals 1
    const/4 v0, 0x0
    invoke-virtual {p0, v0, p1}, Ljava/lang/String;->substring(II)Ljava/lang/String;
    move-result-object v0
    return-object v0
.end method

.method static copyAll(Ljava/io/InputStream;Ljava/io/ByteArrayOutputStream;)V
    .locals 4

    const/16 v0, 0x2000
    new-array v0, v0, [B

    :loop
    invoke-virtual {p0, v0}, Ljava/io/InputStream;->read([B)I
    move-result v1
    if-lez v1, :done
    const/4 v2, 0x0
    invoke-virtual {p1, v0, v2, v1}, Ljava/io/ByteArrayOutputStream;->write([BII)V
    goto :loop

    :done
    invoke-virtual {p0}, Ljava/io/InputStream;->close()V
    return-void
.end method
