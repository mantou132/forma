#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    // 须在创建窗口前注册：插件的 document-start 脚本注入 `--safe-area-inset-*`
    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_edge_to_edge::init());
    builder
        .setup(|_app| {
            #[cfg(mobile)]
            _app.handle().plugin(tauri_plugin_haptics::init())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
