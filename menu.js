(() => {
  const toggle = document.querySelector('.menu-toggle');
  const overlay = document.getElementById('menuOverlay');
  const root = document.documentElement;

  if (!toggle || !overlay) return;

  const setMenuState = (isOpen) => {
    overlay.classList.toggle('is-open', isOpen);
    root.classList.toggle('menu-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    overlay.setAttribute('aria-hidden', String(!isOpen));
  };

  const closeMenu = () => setMenuState(false);
  const openMenu = () => setMenuState(true);

  toggle.addEventListener('click', () => {
    const isOpen = overlay.classList.contains('is-open');
    setMenuState(!isOpen);
  });

  overlay.addEventListener('click', (event) => {
    const isBackgroundClick = event.target === overlay;
    const isNavLink = event.target.closest('.menu-link');
    if (isBackgroundClick || isNavLink) {
      closeMenu();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('pageshow', () => {
    closeMenu();
  });
})();
