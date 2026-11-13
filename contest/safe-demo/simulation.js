/* Simulation only: no IRIS request, inference, or patient-specific inputs. */
(() => {
  const install = () => {
    const anchor = document.querySelector('#exploreStudy');
    const selection = document.querySelector('#selectStructure');
    const back = document.querySelector('#returnReference');
    // The reference controls can live in a closed sheet while a study is active.
    if (!anchor || !selection || !back || back.hidden) return;
    if (document.querySelector('#simExplain')) return;
    const explain = document.createElement('button');
    const mismatch = document.createElement('button');
    const reset = document.createElement('button');
    explain.id = 'simExplain'; mismatch.id = 'simMismatch'; reset.id = 'simReset';
    explain.textContent = 'Simulate evidence-linked finding';
    mismatch.textContent = 'Simulate CT/SEG mismatch';
    reset.textContent = 'Reset simulation';
    const panel = document.createElement('section');
    panel.id = 'simOutcome'; panel.setAttribute('aria-live', 'polite');
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Simulated result');
    let opener = null;
    const set = (...lines) => {
      panel.replaceChildren();
      const close = document.createElement('button');
      close.type = 'button'; close.textContent = 'Close result';
      close.onclick = () => { panel.hidden = true; document.dispatchEvent(new Event('dicom3d-overlay-change')); opener?.focus(); };
      panel.append(close);
      for (const line of lines) { const p = document.createElement('p'); p.textContent = line; panel.append(p); }
      const tools = document.querySelector('#imagingToolsPanel');
      if (tools && !tools.hidden) document.querySelector('#imagingToolsToggle')?.click();
      panel.hidden = false;
      document.dispatchEvent(new Event('dicom3d-overlay-change'));
      if (opener && document.activeElement === opener) close.focus();
    };
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); panel.querySelector('button')?.click(); }
    });
    const initial = () => { panel.hidden = true; panel.replaceChildren(); document.dispatchEvent(new Event('dicom3d-overlay-change')); };
    explain.onclick = () => {
      opener = explain;
      if (selection.disabled) { set('SIMULATION: load the public research study before selecting the lesion.'); return; }
      if (selection.getAttribute('aria-pressed') !== 'true') selection.click();
      set('SIMULATED ACCEPTED FINDING', 'Structure: lesion.lung.mass.001',
        'Example evidence: Observation/r5p-h000-mask-volume; ImagingSelection/r5p-h000-segment-1.',
        'The recorded segmentation measurement is a research-derived value; it does not establish diagnosis or anatomical accuracy.');
    };
    mismatch.onclick = () => {
      opener = mismatch;
      set('SIMULATED REVIEW REQUESTED',
        'Synthetic CT and SEG identities do not match. A reviewer would inspect the source evidence.',
        'This example does not change the study or select a structure.');
    };
    reset.onclick = () => { if (selection.getAttribute('aria-pressed') === 'true') selection.click(); initial(); };
    const actions = document.querySelector('#simActions');
    if (!actions) return;
    actions.append(explain, mismatch, reset);
    document.querySelector('.workspace').append(panel);
    let restorePanel = false;
    document.addEventListener('dicom3d-workspace-change', event => {
      const inStudy = event.detail?.kind === 'study';
      explain.hidden = mismatch.hidden = reset.hidden = !inStudy;
      if (!inStudy) { restorePanel = !panel.hidden; panel.hidden = true; }
      else panel.hidden = !restorePanel;
      document.dispatchEvent(new Event('dicom3d-overlay-change'));
    });
    initial(); observer.disconnect();
  };
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  install();
})();
