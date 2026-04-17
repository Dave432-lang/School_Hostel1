/* theme.js — Dark Mode Management */

document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = localStorage.getItem('theme') || 'light';
  if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark-mode');
  }

  // Inject the toggle button into the navbar if it exists
  const navbarRight = document.querySelector('.navbar-right');
  if (navbarRight) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle';
    toggleBtn.title = 'Toggle Dark Mode';
    toggleBtn.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    
    // Insert it before the user badge or at the end
    navbarRight.insertBefore(toggleBtn, navbarRight.firstChild);

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
