/**
 * Preload — تنها پل بین صفحه و سیستم‌عامل.
 * contextIsolation روشن است، پس صفحه فقط به همین توابع دسترسی دارد.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('hq', {
  isDesktop: true,

  // ذخیره‌سازی روی دیسک
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),

  // نقاط بازیابی
  snapPush: (data) => ipcRenderer.invoke('snap:push', data),
  snapList: () => ipcRenderer.invoke('snap:list'),
  snapGet: (id) => ipcRenderer.invoke('snap:get', id),

  // بکاپ / بازیابی با دیالوگ بومی ویندوز
  exportBackup: (data) => ipcRenderer.invoke('backup:export', data),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  saveText: (name, text, filters) => ipcRenderer.invoke('file:saveText', { name, text, filters }),

  // اطلاعات و ابزار
  info: () => ipcRenderer.invoke('app:info'),
  openDataDir: () => ipcRenderer.invoke('app:openDataDir'),
  confirm: (opts) => ipcRenderer.invoke('app:confirm', opts),

  // جریان خروج: صفحه پس از تصمیم کاربر یکی از این دو را صدا می‌زند
  exitNow: () => ipcRenderer.invoke('app:exitNow'),
  cancelExit: () => ipcRenderer.invoke('app:cancelExit'),

  // رویدادهای منو → رابط کاربری
  onMenu: (handler) => {
    const map = {
      'menu:export': 'export',
      'menu:import': 'import',
      'menu:palette': 'palette',
      'menu:navigate': 'navigate',
      'menu:exit': 'exit',
    }
    const subs = Object.entries(map).map(([ch, name]) => {
      const fn = (_e, payload) => handler(name, payload)
      ipcRenderer.on(ch, fn)
      return () => ipcRenderer.removeListener(ch, fn)
    })
    return () => subs.forEach(un => un())
  },
})
