/* Quality is an explicit presentation choice, independent of screen width. */
(() => {
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
    badge.textContent = 'Safe Demo · simulated AI outcomes';
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
