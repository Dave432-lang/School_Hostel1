/* theme.js — Dark Mode Management */

document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = localStorage.getItem('theme') || 'light';
  if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark-mode');
  }

  // Inject the toggle button natively into the exact right spot
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'theme-toggle';
  toggleBtn.title = 'Toggle Dark Mode';
  toggleBtn.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
  
  const navBell = document.querySelector('.nav-bell-wrapper');
  const userBadge = document.querySelector('.user-badge');
  const navbarRight = document.querySelector('.navbar-right');

  let inserted = false;
  if (navBell && navBell.parentNode) {
    // Wrap to ensure vertical center if parent lacks flex, but nav-bell-wrapper's parents are usually flex
    navBell.parentNode.insertBefore(toggleBtn, navBell);
    inserted = true;
  } else if (userBadge && userBadge.parentNode) {
    userBadge.parentNode.insertBefore(toggleBtn, userBadge);
    inserted = true;
  } else if (navbarRight) {
    navbarRight.insertBefore(toggleBtn, navbarRight.firstChild);
    inserted = true;
  }

  if (inserted) {
    toggleBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark-mode');
      const isDark = document.documentElement.classList.contains('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      toggleBtn.innerHTML = isDark ? '☀️' : '🌙';
      
      // Update charts if they exist on the page
      if (typeof Chart !== 'undefined') {
        Chart.helpers.each(Chart.instances, function(instance){
          // Basic chart update for text colors
          const color = isDark ? '#f8fafc' : '#64748b';
          if(instance.options.scales && instance.options.scales.y) {
            if(instance.options.scales.y.ticks) instance.options.scales.y.ticks.color = color;
            if(instance.options.scales.x.ticks) instance.options.scales.x.ticks.color = color;
          }
          if(instance.options.plugins && instance.options.plugins.legend) {
            if(instance.options.plugins.legend.labels) instance.options.plugins.legend.labels.color = color;
          }
          instance.update();
        });
      }
    });
  }
});
