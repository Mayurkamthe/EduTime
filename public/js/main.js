// Toggle sidebar on mobile
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('mainContent');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
    });
  }

  // Auto-dismiss alerts
  setTimeout(() => {
    document.querySelectorAll('.alert').forEach(a => {
      const bsAlert = new bootstrap.Alert(a);
      bsAlert.close();
    });
  }, 4000);

  // Delete confirmations
  document.querySelectorAll('.confirm-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!confirm('Are you sure? This action cannot be undone.')) e.preventDefault();
    });
  });
});
