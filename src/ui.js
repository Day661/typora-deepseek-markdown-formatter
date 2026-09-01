function removeElement(selector) {
  const element = document.querySelector(selector);
  if (element) element.remove();
}

export function ensureStyles() {
  if (document.getElementById("deepseek-md-formatter-style")) return;
  const style = document.createElement("style");
  style.id = "deepseek-md-formatter-style";
  style.textContent = `
    .deepseek-md-toast { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 999999; padding: 10px 16px; border-radius: 8px; color: #fff; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,.18); }
    .deepseek-md-toast.info { background: #2563eb; }
    .deepseek-md-toast.success { background: #15803d; }
    .deepseek-md-toast.error { background: #dc2626; }
    .deepseek-md-menu { position: fixed; z-index: 999998; min-width: 230px; padding: 6px 0; background: rgba(255,255,255,.98); border: 1px solid rgba(15,23,42,.12); border-radius: 10px; box-shadow: 0 16px 40px rgba(15,23,42,.18); font-size: 13px; }
    .deepseek-md-menu-item { padding: 9px 14px; cursor: pointer; color: #111827; }
    .deepseek-md-menu-item:hover { background: rgba(37,99,235,.08); }
    .deepseek-md-menu-item-desc { margin-top: 2px; color: #6b7280; font-size: 12px; }
    .deepseek-md-setting-grid { display: grid; gap: 12px; margin-top: 12px; max-width: 680px; }
    .deepseek-md-setting-grid label { display: block; margin-bottom: 5px; font-size: 13px; color: #374151; }
    .deepseek-md-setting-grid input { width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid #d1d5db; border-radius: 8px; }
    .deepseek-md-setting-note { color: #6b7280; font-size: 12px; line-height: 1.6; }
    .deepseek-md-button { border: 0; border-radius: 8px; padding: 8px 16px; color: #fff; background: #2563eb; cursor: pointer; }
  `;
  document.head.appendChild(style);
}

export function removeStyles() {
  removeElement("#deepseek-md-formatter-style");
}

export function showToast(message, type = "info", duration = 2600) {
  removeElement("#deepseek-md-formatter-toast");
  const toast = document.createElement("div");
  toast.id = "deepseek-md-formatter-toast";
  toast.className = `deepseek-md-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  if (duration > 0) window.setTimeout(() => toast.remove(), duration);
}

export function hideToast() {
  removeElement("#deepseek-md-formatter-toast");
}

let activeMenu = null;

function onOutsideMenuClick(event) {
  if (activeMenu && !activeMenu.contains(event.target)) closeContextMenu();
}

export function closeContextMenu() {
  removeElement("#deepseek-md-formatter-menu");
  activeMenu = null;
  document.removeEventListener("mousedown", onOutsideMenuClick, true);
}

export function openContextMenu({ x, y, items, onSelect }) {
  closeContextMenu();
  const menu = document.createElement("div");
  menu.id = "deepseek-md-formatter-menu";
  menu.className = "deepseek-md-menu";

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "deepseek-md-menu-item";
    row.textContent = item.label;
    if (item.description) {
      const description = document.createElement("div");
      description.className = "deepseek-md-menu-item-desc";
      description.textContent = item.description;
      row.appendChild(description);
    }
    row.addEventListener("click", () => {
      closeContextMenu();
      onSelect(item.value);
    });
    menu.appendChild(row);
  }

  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
  activeMenu = menu;
  window.setTimeout(() => document.addEventListener("mousedown", onOutsideMenuClick, true), 0);
}
