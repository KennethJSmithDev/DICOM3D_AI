/* Quality is an explicit presentation choice, independent of screen width. */
(() => {

  // The renderer is WebGPU-only. This separate notice still works if startup fails.
  function showWebGPUUnavailable() {
    if (document.querySelector('#webgpuUnavailable')) return;
    const notice = document.createElement('section');
    notice.id = 'webgpuUnavailable'; notice.className = 'webgpu-unavailable';
    notice.setAttribute('role', 'alert');
    const title = document.createElement('strong'); title.textContent = 'WebGPU is unavailable';
    const message = document.createElement('p');
    message.textContent = 'This Safe Demo requires WebGPU and could not obtain a compatible adapter. Try a current WebGPU-capable browser with hardware acceleration enabled. This demo does not provide a WebGL fallback.';
    const detail = document.createElement('p');
    detail.textContent = 'The native AI Hub workflow is installed and run separately; this browser-only demo simulates AI outcomes.';
    const source = document.createElement('a');
    source.href = 'https://github.com/KennethJSmithDev/DICOM3D_AI';
    source.textContent = 'View installation and source';
    notice.append(title, message, detail, source); document.body.prepend(notice);
  }
  function checkWebGPU() {
    if (!navigator.gpu || typeof navigator.gpu.requestAdapter !== 'function') { showWebGPUUnavailable(); return; }
    Promise.resolve().then(() => navigator.gpu.requestAdapter()).then(
      adapter => { if (!adapter) showWebGPUUnavailable(); }, () => showWebGPUUnavailable());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkWebGPU, {once:true});
  else checkWebGPU();
  const key = 'dicom3d-aihub-demo-quality';
  let stored = null;
  try { stored = localStorage.getItem(key); } catch {}
  if (!['efficient', 'full'].includes(stored)) stored = 'efficient';
  globalThis.__dicom3dEfficient = stored === 'efficient';
  function install() {
    const header = document.querySelector('.app-header');
    const lab = document.querySelector('#labPanel .lab-controls');
    if (!header || !lab || document.querySelector('#demoQuality')) return;
    const badge = document.createElement('span');
    badge.className = 'simulation-banner';
    badge.textContent = 'Safe Demo · simulated AI · WebGPU required';
    header.append(badge);
    const bar = document.createElement('section');
    bar.id = 'demoQuality'; bar.className = 'demo-profile';
    bar.setAttribute('aria-label', 'Rendering quality');
    const label = document.createElement('strong'); label.textContent = 'Rendering quality';
    const efficient = document.createElement('button');
    const full = document.createElement('button');
    efficient.type = full.type = 'button';
    efficient.textContent = 'Efficient'; full.textContent = 'Full quality';
    const refresh = () => {
      efficient.setAttribute('aria-pressed', String(stored === 'efficient'));
      full.setAttribute('aria-pressed', String(stored === 'full'));
    };
    const choose = choice => {
      stored = choice; globalThis.__dicom3dEfficient = choice === 'efficient';
      try { localStorage.setItem(key, choice); } catch {}
      refresh();
    };
    efficient.onclick = () => choose('efficient'); full.onclick = () => choose('full');
    bar.append(label, efficient, full); lab.append(bar); refresh();
    observer.disconnect();
  }
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, {childList:true,subtree:true});
  install();
})();
