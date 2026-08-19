.class public Lapp/nexushq/nat/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

.implements Landroid/view/View$OnClickListener;
.implements Landroid/widget/AdapterView$OnItemClickListener;
.implements Landroid/widget/AdapterView$OnItemLongClickListener;


# instance fields
.field private aboutTxt:Landroid/widget/TextView;
.field private adapter:Landroid/widget/ArrayAdapter;
.field private addBtn:Landroid/widget/Button;
.field private finAmts:Ljava/util/ArrayList;
.field private finNotes:Ljava/util/ArrayList;
.field private finTypes:Ljava/util/ArrayList;
.field private input:Landroid/widget/EditText;
.field private inputRow:Landroid/widget/LinearLayout;
.field private list:Landroid/widget/ListView;
.field private notePins:Ljava/util/ArrayList;
.field private notes:Ljava/util/ArrayList;
.field private prioBtn:Landroid/widget/Button;
.field private prios:Ljava/util/ArrayList;
.field private stats:Landroid/widget/TextView;
.field private tab:I
.field private prio:I
.field private finIn:I
.field private tabB0:Landroid/widget/Button;
.field private tabB1:Landroid/widget/Button;
.field private tabB2:Landroid/widget/Button;
.field private tabB3:Landroid/widget/Button;
.field private dones:Ljava/util/ArrayList;
.field private titles:Ljava/util/ArrayList;


# direct methods
.method public constructor <init>()V
    .locals 1
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    new-instance v0, Ljava/util/ArrayList; invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V iput-object v0, p0, Lapp/nexushq/nat/MainActivity;->titles:Ljava/util/ArrayList;
    new-instance v0, Ljava/util/ArrayList; invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V iput-object v0, p0, Lapp/nexushq/nat/MainActivity;->dones:Ljava/util/ArrayList;
    new-instance v0, Ljava/util/ArrayList; invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V iput-object v0, p0, Lapp/nexushq/nat/MainActivity;->prios:Ljava/util/ArrayList;
    new-instance v0, Ljava/util/ArrayList; invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V iput-object v0, p0, Lapp/nexushq/nat/MainActivity;->notes:Ljava/util/ArrayList;
    new-instance v0, Ljava/util/ArrayList; invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V iput-object v0, p0, Lapp/nexushq/nat/MainActivity;->notePins:Ljava/util/ArrayList;
    new-instance v0, Ljava/util/ArrayList; invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V iput-object v0, p0, Lapp/nexushq/nat/MainActivity;->finTypes:Ljava/util/ArrayList;
    new-instance v0, Ljava/util/ArrayList; invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V iput-object v0, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    new-instance v0, Ljava/util/ArrayList; invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V iput-object v0, p0, Lapp/nexushq/nat/MainActivity;->finNotes:Ljava/util/ArrayList;
    const/4 v0, 0x0
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    const/4 v0, 0x1
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->prio:I
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->finIn:I
    return-void
.end method

.method private prioLabel(I)Ljava/lang/String;
    .locals 3
    const/4 v0, 0x3
    new-array v0, v0, [Ljava/lang/String;
    const/4 v1, 0x0
    const-string v2, "\u067e\u0627\u06cc\u06cc\u0646"
    aput-object v2, v0, v1
    const/4 v1, 0x1
    const-string v2, "\u0645\u062a\u0648\u0633\u0637"
    aput-object v2, v0, v1
    const/4 v1, 0x2
    const-string v2, "\u0628\u0627\u0644\u0627"
    aput-object v2, v0, v1
    aget-object v1, v0, p1
    return-object v1
.end method

.method private prefs()Landroid/content/SharedPreferences;
    .locals 2
    const-string v0, "native_v11"
    const/4 v1, 0x0
    invoke-virtual {p0, v0, v1}, Landroid/app/Activity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;
    move-result-object v0
    return-object v0
.end method

.method private saveAll()V
    .locals 6

    # tasks
    new-instance v3, Ljava/lang/StringBuilder;
    invoke-direct {v3}, Ljava/lang/StringBuilder;-><init>()V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->titles:Ljava/util/ArrayList;
    invoke-virtual {v0}, Ljava/util/ArrayList;->size()I
    move-result v5
    const/4 v4, 0x0
    :s_t
    if-ge v4, v5, :s_t_end
    if-lez v4, :s_t_f1
    const-string v0, "\n"
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    :s_t_f1
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->dones:Ljava/util/ArrayList;
    invoke-virtual {v0, v4}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;
    const-string v0, "|"
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->prios:Ljava/util/ArrayList;
    invoke-virtual {v0, v4}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;
    const-string v0, "|"
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->titles:Ljava/util/ArrayList;
    invoke-virtual {v0, v4}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;
    add-int/lit8 v4, v4, 0x1
    goto :s_t
    :s_t_end
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->prefs()Landroid/content/SharedPreferences;
    move-result-object v0
    invoke-interface {v0}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;
    move-result-object v0
    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    const-string v2, "tasks"
    invoke-interface {v0, v2, v1}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;
    move-result-object v0
    invoke-interface {v0}, Landroid/content/SharedPreferences$Editor;->apply()V

    # notes
    new-instance v3, Ljava/lang/StringBuilder;
    invoke-direct {v3}, Ljava/lang/StringBuilder;-><init>()V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notes:Ljava/util/ArrayList;
    invoke-virtual {v0}, Ljava/util/ArrayList;->size()I
    move-result v5
    const/4 v4, 0x0
    :s_n
    if-ge v4, v5, :s_n_end
    if-lez v4, :s_n_f1
    const-string v0, "\n"
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    :s_n_f1
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notePins:Ljava/util/ArrayList;
    invoke-virtual {v0, v4}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;
    const-string v0, "|"
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notes:Ljava/util/ArrayList;
    invoke-virtual {v0, v4}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;
    add-int/lit8 v4, v4, 0x1
    goto :s_n
    :s_n_end
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->prefs()Landroid/content/SharedPreferences;
    move-result-object v0
    invoke-interface {v0}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;
    move-result-object v0
    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    const-string v2, "notes"
    invoke-interface {v0, v2, v1}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;
    move-result-object v0
    invoke-interface {v0}, Landroid/content/SharedPreferences$Editor;->apply()V

    # finance
    new-instance v3, Ljava/lang/StringBuilder;
    invoke-direct {v3}, Ljava/lang/StringBuilder;-><init>()V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    invoke-virtual {v0}, Ljava/util/ArrayList;->size()I
    move-result v5
    const/4 v4, 0x0
    :s_f
    if-ge v4, v5, :s_f_end
    if-lez v4, :s_f_f1
    const-string v0, "\n"
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    :s_f_f1
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finTypes:Ljava/util/ArrayList;
    invoke-virtual {v0, v4}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;
    const-string v0, "|"
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    invoke-virtual {v0, v4}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;
    const-string v0, "|"
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finNotes:Ljava/util/ArrayList;
    invoke-virtual {v0, v4}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;
    add-int/lit8 v4, v4, 0x1
    goto :s_f
    :s_f_end
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->prefs()Landroid/content/SharedPreferences;
    move-result-object v0
    invoke-interface {v0}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;
    move-result-object v0
    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    const-string v2, "fin"
    invoke-interface {v0, v2, v1}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;
    move-result-object v0
    invoke-interface {v0}, Landroid/content/SharedPreferences$Editor;->apply()V
    return-void
.end method

.method private loadAll()V
    .locals 9

    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->prefs()Landroid/content/SharedPreferences;
    move-result-object v8

    # tasks
    const-string v0, "tasks"
    const/4 v1, 0x0
    invoke-interface {v8, v0, v1}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    if-eqz v0, :l_notes
    invoke-virtual {v0}, Ljava/lang/String;->length()I
    move-result v1
    if-eqz v1, :l_notes
    const-string v1, "\n"
    invoke-virtual {v0, v1}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;
    move-result-object v7
    array-length v6, v7
    const/4 v5, 0x0
    :lt_loop
    if-ge v5, v6, :l_notes
    aget-object v0, v7, v5
    const-string v1, "\\|"
    invoke-virtual {v0, v1}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;
    move-result-object v0
    array-length v1, v0
    const/4 v2, 0x3
    if-ne v1, v2, :lt_next
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->dones:Ljava/util/ArrayList;
    const/4 v2, 0x0
    aget-object v2, v0, v2
    invoke-static {v2}, Ljava/lang/Integer;->parseInt(Ljava/lang/String;)I
    move-result v2
    invoke-static {v2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v2
    invoke-virtual {v1, v2}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->prios:Ljava/util/ArrayList;
    const/4 v2, 0x1
    aget-object v2, v0, v2
    invoke-static {v2}, Ljava/lang/Integer;->parseInt(Ljava/lang/String;)I
    move-result v2
    invoke-static {v2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v2
    invoke-virtual {v1, v2}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->titles:Ljava/util/ArrayList;
    const/4 v2, 0x2
    aget-object v2, v0, v2
    invoke-virtual {v1, v2}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    :lt_next
    add-int/lit8 v5, v5, 0x1
    goto :lt_loop

    :l_notes
    const-string v0, "notes"
    const/4 v1, 0x0
    invoke-interface {v8, v0, v1}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    if-eqz v0, :l_fin
    invoke-virtual {v0}, Ljava/lang/String;->length()I
    move-result v1
    if-eqz v1, :l_fin
    const-string v1, "\n"
    invoke-virtual {v0, v1}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;
    move-result-object v7
    array-length v6, v7
    const/4 v5, 0x0
    :ln_loop
    if-ge v5, v6, :l_fin
    aget-object v0, v7, v5
    const-string v1, "\\|"
    invoke-virtual {v0, v1}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;
    move-result-object v0
    array-length v1, v0
    const/4 v2, 0x2
    if-ne v1, v2, :ln_next
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->notePins:Ljava/util/ArrayList;
    const/4 v2, 0x0
    aget-object v2, v0, v2
    invoke-static {v2}, Ljava/lang/Integer;->parseInt(Ljava/lang/String;)I
    move-result v2
    invoke-static {v2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v2
    invoke-virtual {v1, v2}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->notes:Ljava/util/ArrayList;
    const/4 v2, 0x1
    aget-object v2, v0, v2
    invoke-virtual {v1, v2}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    :ln_next
    add-int/lit8 v5, v5, 0x1
    goto :ln_loop

    :l_fin
    const-string v0, "fin"
    const/4 v1, 0x0
    invoke-interface {v8, v0, v1}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    if-eqz v0, :l_end
    invoke-virtual {v0}, Ljava/lang/String;->length()I
    move-result v1
    if-eqz v1, :l_end
    const-string v1, "\n"
    invoke-virtual {v0, v1}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;
    move-result-object v7
    array-length v6, v7
    const/4 v5, 0x0
    :lf_loop
    if-ge v5, v6, :l_end
    aget-object v0, v7, v5
    const-string v1, "\\|"
    invoke-virtual {v0, v1}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;
    move-result-object v0
    array-length v1, v0
    const/4 v2, 0x3
    if-ne v1, v2, :lf_next
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->finTypes:Ljava/util/ArrayList;
    const/4 v2, 0x0
    aget-object v2, v0, v2
    invoke-static {v2}, Ljava/lang/Integer;->parseInt(Ljava/lang/String;)I
    move-result v2
    invoke-static {v2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v2
    invoke-virtual {v1, v2}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    const/4 v2, 0x1
    aget-object v2, v0, v2
    invoke-static {v2}, Ljava/lang/Double;->parseDouble(Ljava/lang/String;)D
    move-result-wide v3
    invoke-static {v3, v4}, Ljava/lang/Double;->valueOf(D)Ljava/lang/Double;
    move-result-object v2
    invoke-virtual {v1, v2}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->finNotes:Ljava/util/ArrayList;
    const/4 v2, 0x2
    aget-object v2, v0, v2
    invoke-virtual {v1, v2}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    :lf_next
    add-int/lit8 v5, v5, 0x1
    goto :lf_loop

    :l_end
    return-void
.end method

.method private refresh()V
    .locals 8

    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->adapter:Landroid/widget/ArrayAdapter;
    invoke-virtual {v0}, Landroid/widget/ArrayAdapter;->clear()V

    iget v6, p0, Lapp/nexushq/nat/MainActivity;->tab:I

    # درباره: لیست مخفی، متن درباره نمایان
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->list:Landroid/widget/ListView;
    iget-object v1, p0, Lapp/nexushq/nat/MainActivity;->aboutTxt:Landroid/widget/TextView;
    const/4 v2, 0x3
    if-ne v6, v2, :show_list
    const/16 v3, 0x8
    invoke-virtual {v0, v3}, Landroid/view/View;->setVisibility(I)V
    const/4 v3, 0x0
    invoke-virtual {v1, v3}, Landroid/view/View;->setVisibility(I)V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->inputRow:Landroid/widget/LinearLayout;
    invoke-virtual {v0, v3}, Landroid/view/View;->setVisibility(I)V
    goto :after_vis
    :show_list
    const/4 v3, 0x0
    invoke-virtual {v0, v3}, Landroid/view/View;->setVisibility(I)V
    const/16 v3, 0x8
    invoke-virtual {v1, v3}, Landroid/view/View;->setVisibility(I)V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->inputRow:Landroid/widget/LinearLayout;
    invoke-virtual {v0, v3}, Landroid/view/View;->setVisibility(I)V
    :after_vis

    if-nez v6, :not_tasks

    # ---- تسک‌ها ----
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->titles:Ljava/util/ArrayList;
    invoke-virtual {v0}, Ljava/util/ArrayList;->size()I
    move-result v7
    const/4 v5, 0x0
    const/4 v2, 0x0
    :t_loop
    if-ge v5, v7, :t_stat
    new-instance v4, Ljava/lang/StringBuilder;
    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->dones:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/Integer;
    invoke-virtual {v0}, Ljava/lang/Integer;->intValue()I
    move-result v1
    if-eqz v1, :t_nd
    const-string v0, "\u2705 "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const/4 v0, 0x1
    add-int/2addr v2, v0
    goto :t_mark
    :t_nd
    const-string v0, "\u2b1c "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    :t_mark
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->titles:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/String;
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v0, "   ["
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->prios:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/Integer;
    invoke-virtual {v0}, Ljava/lang/Integer;->intValue()I
    move-result v1
    invoke-direct {p0, v1}, Lapp/nexushq/nat/MainActivity;->prioLabel(I)Ljava/lang/String;
    move-result-object v0
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v0, "]"
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->adapter:Landroid/widget/ArrayAdapter;
    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/widget/ArrayAdapter;->add(Ljava/lang/Object;)V
    add-int/lit8 v5, v5, 0x1
    goto :t_loop
    :t_stat
    new-instance v4, Ljava/lang/StringBuilder;
    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V
    const-string v0, "\u06a9\u0644: "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v4, v7}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    const-string v0, "  \u0627\u0646\u062c\u0627\u0645\u200c\u0634\u062f\u0647: "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v4, v2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    const-string v0, "  \u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631: "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    sub-int v0, v7, v2
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->stats:Landroid/widget/TextView;
    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V
    goto :fin_adapter

    :not_tasks
    const/4 v2, 0x1
    if-ne v6, v2, :not_notes

    # ---- یادداشت‌ها ----
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notes:Ljava/util/ArrayList;
    invoke-virtual {v0}, Ljava/util/ArrayList;->size()I
    move-result v7
    const/4 v5, 0x0
    :n_loop
    if-ge v5, v7, :n_stat
    new-instance v4, Ljava/lang/StringBuilder;
    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notePins:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/Integer;
    invoke-virtual {v0}, Ljava/lang/Integer;->intValue()I
    move-result v1
    if-eqz v1, :n_np
    const-string v0, "\ud83d\udccc "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    goto :n_mark
    :n_np
    const-string v0, "\u25CB "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    :n_mark
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notes:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/String;
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->adapter:Landroid/widget/ArrayAdapter;
    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/widget/ArrayAdapter;->add(Ljava/lang/Object;)V
    add-int/lit8 v5, v5, 0x1
    goto :n_loop
    :n_stat
    new-instance v4, Ljava/lang/StringBuilder;
    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V
    const-string v0, "\u06cc\u0627\u062f\u062f\u0627\u0634\u062a\u200c\u0647\u0627: "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v4, v7}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->stats:Landroid/widget/TextView;
    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V
    goto :fin_adapter

    :not_notes
    const/4 v2, 0x2
    if-ne v6, v2, :not_fin

    # ---- مالی ----
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    invoke-virtual {v0}, Ljava/util/ArrayList;->size()I
    move-result v7
    const/4 v5, 0x0
    const-wide v2, 0x0
    :f_loop
    if-ge v5, v7, :f_stat
    new-instance v4, Ljava/lang/StringBuilder;
    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finTypes:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/Integer;
    invoke-virtual {v0}, Ljava/lang/Integer;->intValue()I
    move-result v1
    if-eqz v1, :f_exp
    const-string v0, "+ "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/Double;
    invoke-virtual {v0}, Ljava/lang/Double;->doubleValue()D
    move-result-wide v0
    add-double/2addr v2, v0
    invoke-static {v0, v1}, Lapp/nexushq/nat/MainActivity;->dstr(D)Ljava/lang/String;
    move-result-object v0
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    goto :f_mark
    :f_exp
    const-string v0, "- "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/Double;
    invoke-virtual {v0}, Ljava/lang/Double;->doubleValue()D
    move-result-wide v0
    sub-double/2addr v2, v0
    invoke-static {v0, v1}, Lapp/nexushq/nat/MainActivity;->dstr(D)Ljava/lang/String;
    move-result-object v0
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    :f_mark
    const-string v0, "  "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finNotes:Ljava/util/ArrayList;
    invoke-virtual {v0, v5}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/String;
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->adapter:Landroid/widget/ArrayAdapter;
    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/widget/ArrayAdapter;->add(Ljava/lang/Object;)V
    add-int/lit8 v5, v5, 0x1
    goto :f_loop
    :f_stat
    new-instance v4, Ljava/lang/StringBuilder;
    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V
    const-string v0, "\u0645\u0627\u0646\u062f\u0647: "
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-static {v2, v3}, Lapp/nexushq/nat/MainActivity;->dstr(D)Ljava/lang/String;
    move-result-object v0
    invoke-virtual {v4, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->stats:Landroid/widget/TextView;
    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V
    goto :fin_adapter

    :not_fin
    # درباره
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->stats:Landroid/widget/TextView;
    const-string v1, "NEXUS HQ \u2014 Native Edition v1.1"
    invoke-virtual {v0, v1}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V

    :fin_adapter
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->adapter:Landroid/widget/ArrayAdapter;
    invoke-virtual {v0}, Landroid/widget/ArrayAdapter;->notifyDataSetChanged()V
    return-void
.end method


# virtual methods
.method public onCreate(Landroid/os/Bundle;)V
    .locals 8

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # فونت فارسی از assets
    invoke-virtual {p0}, Landroid/app/Activity;->getAssets()Landroid/content/res/AssetManager;
    move-result-object v0
    const-string v1, "fonts/Vazirmatn-Regular.ttf"
    invoke-static {v0, v1}, Landroid/graphics/Typeface;->createFromAsset(Landroid/content/res/AssetManager;Ljava/lang/String;)Landroid/graphics/Typeface;
    move-result-object v7

    new-instance v0, Landroid/widget/LinearLayout;
    invoke-direct {v0, p0}, Landroid/widget/LinearLayout;-><init>(Landroid/content/Context;)V
    const/4 v1, 0x1
    invoke-virtual {v0, v1}, Landroid/widget/LinearLayout;->setOrientation(I)V
    const v1, -0xf7f6f4
    invoke-virtual {v0, v1}, Landroid/widget/LinearLayout;->setBackgroundColor(I)V
    const/16 v1, 0x1c
    const/16 v2, 0x28
    const/16 v3, 0x1c
    const/16 v4, 0x14
    invoke-virtual {v0, v1, v2, v3, v4}, Landroid/widget/LinearLayout;->setPadding(IIII)V

    # عنوان
    new-instance v1, Landroid/widget/TextView;
    invoke-direct {v1, p0}, Landroid/widget/TextView;-><init>(Landroid/content/Context;)V
    const-string v2, "NEXUS HQ \u2014 Native"
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V
    const/high16 v2, 0x41c00000    # 24f
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setTextSize(F)V
    invoke-virtual {v1, v7}, Landroid/widget/TextView;->setTypeface(Landroid/graphics/Typeface;)V
    const v2, -0x17160f
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setTextColor(I)V
    invoke-virtual {v0, v1}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    new-instance v1, Landroid/widget/TextView;
    invoke-direct {v1, p0}, Landroid/widget/TextView;-><init>(Landroid/content/Context;)V
    const-string v2, "\u06f1\u06f0\u06f0% Native \u00b7 \u0635\u0641\u0631 \u0648\u0628 \u00b7 v1.1"
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V
    const/high16 v2, 0x41300000    # 11f
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setTextSize(F)V
    const v2, -0x746c75
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setTextColor(I)V
    invoke-virtual {v0, v1}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    # ردیف تب‌ها
    new-instance v1, Landroid/widget/LinearLayout;
    invoke-direct {v1, p0}, Landroid/widget/LinearLayout;-><init>(Landroid/content/Context;)V
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/widget/LinearLayout;->setOrientation(I)V
    const-string v3, "\u062a\u0633\u06a9\u200c\u0647\u0627"
    invoke-static {p0, v3}, Lapp/nexushq/nat/MainActivity;->mkTab(Landroid/app/Activity;Ljava/lang/String;)Landroid/widget/Button;
    move-result-object v3
    iput-object v3, p0, Lapp/nexushq/nat/MainActivity;->tabB0:Landroid/widget/Button;
    invoke-virtual {v3, p0}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
    invoke-virtual {v1, v3}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V
    const-string v3, "\u06cc\u0627\u062f\u062f\u0627\u0634\u062a\u200c\u0647\u0627"
    invoke-static {p0, v3}, Lapp/nexushq/nat/MainActivity;->mkTab(Landroid/app/Activity;Ljava/lang/String;)Landroid/widget/Button;
    move-result-object v3
    iput-object v3, p0, Lapp/nexushq/nat/MainActivity;->tabB1:Landroid/widget/Button;
    invoke-virtual {v3, p0}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
    invoke-virtual {v1, v3}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V
    const-string v3, "\u0645\u0627\u0644\u06cc"
    invoke-static {p0, v3}, Lapp/nexushq/nat/MainActivity;->mkTab(Landroid/app/Activity;Ljava/lang/String;)Landroid/widget/Button;
    move-result-object v3
    iput-object v3, p0, Lapp/nexushq/nat/MainActivity;->tabB2:Landroid/widget/Button;
    invoke-virtual {v3, p0}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
    invoke-virtual {v1, v3}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V
    const-string v3, "\u062f\u0631\u0628\u0627\u0631\u0647"
    invoke-static {p0, v3}, Lapp/nexushq/nat/MainActivity;->mkTab(Landroid/app/Activity;Ljava/lang/String;)Landroid/widget/Button;
    move-result-object v3
    iput-object v3, p0, Lapp/nexushq/nat/MainActivity;->tabB3:Landroid/widget/Button;
    invoke-virtual {v3, p0}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
    invoke-virtual {v1, v3}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V
    invoke-virtual {v0, v1}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    # آمار
    new-instance v1, Landroid/widget/TextView;
    invoke-direct {v1, p0}, Landroid/widget/TextView;-><init>(Landroid/content/Context;)V
    iput-object v1, p0, Lapp/nexushq/nat/MainActivity;->stats:Landroid/widget/TextView;
    const/high16 v2, 0x41500000    # 13f
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setTextSize(F)V
    const v2, -0x746c75
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setTextColor(I)V
    invoke-virtual {v1, v7}, Landroid/widget/TextView;->setTypeface(Landroid/graphics/Typeface;)V
    invoke-virtual {v0, v1}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    # نوار ورود (input + دکمه‌ها) — برای تب درباره مخفی می‌شود
    new-instance v1, Landroid/widget/LinearLayout;
    invoke-direct {v1, p0}, Landroid/widget/LinearLayout;-><init>(Landroid/content/Context;)V
    iput-object v1, p0, Lapp/nexushq/nat/MainActivity;->inputRow:Landroid/widget/LinearLayout;
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/widget/LinearLayout;->setOrientation(I)V

    new-instance v2, Landroid/widget/EditText;
    invoke-direct {v2, p0}, Landroid/widget/EditText;-><init>(Landroid/content/Context;)V
    iput-object v2, p0, Lapp/nexushq/nat/MainActivity;->input:Landroid/widget/EditText;
    const-string v3, "\u0645\u062a\u0646 \u06cc\u0627 \u0645\u0628\u0644\u063a\u2026"
    invoke-virtual {v2, v3}, Landroid/widget/TextView;->setHint(Ljava/lang/CharSequence;)V
    const v3, -0x17160f
    invoke-virtual {v2, v3}, Landroid/widget/TextView;->setTextColor(I)V
    const v3, -0x746c75
    invoke-virtual {v2, v3}, Landroid/widget/TextView;->setHintTextColor(I)V
    invoke-virtual {v2, v7}, Landroid/widget/TextView;->setTypeface(Landroid/graphics/Typeface;)V
    invoke-virtual {v1, v2}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    new-instance v2, Landroid/widget/Button;
    invoke-direct {v2, p0}, Landroid/widget/Button;-><init>(Landroid/content/Context;)V
    iput-object v2, p0, Lapp/nexushq/nat/MainActivity;->prioBtn:Landroid/widget/Button;
    invoke-virtual {v2, p0}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
    invoke-virtual {v1, v2}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    new-instance v2, Landroid/widget/Button;
    invoke-direct {v2, p0}, Landroid/widget/Button;-><init>(Landroid/content/Context;)V
    iput-object v2, p0, Lapp/nexushq/nat/MainActivity;->addBtn:Landroid/widget/Button;
    const-string v3, "\u0627\u0641\u0632\u0648\u062f\u0646 +"
    invoke-virtual {v2, v3}, Landroid/widget/Button;->setText(Ljava/lang/CharSequence;)V
    invoke-virtual {v2, p0}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
    invoke-virtual {v1, v2}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    invoke-virtual {v0, v1}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    # لیست
    new-instance v1, Landroid/widget/ListView;
    invoke-direct {v1, p0}, Landroid/widget/ListView;-><init>(Landroid/content/Context;)V
    iput-object v1, p0, Lapp/nexushq/nat/MainActivity;->list:Landroid/widget/ListView;
    new-instance v2, Ljava/util/ArrayList;
    invoke-direct {v2}, Ljava/util/ArrayList;-><init>()V
    new-instance v3, Landroid/widget/ArrayAdapter;
    sget v4, Landroid/R$layout;->simple_list_item_1:I
    invoke-direct {v3, p0, v4, v2}, Landroid/widget/ArrayAdapter;-><init>(Landroid/content/Context;ILjava/util/List;)V
    iput-object v3, p0, Lapp/nexushq/nat/MainActivity;->adapter:Landroid/widget/ArrayAdapter;
    invoke-virtual {v1, v3}, Landroid/widget/ListView;->setAdapter(Landroid/widget/ListAdapter;)V
    invoke-virtual {v1, p0}, Landroid/widget/AdapterView;->setOnItemClickListener(Landroid/widget/AdapterView$OnItemClickListener;)V
    invoke-virtual {v1, p0}, Landroid/widget/AdapterView;->setOnItemLongClickListener(Landroid/widget/AdapterView$OnItemLongClickListener;)V
    new-instance v2, Landroid/widget/LinearLayout$LayoutParams;
    const/4 v3, -0x1
    const/4 v4, -0x1
    const/high16 v5, 0x3f800000
    invoke-direct {v2, v3, v4, v5}, Landroid/widget/LinearLayout$LayoutParams;-><init>(IIF)V
    invoke-virtual {v0, v1, v2}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;Landroid/view/ViewGroup$LayoutParams;)V

    # متن درباره
    new-instance v1, Landroid/widget/TextView;
    invoke-direct {v1, p0}, Landroid/widget/TextView;-><init>(Landroid/content/Context;)V
    iput-object v1, p0, Lapp/nexushq/nat/MainActivity;->aboutTxt:Landroid/widget/TextView;
    const/high16 v2, 0x41400000    # 12f
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setTextSize(F)V
    const v2, -0x17160f
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setTextColor(I)V
    invoke-virtual {v1, v7}, Landroid/widget/TextView;->setTypeface(Landroid/graphics/Typeface;)V
    const/16 v2, 0x8
    invoke-virtual {v1, v2}, Landroid/view/View;->setVisibility(I)V
    const-string v2, "NEXUS HQ \u2014 Native Edition v1.1\n\n\u0627\u06cc\u0646 \u0628\u0631\u0646\u0627\u0645\u0647 \u06f1\u06f0\u06f0% Native \u0627\u0633\u062a:\nJava \u062e\u0627\u0644\u0635 \u2014 \u0628\u062f\u0648\u0646 WebView\u060c \u0628\u062f\u0648\u0646 \u0645\u062c\u0648\u0632\u060c \u0628\u062f\u0648\u0646 \u0627\u06cc\u0646\u062a\u0631\u0646\u062a\n\n\u0645\u0627\u0698\u0648\u0644\u200c\u0647\u0627: \u062a\u0633\u06a9\u200c\u0647\u0627 (\u0627\u0648\u0644\u0648\u06cc\u062a \u0648 \u0627\u0646\u062c\u0627\u0645) \u00b7 \u06cc\u0627\u062f\u062f\u0627\u0634\u062a\u200c\u0647\u0627 (\u0633\u0646\u062c\u0627\u0642) \u00b7 \u0645\u0627\u0644\u06cc (\u062f\u0631\u0622\u0645\u062f/\u0647\u0632\u06cc\u0646\u0647 \u0648 \u0645\u0627\u0646\u062f\u0647)\n\n\u0631\u0627\u0647\u0646\u0645\u0627:\n\u2022 \u062a\u0633\u06a9\u200c\u0647\u0627: \u0645\u062a\u0646 \u0648 \u062f\u06a9\u0645\u0647 \u201c\u0627\u0641\u0632\u0648\u062f\u0646\u201d \u2014 \u0644\u0645\u0633 = \u0627\u0646\u062c\u0627\u0645\u200c\u0634\u062f\u0647 \u2014 \u0644\u0645\u0633 \u0646\u06af\u0647\u200c\u062f\u0627\u0634\u062a\u0647 = \u062d\u0630\u0641\n\u2022 \u06cc\u0627\u062f\u062f\u0627\u0634\u062a: \u0645\u062a\u0646 \u0648 \u0627\u0641\u0632\u0648\u062f\u0646 \u2014 \u0644\u0645\u0633 = \u0633\u0646\u062c\u0627\u0642\n\u2022 \u0645\u0627\u0644\u06cc: \u0645\u0628\u0644\u063a \u0648 \u0627\u0641\u0632\u0648\u062f\u0646 \u2014 \u062f\u06a9\u0645\u0647\u06cc \u06a9\u0647 \u201c\u0627\u0648\u0644\u0648\u06cc\u062a\u201d \u0646\u0648\u0634\u062a\u0647 \u0646\u0648\u0639 \u0631\u0627 \u0639\u0648\u0636 \u0645\u06cc\u200c\u06a9\u0646\u062f (\u062f\u0631\u0622\u0645\u062f/\u0647\u0632\u06cc\u0646\u0647)\n\n\u0641\u0648\u0646\u062a \u0641\u0627\u0631\u0633\u06cc \u0648\u0632\u06cc\u0631\u0645\u062a\u0646 \u062f\u0627\u062e\u0644 \u062e\u0648\u062f \u0628\u0631\u0646\u0627\u0645\u0647 \u0627\u0633\u062a\n\u0633\u0648\u0631\u0633: github.com/aftereditchannel-cell/rgtr"
    invoke-virtual {v1, v2}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V
    invoke-virtual {v0, v1}, Landroid/widget/LinearLayout;->addView(Landroid/view/View;)V

    invoke-virtual {p0, v0}, Landroid/app/Activity;->setContentView(Landroid/view/View;)V

    # برچسب اولیه دکمه
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->updActionBtn()V

    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->loadAll()V
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->refresh()V
    return-void
.end method

.method private updActionBtn()V
    .locals 3
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->prioBtn:Landroid/widget/Button;
    iget v1, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    if-eqz v1, :lbl_prio
    const/4 v2, 0x1
    if-ne v1, v2, :not_note
    const-string v1, "\u06cc\u0627\u062f\u062f\u0627\u0634\u062a"
    invoke-virtual {v0, v1}, Landroid/widget/Button;->setText(Ljava/lang/CharSequence;)V
    return-void
    :not_note
    const/4 v2, 0x2
    if-ne v1, v2, :lbl_dash
    iget v1, p0, Lapp/nexushq/nat/MainActivity;->finIn:I
    if-eqz v1, :lbl_exp
    const-string v1, "\u062f\u0631\u0622\u0645\u062f +"
    invoke-virtual {v0, v1}, Landroid/widget/Button;->setText(Ljava/lang/CharSequence;)V
    return-void
    :lbl_exp
    const-string v1, "\u0647\u0632\u06cc\u0646\u0647 \u2212"
    invoke-virtual {v0, v1}, Landroid/widget/Button;->setText(Ljava/lang/CharSequence;)V
    return-void
    :lbl_dash
    const-string v1, "\u2014"
    invoke-virtual {v0, v1}, Landroid/widget/Button;->setText(Ljava/lang/CharSequence;)V
    return-void
    :lbl_prio
    iget v1, p0, Lapp/nexushq/nat/MainActivity;->prio:I
    invoke-direct {p0, v1}, Lapp/nexushq/nat/MainActivity;->prioLabel(I)Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/widget/Button;->setText(Ljava/lang/CharSequence;)V
    return-void
.end method

.method static mkTab(Landroid/app/Activity;Ljava/lang/String;)Landroid/widget/Button;
    .locals 1
    new-instance v0, Landroid/widget/Button;
    invoke-direct {v0, p0}, Landroid/widget/Button;-><init>(Landroid/content/Context;)V
    invoke-virtual {v0, p1}, Landroid/widget/Button;->setText(Ljava/lang/CharSequence;)V
    return-object v0
.end method

.method private curPrio()I
    .locals 1
    iget v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    return v0
.end method

.method public onClick(Landroid/view/View;)V
    .locals 8

    # --- کلیک روی تب‌ها ---
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->tabB0:Landroid/widget/Button;
    if-ne p1, v0, :not_b0
    const/4 v0, 0x0
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    goto :after_tab
    :not_b0
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->tabB1:Landroid/widget/Button;
    if-ne p1, v0, :not_b1
    const/4 v0, 0x1
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    goto :after_tab
    :not_b1
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->tabB2:Landroid/widget/Button;
    if-ne p1, v0, :not_b2
    const/4 v0, 0x2
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    goto :after_tab
    :not_b2
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->tabB3:Landroid/widget/Button;
    if-ne p1, v0, :not_b3
    const/4 v0, 0x3
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    :after_tab
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->updActionBtn()V
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->refresh()V
    return-void
    :not_b3

    # --- دکمه‌ی حالت (اولویت تسک / نوع مالی) ---
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->prioBtn:Landroid/widget/Button;
    if-ne p1, v0, :not_prio
    iget v1, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    if-eqz v1, :cyc_prio
    const/4 v2, 0x2
    if-ne v1, v2, :upd_out
    # مالی: toggle نوع
    iget v0, p0, Lapp/nexushq/nat/MainActivity;->finIn:I
    if-nez v0, :set_fin0
    const/4 v0, 0x1
    goto :fin_put
    :set_fin0
    const/4 v0, 0x0
    :fin_put
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->finIn:I
    goto :upd_out
    :cyc_prio
    iget v0, p0, Lapp/nexushq/nat/MainActivity;->prio:I
    add-int/lit8 v0, v0, 0x2
    rem-int/lit8 v0, v0, 0x3
    iput v0, p0, Lapp/nexushq/nat/MainActivity;->prio:I
    :upd_out
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->updActionBtn()V
    return-void

    :not_prio
    # --- افزودن ---
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->addBtn:Landroid/widget/Button;
    if-ne p1, v0, :out

    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->input:Landroid/widget/EditText;
    invoke-virtual {v0}, Landroid/widget/EditText;->getText()Landroid/text/Editable;
    move-result-object v0
    invoke-virtual {v0}, Ljava/lang/Object;->toString()Ljava/lang/String;
    move-result-object v0
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;
    move-result-object v6
    invoke-virtual {v6}, Ljava/lang/String;->length()I
    move-result v0
    if-eqz v0, :out

    iget v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    if-eqz v0, :add_task
    const/4 v1, 0x1
    if-ne v0, v1, :add_fin

    # یادداشت
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notes:Ljava/util/ArrayList;
    const/4 v1, 0x0
    invoke-virtual {v0, v1, v6}, Ljava/util/ArrayList;->add(ILjava/lang/Object;)V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notePins:Ljava/util/ArrayList;
    invoke-static {v1}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v2
    invoke-virtual {v0, v1, v2}, Ljava/util/ArrayList;->add(ILjava/lang/Object;)V
    goto :after_add

    :add_fin
    const/4 v1, 0x2
    if-ne v0, v1, :after_add
    const-string v0, " "
    invoke-virtual {v6, v0}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;
    move-result-object v7
    const/4 v0, 0x0
    :try_s
    aget-object v0, v7, v0
    invoke-static {v0}, Ljava/lang/Double;->parseDouble(Ljava/lang/String;)D
    move-result-wide v0
    invoke-static {v0, v1}, Ljava/lang/Double;->valueOf(D)Ljava/lang/Double;
    move-result-object v4
    goto :try_e
    :try_s2
    :try_e
    array-length v0, v7
    const/4 v1, 0x1
    if-le v0, v1, :no_fnote
    const/4 v0, 0x1
    aget-object v5, v7, v0
    goto :have_fnote
    :no_fnote
    const-string v5, ""
    :have_fnote
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    const/4 v1, 0x0
    invoke-virtual {v0, v1, v4}, Ljava/util/ArrayList;->add(ILjava/lang/Object;)V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finNotes:Ljava/util/ArrayList;
    invoke-virtual {v0, v1, v5}, Ljava/util/ArrayList;->add(ILjava/lang/Object;)V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finTypes:Ljava/util/ArrayList;
    iget v2, p0, Lapp/nexushq/nat/MainActivity;->finIn:I
    invoke-static {v2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v2
    invoke-virtual {v0, v1, v2}, Ljava/util/ArrayList;->add(ILjava/lang/Object;)V
    goto :after_add

    :add_task
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->titles:Ljava/util/ArrayList;
    const/4 v1, 0x0
    invoke-virtual {v0, v1, v6}, Ljava/util/ArrayList;->add(ILjava/lang/Object;)V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->dones:Ljava/util/ArrayList;
    invoke-static {v1}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v2
    invoke-virtual {v0, v1, v2}, Ljava/util/ArrayList;->add(ILjava/lang/Object;)V
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->prios:Ljava/util/ArrayList;
    iget v2, p0, Lapp/nexushq/nat/MainActivity;->prio:I
    invoke-static {v2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v2
    invoke-virtual {v0, v1, v2}, Ljava/util/ArrayList;->add(ILjava/lang/Object;)V

    :after_add
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->input:Landroid/widget/EditText;
    const-string v1, ""
    invoke-virtual {v0, v1}, Landroid/widget/EditText;->setText(Ljava/lang/CharSequence;)V
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->saveAll()V
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->refresh()V

    :out
    return-void
.end method

.method public onItemClick(Landroid/widget/AdapterView;Landroid/view/View;IJ)V
    .locals 4

    iget v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    if-eqz v0, :toggle_task
    const/4 v1, 0x1
    if-ne v0, v1, :out

    # سنجاق یادداشت
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notePins:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v1
    check-cast v1, Ljava/lang/Integer;
    invoke-virtual {v1}, Ljava/lang/Integer;->intValue()I
    move-result v2
    if-nez v2, :was0
    const/4 v3, 0x1
    goto :setp
    :was0
    const/4 v3, 0x0
    :setp
    invoke-static {v3}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v1
    invoke-virtual {v0, p3, v1}, Ljava/util/ArrayList;->set(ILjava/lang/Object;)Ljava/lang/Object;
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->saveAll()V
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->refresh()V
    return-void

    :toggle_task
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->dones:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;
    move-result-object v1
    check-cast v1, Ljava/lang/Integer;
    invoke-virtual {v1}, Ljava/lang/Integer;->intValue()I
    move-result v2
    if-nez v2, :was1
    const/4 v3, 0x1
    goto :setd
    :was1
    const/4 v3, 0x0
    :setd
    invoke-static {v3}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v1
    invoke-virtual {v0, p3, v1}, Ljava/util/ArrayList;->set(ILjava/lang/Object;)Ljava/lang/Object;
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->saveAll()V
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->refresh()V

    :out
    return-void
.end method

.method public onItemLongClick(Landroid/widget/AdapterView;Landroid/view/View;IJ)Z
    .locals 1

    iget v0, p0, Lapp/nexushq/nat/MainActivity;->tab:I
    if-eqz v0, :del_task
    const/4 v1, 0x1
    if-ne v0, v1, :del_fin
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notes:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->notePins:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;
    goto :del_done
    :del_fin
    const/4 v1, 0x2
    if-ne v0, v1, :del_done
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finAmts:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finNotes:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->finTypes:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;
    goto :del_done
    :del_task
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->titles:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->dones:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;
    iget-object v0, p0, Lapp/nexushq/nat/MainActivity;->prios:Ljava/util/ArrayList;
    invoke-virtual {v0, p3}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;

    :del_done
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->saveAll()V
    invoke-direct {p0}, Lapp/nexushq/nat/MainActivity;->refresh()V
    const/4 v0, 0x1
    return v0
.end method

.method private static dstr(D)Ljava/lang/String;
    .locals 2
    const-string v0, "%.0f"
    const/4 v1, 0x1
    new-array v1, v1, [Ljava/lang/Object;
    invoke-static {p0, p1}, Ljava/lang/Double;->valueOf(D)Ljava/lang/Double;
    move-result-object p0
    const/4 p1, 0x0
    aput-object p0, v1, p1
    invoke-static {v0, v1}, Ljava/lang/String;->format(Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/String;
    move-result-object v0
    return-object v0
.end method
