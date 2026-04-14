document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const isMobile = () => window.innerWidth <= 767;

  // Create overlay element
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      if (isMobile()) {
        sidebar.classList.contains('mobile-open') ? closeMobileSidebar() : openMobileSidebar();
      } else {
        document.body.classList.toggle('sidebar-collapsed');
      }
    });
  }

  // Close sidebar when overlay clicked
  overlay.addEventListener('click', closeMobileSidebar);

  // Close sidebar on mobile nav link click
  if (isMobile()) {
    sidebar.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', closeMobileSidebar);
    });
  }

  // Handle resize
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      closeMobileSidebar();
    }
  });

  // Auto-dismiss alerts after 4s
  setTimeout(() => {
    document.querySelectorAll('.alert').forEach(a => {
      try { new bootstrap.Alert(a).close(); } catch(e) {}
    });
  }, 4000);

  // Delete confirmations
  document.querySelectorAll('.confirm-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!confirm('Are you sure? This action cannot be undone.')) e.preventDefault();
    });
  });
});
