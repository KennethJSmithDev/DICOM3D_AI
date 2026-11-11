/* Adapt the existing controls; no separate viewer or selection state. */
(() => {
  function install() {
    const rail = document.querySelector('.public-rail');
    const workspace = document.querySelector('.workspace');
    const importer = document.querySelector('#verifiedVolumeImport');
    const viewer = document.querySelector('#workspaceButton');
    const imaging = document.querySelector('#imagingToggle');
    if (!rail || !workspace || !importer || !viewer || !imaging) return;
    if (document.querySelector('#localStudyToggle')) return;

    const oldOpen = document.querySelector('#openVerifiedStudy');
    if (oldOpen) oldOpen.hidden = true;
    const link = [...document.querySelectorAll('header a')].find(a => a.textContent.includes('Published v0.6.0'));
    if (link) {
      link.textContent = 'AI Hub contest source';
      link.href = 'https://github.com/KennethJSmithDev/DICOM3D_AI';
      const gallery = document.createElement('a');
      gallery.href = './gallery/'; gallery.textContent = 'Media gallery';
      link.after(gallery);
    }
    const identity = document.querySelector('.release-identity');
    if (identity) identity.textContent = 'AI HUB · CONTEST EDITION';

    // Move existing controls, rather than creating another viewer or state.
    const library = document.querySelector('.reference-library');
    const heading = document.querySelector('.viewport-heading');
    const evidence = document.querySelector('#evidencePanel .evidence-grid > div:nth-child(2)');
    const notice = document.querySelector('#studyAdmissionNotice');
    const footerText = library?.querySelector('span.reference-scope-note');
    const viewport = document.querySelector('main.viewport');
    if (!library || !heading || !evidence || !notice || !footerText || !viewport) return;
    evidence.append(notice);
    const mediaLink = document.createElement('a');
    mediaLink.href = './gallery/'; mediaLink.textContent = 'Media gallery';
    evidence.append(document.createElement('br'), mediaLink);
    const expandedNotice = document.createElement('a');
    expandedNotice.href = './reference/EXPANDED-BODYPARTS3D-NOTICE.md';
    expandedNotice.textContent = 'Expanded BodyParts3D attribution and changes';
    evidence.append(document.createElement('br'), expandedNotice);
    viewport.append(footerText);
    footerText.classList.add('reference-footer-banner');
    const referencePanel = document.createElement('section');
    referencePanel.id = 'referenceWorkspacePanel';
    referencePanel.hidden = true;
    referencePanel.setAttribute('aria-label', 'Reference workspace and study');
    const referenceClose = document.createElement('button');
    referenceClose.type = 'button'; referenceClose.textContent = 'Close imaging';
    const showAcquired = document.createElement('button');
    showAcquired.type = 'button'; showAcquired.id = 'showAcquiredCT';
    showAcquired.textContent = 'Show acquired CT'; showAcquired.hidden = true;
    referencePanel.append(heading, library, showAcquired, referenceClose);
    workspace.append(referencePanel);
    referenceClose.onclick = () => { referencePanel.hidden = true; imaging.setAttribute('aria-expanded','false'); imaging.focus(); };
    showAcquired.onclick = () => {
      const dock = document.querySelector('#imagingDock');
      if (dock?.hidden && typeof imaging.onclick === 'function') imaging.onclick();
      referencePanel.hidden = true; imaging.setAttribute('aria-expanded','false');
    };
    document.querySelector('#exploreStudy')?.addEventListener('click', () => {
      referencePanel.hidden = true;
      imaging.setAttribute('aria-expanded','false');
    });
    imaging.setAttribute('aria-controls','referenceWorkspacePanel');
    imaging.addEventListener('click', event => {
      event.stopImmediatePropagation();
      referencePanel.hidden = !referencePanel.hidden;
      imaging.setAttribute('aria-expanded',String(!referencePanel.hidden));
    }, true);

    const tools = document.querySelector('.source-tools');
    const area = document.querySelector('#publicWorkArea');
    const stage = document.querySelector('#publicStage');
    const actions = document.createElement('div');
    actions.id = 'simActions'; actions.hidden = true;
    const toolButton = document.createElement('button');
    toolButton.id = 'imagingToolsToggle'; toolButton.type = 'button';
    toolButton.textContent = 'Imaging Tools'; toolButton.setAttribute('aria-expanded','false');
    const toolPanel = document.createElement('section');
    toolPanel.id = 'imagingToolsPanel'; toolPanel.hidden = true;
    toolPanel.setAttribute('aria-label','Imaging tools and linked inspection');
    const toolClose = document.createElement('button');
    toolClose.type = 'button'; toolClose.textContent = 'Close imaging tools';
    if (tools && area && stage) {
      tools.open = true;
      toolPanel.append(toolClose, tools); workspace.append(toolPanel);
      const viewingArea = document.querySelector('#viewingArea');
      const compactSwitch = document.createElement('div');
      compactSwitch.id = 'compactViewSwitch';
      compactSwitch.setAttribute('role', 'group');
      compactSwitch.setAttribute('aria-label', 'Compact study view');
      const ctButton = document.createElement('button'); ctButton.type = 'button'; ctButton.textContent = 'CT';
      const viewButton = document.createElement('button'); viewButton.type = 'button'; viewButton.textContent = '3D';
      const chooseView = mode => {
        viewingArea.dataset.compactView = mode;
        ctButton.setAttribute('aria-pressed', String(mode === 'ct'));
        viewButton.setAttribute('aria-pressed', String(mode === '3d'));
      };
      ctButton.onclick = () => chooseView('ct'); viewButton.onclick = () => chooseView('3d');
      compactSwitch.append(ctButton, viewButton); chooseView('ct');
      actions.append(compactSwitch, toolButton); stage.insertBefore(actions,area);
      const showTools = show => { toolPanel.hidden = !show; toolButton.setAttribute('aria-expanded',String(show)); };
      toolButton.onclick = () => {
        const result = document.querySelector('#simOutcome');
        if (result && !result.hidden) { result.hidden = true; document.dispatchEvent(new Event('dicom3d-overlay-change')); }
        showTools(toolPanel.hidden);
      };
      toolClose.onclick = () => { showTools(false); toolButton.focus(); };
      document.addEventListener('dicom3d-workspace-change', event => {
        const study = event.detail?.kind === 'study';
        actions.hidden = !study; footerText.hidden = study; showAcquired.hidden = !study;
        if (!study) showTools(false);
      });
    }

    // Anatomy uses the free left panel location; another open panel owns it first.
    const anatomy = document.querySelector('#workspaceControls');
    const leftPanels = [referencePanel,toolPanel,document.querySelector('#labPanel'),document.querySelector('#learningPanel'),document.querySelector('#evidencePanel')];
    const arrange = () => anatomy?.classList.toggle('anatomy-right', leftPanels.some(panel => panel && !panel.hidden) || !importer.hidden || (document.querySelector('#simOutcome') && !document.querySelector('#simOutcome').hidden));
    document.addEventListener('dicom3d-overlay-change',arrange);
    const layoutObserver = new MutationObserver(arrange);
    for (const panel of [...leftPanels,importer]) if (panel) layoutObserver.observe(panel,{attributes:true,attributeFilter:['hidden']});
    arrange();

    importer.hidden = true;
    importer.open = false;
    importer.classList.add('local-study-sheet');
    workspace.append(importer);
    const open = document.createElement('button');
    open.id = 'localStudyToggle';
    open.type = 'button';
    open.setAttribute('aria-controls', 'verifiedVolumeImport');
    open.setAttribute('aria-expanded', 'false');
    open.innerHTML = '<b aria-hidden="true">▣</b><span>Open Study</span>';
    rail.append(open);
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close Open Study';
    close.addEventListener('click', () => {
      importer.hidden = true; importer.open = false;
      open.setAttribute('aria-expanded', 'false'); open.focus();
    });
    importer.append(close);
    open.addEventListener('click', () => {
      const show = importer.hidden;
      importer.hidden = !show; importer.open = show;
      open.setAttribute('aria-expanded', String(show));
    });
    // Preserve the existing handlers and source-owned state; request the
    // established reference transition only when the study is active.
    let pendingReference = false;
    const back = document.querySelector('#returnReference');
    const followPendingReference = () => {
      if (pendingReference && back && !back.hidden && !back.disabled) {
        pendingReference = false;
        back.click();
      }
    };
    if (back) new MutationObserver(followPendingReference).observe(back, {attributes:true, attributeFilter:['disabled','hidden']});
    viewer.addEventListener('click', () => {
      if (back && !back.hidden) {
        pendingReference = true;
        followPendingReference();
      }
    }, true);
    observer.disconnect();
  }
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  install();
})();
