.class public Lapp/nexushq/mobile/TitleRunnable;
.super Ljava/lang/Object;
.source "TitleRunnable.java"

# implements java/lang/Runnable

# instance fields
.field private final act:Landroid/app/Activity;
.field private final title:Ljava/lang/String;


# direct methods
.method public constructor <init>(Landroid/app/Activity;Ljava/lang/String;)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lapp/nexushq/mobile/TitleRunnable;->act:Landroid/app/Activity;

    iput-object p2, p0, Lapp/nexushq/mobile/TitleRunnable;->title:Ljava/lang/String;

    return-void
.end method


# virtual methods
.method public run()V
    .locals 2

    iget-object v0, p0, Lapp/nexushq/mobile/TitleRunnable;->act:Landroid/app/Activity;

    iget-object v1, p0, Lapp/nexushq/mobile/TitleRunnable;->title:Ljava/lang/String;

    invoke-virtual {v0, v1}, Landroid/app/Activity;->setTitle(Ljava/lang/CharSequence;)V

    return-void
.end method
