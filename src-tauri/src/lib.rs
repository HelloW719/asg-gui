mod cli;
mod config;
mod models;
mod state;

use std::sync::atomic::Ordering;

use serde_json::json;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, Runtime, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

use crate::models::{DesktopAppState, RootSelection};
use crate::state::DesktopState;

#[cfg(windows)]
fn configure_native_window<R: Runtime>(window: &WebviewWindow<R>) {
    use windows_sys::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_COLOR_NONE,
        DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_DONOTROUND,
    };

    let Ok(hwnd) = window.hwnd() else {
        return;
    };
    let border_color = DWMWA_COLOR_NONE;
    let corner_preference = DWMWCP_DONOTROUND;
    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd.0,
            DWMWA_BORDER_COLOR as u32,
            (&border_color as *const u32).cast(),
            std::mem::size_of_val(&border_color) as u32,
        );
        let _ = DwmSetWindowAttribute(
            hwnd.0,
            DWMWA_WINDOW_CORNER_PREFERENCE as u32,
            (&corner_preference as *const i32).cast(),
            std::mem::size_of_val(&corner_preference) as u32,
        );
    }
}

#[cfg(not(windows))]
fn configure_native_window<R: Runtime>(_window: &WebviewWindow<R>) {}

fn tray_image() -> Image<'static> {
    let size = 32u32;
    let mut rgba = vec![0u8; (size * size * 4) as usize];
    let center = (size as f32 - 1.0) / 2.0;
    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - center;
            let dy = y as f32 - center;
            let distance = (dx * dx + dy * dy).sqrt();
            let index = ((y * size + x) * 4) as usize;
            if (11.5..14.0).contains(&distance) {
                rgba[index] = 197;
                rgba[index + 1] = 219;
                rgba[index + 2] = 171;
                rgba[index + 3] = 255;
            } else if distance < 4.0 {
                rgba[index] = 192;
                rgba[index + 1] = 125;
                rgba[index + 2] = 91;
                rgba[index + 3] = 255;
            }
        }
    }
    Image::new_owned(rgba, size, size)
}

fn show_main<R: Runtime>(app: &tauri::AppHandle<R>, route: Option<&str>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    if let Some(route) = route {
        let _ = app.emit("asg://navigate", route);
    }
}

#[tauri::command]
fn get_app_state(app: tauri::AppHandle, state: State<'_, DesktopState>) -> DesktopAppState {
    let settings = state
        .settings
        .read()
        .expect("settings lock poisoned")
        .clone();
    let root = state.root();
    let selection = root.as_ref().map(|path| config::validate_root(path));
    let onboarding_completed = settings.effective_onboarding_completed();
    DesktopAppState {
        root: root.map(|path| path.to_string_lossy().to_string()),
        root_valid: selection.as_ref().is_some_and(|selection| selection.valid),
        invalid_reason: selection.and_then(|selection| selection.reason),
        platform: models::platform_name().to_string(),
        version: app.package_info().version.to_string(),
        theme: settings.theme,
        onboarding_completed,
    }
}

#[tauri::command]
fn detect_default_asg_root(
    app: tauri::AppHandle,
    state: State<'_, DesktopState>,
) -> Result<Option<RootSelection>, String> {
    let home = app
        .path()
        .home_dir()
        .map_err(|error| format!("无法定位用户主目录：{error}"))?;
    let path = config::default_root(&home);
    if !path.is_dir() {
        return Ok(None);
    }

    let selection = config::validate_root(&path);
    if selection.valid {
        state.set_root(Some(path.clone()));
        let mut settings = state
            .settings
            .write()
            .map_err(|_| "GUI 设置锁不可用。".to_string())?;
        if settings.root.is_none() && settings.onboarding_completed.is_none() {
            settings.onboarding_completed = Some(false);
        }
        settings.root = Some(path.to_string_lossy().to_string());
        config::save_settings(&app, &settings)?;
    }
    Ok(Some(selection))
}

#[tauri::command]
async fn choose_asg_root(
    app: tauri::AppHandle,
    state: State<'_, DesktopState>,
) -> Result<Option<RootSelection>, String> {
    let Some(file_path) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = file_path
        .into_path()
        .map_err(|error| format!("无法解析所选目录：{error}"))?;
    let selection = config::validate_root(&path);
    if selection.valid {
        state.set_root(Some(path.clone()));
        let mut settings = state
            .settings
            .write()
            .map_err(|_| "GUI 设置锁不可用。".to_string())?;
        if settings.root.is_none() && settings.onboarding_completed.is_none() {
            settings.onboarding_completed = Some(false);
        }
        settings.root = Some(path.to_string_lossy().to_string());
        config::save_settings(&app, &settings)?;
    }
    Ok(Some(selection))
}

#[tauri::command]
fn set_asg_root(
    app: tauri::AppHandle,
    state: State<'_, DesktopState>,
    path: String,
) -> Result<RootSelection, String> {
    let path = std::path::PathBuf::from(path);
    let selection = config::validate_root(&path);
    if selection.valid {
        state.set_root(Some(path.clone()));
        let mut settings = state
            .settings
            .write()
            .map_err(|_| "GUI 设置锁不可用。".to_string())?;
        if settings.root.is_none() && settings.onboarding_completed.is_none() {
            settings.onboarding_completed = Some(false);
        }
        settings.root = Some(path.to_string_lossy().to_string());
        config::save_settings(&app, &settings)?;
    }
    Ok(selection)
}

#[tauri::command]
fn clear_asg_root(app: tauri::AppHandle, state: State<'_, DesktopState>) -> Result<(), String> {
    state.set_root(None);
    let mut settings = state
        .settings
        .write()
        .map_err(|_| "GUI 设置锁不可用。".to_string())?;
    settings.root = None;
    config::save_settings(&app, &settings)
}

#[tauri::command]
fn set_theme(
    app: tauri::AppHandle,
    state: State<'_, DesktopState>,
    theme: String,
) -> Result<(), String> {
    if !matches!(theme.as_str(), "system" | "dark" | "light") {
        return Err("未知主题。".to_string());
    }
    let mut settings = state
        .settings
        .write()
        .map_err(|_| "GUI 设置锁不可用。".to_string())?;
    settings.theme = theme;
    config::save_settings(&app, &settings)
}

#[tauri::command]
fn set_onboarding_completed(
    app: tauri::AppHandle,
    state: State<'_, DesktopState>,
    completed: bool,
) -> Result<(), String> {
    let mut settings = state
        .settings
        .write()
        .map_err(|_| "GUI 设置锁不可用。".to_string())?;
    settings.onboarding_completed = Some(completed);
    config::save_settings(&app, &settings)
}

#[tauri::command]
fn show_window(app: tauri::AppHandle) {
    show_main(&app, None);
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
async fn quit_gui(app: tauri::AppHandle, state: State<'_, DesktopState>) -> Result<(), String> {
    if let Some(job) = state.busy_job().await {
        show_main(&app, None);
        let _ = app.emit(
            "asg://quit-blocked",
            json!({ "jobId": job, "message": "写操作尚未完成，暂时不能退出 GUI。" }),
        );
        return Err("写操作尚未完成，暂时不能退出 GUI。".to_string());
    }
    state.quitting.store(true, Ordering::Relaxed);
    app.exit(0);
    Ok(())
}

fn handle_close<R: Runtime>(
    window: &WebviewWindow<R>,
    event: &tauri::WindowEvent,
    quitting: &std::sync::atomic::AtomicBool,
) {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        if quitting.load(Ordering::Relaxed) {
            return;
        }
        api.prevent_close();
        let _ = window.hide();
    }
}

pub fn run() {
    let state = DesktopState::new();
    let state_for_setup = state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_app_state,
            detect_default_asg_root,
            choose_asg_root,
            set_asg_root,
            clear_asg_root,
            set_theme,
            set_onboarding_completed,
            cli::run_cli,
            cli::cancel_cli,
            show_window,
            hide_window,
            quit_gui,
        ])
        .setup(move |app| {
            let settings = config::load_settings(app.handle());
            state_for_setup.hydrate(settings);

            let show = MenuItem::with_id(app, "show", "打开 ASG", true, None::<&str>)?;
            let logs = MenuItem::with_id(app, "logs", "查看日志", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出 GUI", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &logs, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(tray_image())
                .tooltip("Agent Search Gateway")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main(app, None),
                    "logs" => show_main(app, Some("logs")),
                    "quit" => {
                        let state = app.state::<DesktopState>().inner().clone();
                        let quitting = state.quitting.clone();
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            if state.is_busy().await {
                                show_main(&app, None);
                                let _ = app.emit(
                                    "asg://quit-blocked",
                                    json!({ "message": "写操作尚未完成，暂时不能退出 GUI。" }),
                                );
                            } else {
                                quitting.store(true, Ordering::Relaxed);
                                app.exit(0);
                            }
                        });
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if matches!(
                        event,
                        TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        }
                    ) {
                        show_main(tray.app_handle(), None);
                    } else if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle(), None);
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                configure_native_window(&window);
                let window_for_events = window.clone();
                let quitting_for_events = state_for_setup.quitting.clone();
                window.on_window_event(move |event| {
                    handle_close(&window_for_events, event, &quitting_for_events);
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ASG desktop");
}
