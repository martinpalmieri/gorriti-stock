type PageId = 'dashboard' | 'inventory' | 'new-sale' | 'sales' | 'settings';

type NavigationItem = {
  id: PageId;
  label: string;
  helper: string;
  icon: string;
};

type PlaceholderContent = {
  icon: string;
  title: string;
  description: string;
  action: string;
};

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Inicio', helper: 'Resumen del día', icon: '⌂' },
  { id: 'inventory', label: 'Inventario', helper: 'Productos y stock', icon: '▣' },
  { id: 'new-sale', label: 'Nueva venta', helper: 'Registrar operación', icon: '+' },
  { id: 'sales', label: 'Ventas', helper: 'Historial y métricas', icon: '$' },
  { id: 'settings', label: 'Configuración', helper: 'Preferencias', icon: '⚙' },
];

const summaryCards = [
  { label: 'Ventas de hoy', value: '$ 128.450', trend: '+12% vs. ayer' },
  { label: 'Productos activos', value: '248', trend: '18 con bajo stock' },
  { label: 'Tickets abiertos', value: '36', trend: 'Promedio $ 3.568' },
];

const lowStockProducts = [
  { sku: 'GR-CAF-001', name: 'Café molido Gorriti 500g', stock: 7, reorder: 20 },
  { sku: 'GR-MAT-018', name: 'Mate cerámica negro', stock: 4, reorder: 12 },
  { sku: 'GR-DUL-044', name: 'Dulce de leche familiar', stock: 9, reorder: 24 },
];

const recentSales = [
  { id: 'VTA-1042', customer: 'Mostrador', total: '$ 8.900', status: 'Cobrada' },
  { id: 'VTA-1041', customer: 'Lucía Romero', total: '$ 14.250', status: 'Pendiente' },
  { id: 'VTA-1040', customer: 'Mostrador', total: '$ 3.400', status: 'Cobrada' },
];

const placeholders: Record<Exclude<PageId, 'dashboard'>, PlaceholderContent> = {
  inventory: {
    icon: '▣',
    title: 'Inventario',
    description: 'Próximamente vas a poder gestionar productos, variantes, costos, precios y alertas de reposición.',
    action: 'Preparar carga inicial',
  },
  'new-sale': {
    icon: '✓',
    title: 'Nueva venta',
    description: 'Este espacio quedará listo para buscar productos, armar el carrito, aplicar descuentos y registrar pagos.',
    action: 'Configurar flujo de venta',
  },
  sales: {
    icon: '↗',
    title: 'Ventas',
    description: 'Acá se mostrará el historial de tickets, filtros por fecha, estados de cobro y reportes exportables.',
    action: 'Definir reportes',
  },
  settings: {
    icon: '⚙',
    title: 'Configuración',
    description: 'Se reservará para datos del local, usuarios, permisos, impuestos y preferencias de sincronización.',
    action: 'Revisar preferencias',
  },
};

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('No se encontró el contenedor principal de la aplicación.');
}

const appContainer = appRoot;

let activePage: PageId = 'dashboard';

function render() {
  const activeNavigationItem = navigationItems.find((item) => item.id === activePage) ?? navigationItems[0];

  appContainer.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Navegación principal">
        <div class="brand-block">
          <div class="brand-mark" aria-hidden="true">GS</div>
          <div>
            <p class="eyebrow">Gorriti</p>
            <h1>Stock</h1>
          </div>
        </div>
        <nav class="nav-list">
          ${navigationItems.map((item) => renderNavigationItem(item)).join('')}
        </nav>
      </aside>
      <main class="main-panel">
        <header class="topbar">
          <div>
            <p class="eyebrow">Panel operativo</p>
            <h2>${activeNavigationItem.label}</h2>
          </div>
          ${renderStatusPill()}
        </header>
        ${activePage === 'dashboard' ? renderDashboard() : renderPlaceholder(placeholders[activePage])}
      </main>
    </div>
  `;

  document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      activePage = button.dataset.page as PageId;
      render();
    });
  });
}

function renderNavigationItem(item: NavigationItem) {
  const isActive = item.id === activePage;

  return `
    <button
      class="nav-item ${isActive ? 'nav-item--active' : ''}"
      type="button"
      data-page="${item.id}"
      ${isActive ? 'aria-current="page"' : ''}
    >
      <span class="nav-icon" aria-hidden="true">${item.icon}</span>
      <span>
        <strong>${item.label}</strong>
        <small>${item.helper}</small>
      </span>
    </button>
  `;
}

function renderStatusPill() {
  const isOnline = navigator.onLine;
  const label = isOnline ? 'En línea' : 'Sin conexión';

  return `
    <div class="status-pill ${isOnline ? 'status-pill--online' : 'status-pill--offline'}" role="status">
      <span aria-hidden="true">${isOnline ? '●' : '○'}</span>
      <span>${label}</span>
    </div>
  `;
}

function renderDashboard() {
  return `
    <section class="page-stack" aria-labelledby="dashboard-title">
      <div class="hero-card">
        <div>
          <p class="eyebrow">Resumen mockeado</p>
          <h3 id="dashboard-title">Bienvenido al tablero de Gorriti Stock</h3>
          <p>Vista inicial con datos de ejemplo para validar navegación, jerarquía visual y estados antes de conectar Supabase.</p>
        </div>
        <button class="primary-action" type="button">Nueva venta rápida</button>
      </div>
      <div class="summary-grid" aria-label="Indicadores principales">
        ${summaryCards.map((card) => `
          <article class="metric-card">
            <span>${card.label}</span>
            <strong>${card.value}</strong>
            <small>${card.trend}</small>
          </article>
        `).join('')}
      </div>
      <div class="content-grid">
        <section class="panel-card" aria-labelledby="low-stock-title">
          <div class="panel-heading">
            <h3 id="low-stock-title">Stock bajo</h3>
            <span>Mock</span>
          </div>
          <div class="table-list">
            ${lowStockProducts.map((product) => `
              <div class="table-row">
                <div>
                  <strong>${product.name}</strong>
                  <small>${product.sku}</small>
                </div>
                <span>${product.stock} / ${product.reorder}</span>
              </div>
            `).join('')}
          </div>
        </section>
        <section class="panel-card" aria-labelledby="recent-sales-title">
          <div class="panel-heading">
            <h3 id="recent-sales-title">Ventas recientes</h3>
            <span>Mock</span>
          </div>
          <div class="table-list">
            ${recentSales.map((sale) => `
              <div class="table-row">
                <div>
                  <strong>${sale.id}</strong>
                  <small>${sale.customer}</small>
                </div>
                <span>${sale.total} · ${sale.status}</span>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderPlaceholder(content: PlaceholderContent) {
  return `
    <section class="placeholder-card" aria-labelledby="${content.title}-title">
      <div class="placeholder-icon" aria-hidden="true">${content.icon}</div>
      <p class="eyebrow">Módulo en preparación</p>
      <h3 id="${content.title}-title">${content.title}</h3>
      <p>${content.description}</p>
      <button class="secondary-action" type="button">${content.action}</button>
    </section>
  `;
}

window.addEventListener('online', render);
window.addEventListener('offline', render);

render();
