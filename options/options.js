function show_page() {
    $("#per_page").val(config_get(PER_PAGE));
    $("#comment_row").val(config_get(COMMENT_ROW));
    $("#pic_show").val(config_get(PIC_SHOW));
}

function toast(msg){
    $("#alert").removeClass('show');
    clearTimeout(window['option_stid']);
    $("#alert strong").html(msg||"保存成功！");
    $("#alert").addClass('show');
    window['option_stid'] = setTimeout(()=>{
        $("#alert").removeClass('show');
    },1000)
}
$("#per_page_btn").click(()=>{
    var val = $("#per_page").val();
    config_set({[PER_PAGE]:val});
    toast("存档间隔保存成功！")
});
$("#comment_row_btn").click(()=>{
    var val = $("#comment_row").val();
    config_set({[COMMENT_ROW]:val});
    toast("转评赞栏保存成功！")
});
$("#pic_show_btn").click(()=>{
    var val = $("#pic_show").val();
    config_set({[PIC_SHOW]:val});
    toast("预览图片保存成功！")
});

show_page();